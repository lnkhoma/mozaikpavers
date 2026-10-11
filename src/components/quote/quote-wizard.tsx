"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { WhatsAppLink } from "@/components/analytics/contact-links";
import { Icon } from "@/components/ui/icons";
import { PAVER_STYLES, PROJECT_TYPES } from "@/config/company";
import { track, trackOnce } from "@/lib/analytics-client";
import { formatDate, formatKwacha, formatNumber } from "@/lib/format";
import { calculateQuotation, DEFAULT_OPTIONS, MAX_AREA_SQM, MIN_AREA_SQM } from "@/lib/pricing/engine";
import type { PricingConfig, QuotationOptions, QuotationResult } from "@/lib/pricing/types";
import { fieldErrors as toFieldErrors, quotationRequestSchema, type QuotationRequestInput } from "@/lib/validation/schemas";
import { CostBreakdown } from "./cost-breakdown";

type Step = 1 | 2 | 3;

interface Outcome {
  quoteNumber: string;
  accessToken: string;
  customerName: string;
  customerEmail: string;
  squareMetres: number;
  grandTotal: number;
  validUntil: string;
  result: QuotationResult;
  delivery: { status: "sent" | "failed"; canRetry?: boolean };
}

const OPTIONAL = [
  { key: "includeLandscaping", label: "Landscaping", hint: "Planting and finishing around the paving", priced: true },
  { key: "sitePreparation", label: "Site preparation", hint: "Clearing and levelling", priced: false },
  { key: "removalOfExistingPaving", label: "Removal of existing paving", hint: "Lifting and disposal of old surfaces", priced: false },
  { key: "drainage", label: "Drainage work", hint: "Channels, falls and soak-aways", priced: false },
] as const;

export function QuoteWizard({ pricing, initialArea }: { pricing: PricingConfig; initialArea?: string }) {
  const [step, setStep] = useState<Step>(1);
  const [area, setArea] = useState(initialArea ?? "");
  const [options, setOptions] = useState<QuotationOptions>({ ...DEFAULT_OPTIONS });
  const [showOther, setShowOther] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    whatsappSameAsPhone: true,
    location: "",
    projectType: "",
    paverStyle: "",
    expectedStartDate: "",
    notes: "",
    website: "", // honeypot
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retrying, setRetrying] = useState(false);

  // One key per quotation attempt: retries and double-clicks can never create duplicates.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const startedAt = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    trackOnce("calc-open", "calculator_opened", { source: "quote_page" });
  }, []);

  const areaNumber = Number(area);
  const areaValid = area.trim() !== "" && Number.isFinite(areaNumber) && areaNumber >= MIN_AREA_SQM && areaNumber <= MAX_AREA_SQM;
  const estimate = useMemo(
    () => (areaValid ? calculateQuotation(areaNumber, pricing, options) : null),
    [areaValid, areaNumber, pricing, options],
  );

  useEffect(() => {
    if (!areaValid) return;
    const t = window.setTimeout(() => trackOnce("calc-sqm", "sqm_entered", { sqm: areaNumber, source: "quote_page" }), 900);
    return () => window.clearTimeout(t);
  }, [areaValid, areaNumber]);

  const goTo = (s: Step) => {
    setStep(s);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[`customer.${key}`];
      delete next[`project.${key}`];
      return next;
    });
  };

  const payload = (): QuotationRequestInput => ({
    idempotencyKey,
    squareMetres: areaNumber,
    options: { ...options, otherRequirements: showOther ? options.otherRequirements : "" },
    customer: {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      whatsapp: form.whatsappSameAsPhone ? form.phone : form.whatsapp,
    },
    project: {
      location: form.location,
      projectType: form.projectType,
      paverStyle: form.paverStyle,
      expectedStartDate: form.expectedStartDate,
      notes: form.notes,
    },
    bot: { website: form.website, elapsedMs: Date.now() - startedAt.current },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const body = payload();
    const check = quotationRequestSchema.safeParse(body);
    if (!check.success) {
      const errs = toFieldErrors(check.error);
      setErrors(errs);
      const first = Object.keys(errs)[0]?.split(".").pop();
      if (first) document.getElementById(`q-${first}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setFormError(data.error ?? "We couldn't generate your quotation. Please try again.");
        return;
      }
      const result = data as Outcome;
      setOutcome(result);
      track("quotation_completed", { sqm: result.squareMetres, total: result.grandTotal });
      if (result.delivery.status === "sent") track("quotation_emailed");
      goTo(3);
    } catch {
      setFormError("We couldn't reach our server. Check your connection and try again — you won't receive duplicate quotations.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryEmail() {
    if (!outcome || retrying) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/quotations/${outcome.quoteNumber}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: outcome.accessToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.delivery) {
        setOutcome({ ...outcome, delivery: data.delivery });
        if (data.delivery.status === "sent") track("quotation_emailed", { retry: true });
      } else {
        setOutcome({ ...outcome, delivery: { status: "failed", canRetry: res.status !== 404 && res.status !== 429 } });
      }
    } catch {
      setOutcome({ ...outcome, delivery: { status: "failed", canRetry: true } });
    } finally {
      setRetrying(false);
    }
  }

  const err = (path: string) => errors[path];

  return (
    <div ref={topRef} className="scroll-mt-24">
      <Stepper step={step} />

      {/* --------------------------- Step 1: area --------------------------- */}
      {step === 1 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <div className="space-y-8">
            <div className="card p-6 sm:p-8">
              <label htmlFor="q-area" className="font-display text-2xl font-extrabold">
                How big is the area to be paved?
              </label>
              <p className="mt-1 text-ink-600">Enter the size in square metres (SQM). Everything else is calculated for you.</p>
              <div className="relative mt-5">
                <input
                  id="q-area"
                  type="number"
                  inputMode="decimal"
                  min={MIN_AREA_SQM}
                  max={MAX_AREA_SQM}
                  step="any"
                  autoFocus
                  placeholder="e.g. 150"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  aria-invalid={area !== "" && !areaValid}
                  aria-describedby="q-area-help"
                  className="field h-20 pr-24 font-display text-4xl font-extrabold tabular-nums"
                />
                <span className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-lg font-bold text-ink-500">SQM</span>
              </div>
              <p id="q-area-help" className={area !== "" && !areaValid ? "field-error" : "field-hint"}>
                {area !== "" && !areaValid
                  ? `Enter an area between ${MIN_AREA_SQM} and ${MAX_AREA_SQM.toLocaleString("en-US")} SQM.`
                  : "Tip: measure length × width in metres. For L-shapes, add the rectangles together."}
              </p>
              <AreaHelper onUse={(v) => setArea(String(v))} />
            </div>

            <fieldset className="card p-6 sm:p-8">
              <legend className="sr-only">Optional services</legend>
              <h2 className="text-lg font-bold">Include these services?</h2>
              <div className="mt-4 space-y-3">
                {OPTIONAL.map((o) => {
                  const checked = options[o.key];
                  return (
                    <label key={o.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${checked ? "border-clay-500 bg-clay-50" : "border-ink-200 hover:border-ink-300"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setOptions((s) => ({ ...s, [o.key]: e.target.checked }))}
                        className="mt-1 size-5 accent-clay-500"
                      />
                      <span className="flex-1">
                        <span className="block font-semibold">{o.label}</span>
                        <span className="block text-sm text-ink-500">{o.hint}</span>
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${o.priced ? "bg-moss-500/10 text-moss-600" : "bg-sand-200 text-ink-600"}`}>
                        {o.priced ? `${formatKwacha(pricing.landscapingPricePerSqm)}/m²` : "Site assessment"}
                      </span>
                    </label>
                  );
                })}
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${showOther ? "border-clay-500 bg-clay-50" : "border-ink-200 hover:border-ink-300"}`}>
                  <input type="checkbox" checked={showOther} onChange={(e) => setShowOther(e.target.checked)} className="mt-1 size-5 accent-clay-500" />
                  <span className="flex-1">
                    <span className="block font-semibold">Other requirements</span>
                    <span className="block text-sm text-ink-500">Steps, kerbs, ramps, special patterns…</span>
                  </span>
                </label>
                {showOther && (
                  <textarea
                    aria-label="Describe other requirements"
                    rows={3}
                    maxLength={500}
                    className="field"
                    placeholder="Describe what else you need"
                    value={options.otherRequirements ?? ""}
                    onChange={(e) => setOptions((s) => ({ ...s, otherRequirements: e.target.value }))}
                  />
                )}
              </div>
              <p className="mt-4 text-sm text-ink-500">Services marked “Site assessment” are listed on your quotation and priced after we visit.</p>
            </fieldset>
          </div>

          <div className="lg:sticky lg:top-28">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between bg-ink-900 px-6 py-4 text-white">
                <h2 className="font-bold">Live estimate</h2>
                <span className="text-sm text-ink-300">{areaValid ? `${formatNumber(areaNumber)} SQM` : "Enter an area"}</span>
              </div>
              <div className="p-6" aria-live="polite">
                {estimate ? (
                  <CostBreakdown result={estimate} />
                ) : (
                  <div className="py-10 text-center text-ink-500">
                    <Icon name="calculator" className="mx-auto size-10 text-ink-300" />
                    <p className="mt-3">Your itemised estimate appears here as you type.</p>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={!estimate}
              onClick={() => goTo(2)}
              className="btn btn-primary btn-lg mt-5 hidden w-full lg:flex"
            >
              Continue — get my PDF quotation <Icon name="arrowRight" />
            </button>
            <p className="mt-3 hidden text-center text-sm text-ink-500 lg:block">Estimate only. Final price confirmed after a site assessment.</p>
          </div>

          {/* Mobile sticky summary */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-500">Estimated total</p>
                <p className="truncate font-display text-xl font-extrabold text-clay-700 tabular-nums">{estimate ? formatKwacha(estimate.grandTotal) : "—"}</p>
              </div>
              <button type="button" disabled={!estimate} onClick={() => goTo(2)} className="btn btn-primary">
                Continue <Icon name="arrowRight" className="size-4" />
              </button>
            </div>
          </div>
          <div className="h-20 lg:hidden" aria-hidden="true" />
        </div>
      )}

      {/* ------------------------- Step 2: details -------------------------- */}
      {step === 2 && estimate && (
        <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div className="card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-extrabold">Where should we send your quotation?</h2>
            <p className="mt-1 text-ink-600">Fields marked * are required. It takes about a minute.</p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field id="fullName" label="Full name *" error={err("customer.fullName")} className="sm:col-span-2">
                <input id="q-fullName" autoComplete="name" className="field" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!err("customer.fullName")} />
              </Field>
              <Field id="email" label="Email address *" error={err("customer.email")} hint="Your PDF quotation is sent here.">
                <input id="q-email" type="email" inputMode="email" autoComplete="email" className="field" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!err("customer.email")} />
              </Field>
              <Field id="phone" label="Phone number *" error={err("customer.phone")}>
                <input id="q-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0999 123 456" className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!err("customer.phone")} />
              </Field>
              <div className="sm:col-span-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" className="size-5 accent-clay-500" checked={form.whatsappSameAsPhone} onChange={(e) => set("whatsappSameAsPhone", e.target.checked)} />
                  My WhatsApp number is the same as my phone number
                </label>
              </div>
              {!form.whatsappSameAsPhone && (
                <Field id="whatsapp" label="WhatsApp number" error={err("customer.whatsapp")} className="sm:col-span-2">
                  <input id="q-whatsapp" type="tel" inputMode="tel" className="field" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} aria-invalid={!!err("customer.whatsapp")} />
                </Field>
              )}
              <Field id="location" label="Project location *" error={err("project.location")} className="sm:col-span-2" hint="Area and town, e.g. Area 43, Lilongwe">
                <input id="q-location" autoComplete="address-level2" className="field" value={form.location} onChange={(e) => set("location", e.target.value)} aria-invalid={!!err("project.location")} />
              </Field>
              <Field id="projectType" label="Type of project" error={err("project.projectType")}>
                <select id="q-projectType" className="field" value={form.projectType} onChange={(e) => set("projectType", e.target.value)}>
                  <option value="">Select…</option>
                  {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field id="paverStyle" label="Preferred paver style" error={err("project.paverStyle")}>
                <select id="q-paverStyle" className="field" value={form.paverStyle} onChange={(e) => set("paverStyle", e.target.value)}>
                  <option value="">Select…</option>
                  {PAVER_STYLES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field id="expectedStartDate" label="Expected start date" error={err("project.expectedStartDate")}>
                <input id="q-expectedStartDate" type="date" className="field" value={form.expectedStartDate} onChange={(e) => set("expectedStartDate", e.target.value)} />
              </Field>
              <Field id="notes" label="Additional notes" error={err("project.notes")} className="sm:col-span-2">
                <textarea id="q-notes" rows={3} maxLength={2000} className="field" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Access, slopes, existing surfaces, colours you like…" />
              </Field>

              {/* Honeypot: invisible to people, tempting to bots. */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="q-website">Website</label>
                <input id="q-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
              </div>
            </div>

            {formError && (
              <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <Icon name="alert" className="size-5 shrink-0" /> {formError}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => goTo(1)} className="btn btn-outline text-ink-800">
                <Icon name="chevronLeft" className="size-4" /> Back
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary btn-lg">
                {submitting ? (
                  <>
                    <Spinner /> Generating your quotation…
                  </>
                ) : (
                  <>
                    Generate My Quotation <Icon name="arrowRight" />
                  </>
                )}
              </button>
            </div>
            <p className="mt-4 text-xs text-ink-500">
              We use your details only to prepare your quotation and follow up on your project.
            </p>
          </div>

          <aside className="card p-6 lg:sticky lg:top-28">
            <p className="text-sm font-semibold text-ink-500">Your estimate</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-clay-700 tabular-nums">{formatKwacha(estimate.grandTotal)}</p>
            <p className="mt-1 text-sm text-ink-600">{formatNumber(estimate.squareMetres)} SQM · {estimate.lines.filter((l) => l.amount !== null).length} priced items</p>
            <button type="button" onClick={() => goTo(1)} className="mt-3 text-sm font-semibold text-clay-700 underline-offset-2 hover:underline">
              Change area or services
            </button>
            <ul className="mt-5 space-y-2 border-t border-ink-100 pt-5 text-sm text-ink-600">
              <li className="flex gap-2"><Icon name="check" className="size-4 shrink-0 text-moss-500" /> Recalculated and verified by our system</li>
              <li className="flex gap-2"><Icon name="check" className="size-4 shrink-0 text-moss-500" /> Detailed PDF emailed to you</li>
              <li className="flex gap-2"><Icon name="check" className="size-4 shrink-0 text-moss-500" /> No obligation — final price after site assessment</li>
            </ul>
          </aside>
        </form>
      )}

      {/* ------------------------- Step 3: outcome -------------------------- */}
      {step === 3 && outcome && <OutcomePanel outcome={outcome} retrying={retrying} onRetry={retryEmail} />}
    </div>
  );
}

function OutcomePanel({ outcome, retrying, onRetry }: { outcome: Outcome; retrying: boolean; onRetry: () => void }) {
  const sent = outcome.delivery.status === "sent";
  const pdfUrl = `/api/quotations/${outcome.quoteNumber}/pdf?token=${encodeURIComponent(outcome.accessToken)}`;
  const assessUrl = `/site-assessment?quote=${encodeURIComponent(outcome.quoteNumber)}&token=${encodeURIComponent(outcome.accessToken)}`;

  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <div className="card overflow-hidden">
        <div className={`${sent ? "bg-moss-500" : "bg-ink-900"} px-6 py-8 text-center text-white sm:px-10`}>
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/15">
            <Icon name={sent ? "check" : "mail"} className="size-8" />
          </span>
          {sent ? (
            <>
              <h2 className="mt-4 text-3xl font-extrabold">Quotation Generated Successfully</h2>
              <p className="mx-auto mt-3 max-w-lg text-lg text-white/90">
                Thank you, {outcome.customerName}. Your Mozaik Pavers quotation has been sent to <strong>{outcome.customerEmail}</strong>.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-3xl font-extrabold">Your quotation is ready</h2>
              <p className="mx-auto mt-3 max-w-lg text-white/90">
                We saved quotation {outcome.quoteNumber}, but couldn&apos;t email it to <strong>{outcome.customerEmail}</strong> just now.
                You can download it below{outcome.delivery.canRetry ? " or try sending it again" : ""}.
              </p>
            </>
          )}
        </div>

        <div className="grid gap-4 border-b border-ink-100 p-6 sm:grid-cols-3 sm:p-8">
          <div>
            <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Reference</p>
            <p className="mt-1 font-mono font-bold">{outcome.quoteNumber}</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Area</p>
            <p className="mt-1 font-bold">{formatNumber(outcome.squareMetres)} SQM</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Estimated total</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-clay-700">{formatKwacha(outcome.grandTotal)}</p>
          </div>
        </div>

        <div className="space-y-3 p-6 sm:p-8">
          {!sent && outcome.delivery.canRetry && (
            <button type="button" onClick={onRetry} disabled={retrying} className="btn btn-dark w-full">
              {retrying ? <><Spinner /> Sending…</> : <><Icon name="refresh" className="size-4" /> Try sending the email again</>}
            </button>
          )}
          <a href={pdfUrl} target="_blank" rel="noopener" className="btn btn-outline w-full text-ink-900">
            <Icon name="download" className="size-4" /> Download PDF quotation
          </a>
          <p className="text-center text-xs text-ink-500">Valid until {formatDate(outcome.validUntil)} · Estimate subject to site assessment</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-clay-500 p-6 text-white sm:p-8">
        <h3 className="text-2xl font-extrabold">Next step: book your site assessment</h3>
        <p className="mt-2 text-white/90">
          We&apos;ll visit to confirm measurements, ground conditions and drainage, then issue your final quotation.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href={assessUrl} className="btn btn-light btn-lg">
            <Icon name="ruler" /> REQUEST A SITE ASSESSMENT
          </Link>
          <WhatsAppLink
            source="quote_success"
            message={`Hello Mozaik Pavers, I've just generated quotation ${outcome.quoteNumber} (${formatKwacha(outcome.grandTotal)}) and would like to discuss it.`}
            className="btn btn-lg bg-ink-900 text-white hover:bg-ink-800"
          >
            <Icon name="whatsapp" /> Chat with Mozaik Pavers on WhatsApp
          </WhatsAppLink>
        </div>
      </div>

      <details className="card mt-6 p-6">
        <summary className="cursor-pointer font-bold">View cost breakdown</summary>
        <div className="mt-4">
          <CostBreakdown result={outcome.result} />
        </div>
      </details>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = ["Area & services", "Your details", "Your quotation"];
  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label="Progress">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                state === "done" ? "bg-moss-500 text-white" : state === "current" ? "bg-clay-500 text-white" : "bg-ink-200 text-ink-500"
              }`}
            >
              {state === "done" ? <Icon name="check" className="size-4" /> : n}
            </span>
            <span className={`hidden text-sm font-semibold sm:inline ${state === "todo" ? "text-ink-400" : "text-ink-800"}`}>{label}</span>
            {i < steps.length - 1 && <span className="h-0.5 flex-1 rounded bg-ink-200" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function AreaHelper({ onUse }: { onUse: (sqm: number) => void }) {
  const [open, setOpen] = useState(false);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const product = Number(length) * Number(width);
  const ok = Number.isFinite(product) && product > 0;
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-clay-700" aria-expanded={open}>
        <Icon name="ruler" className="size-4" /> Help me work out the area
        <Icon name="chevronDown" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2 rounded-xl bg-sand-100 p-4">
          <label className="text-sm font-semibold">
            Length (m)
            <input type="number" inputMode="decimal" className="field mt-1" value={length} onChange={(e) => setLength(e.target.value)} />
          </label>
          <span className="pb-3 font-bold text-ink-500">×</span>
          <label className="text-sm font-semibold">
            Width (m)
            <input type="number" inputMode="decimal" className="field mt-1" value={width} onChange={(e) => setWidth(e.target.value)} />
          </label>
          <button type="button" disabled={!ok} onClick={() => onUse(Math.round(product * 100) / 100)} className="btn btn-dark btn-sm col-span-3 mt-1">
            Use {ok ? `${formatNumber(Math.round(product * 100) / 100)} SQM` : "this area"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ id, label, error, hint, className = "", children }: { id: string; label: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={`q-${id}`} className="field-label">{label}</label>
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}
