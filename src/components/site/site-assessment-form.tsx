"use client";

import Link from "next/link";
import { useState } from "react";
import { WhatsAppLink } from "@/components/analytics/contact-links";
import { Icon } from "@/components/ui/icons";
import { PROJECT_TYPES } from "@/config/company";
import { track } from "@/lib/analytics-client";
import { siteVisitRequestSchema } from "@/lib/validation/schemas";
import { FormField, Honeypot, usePublicForm } from "./public-form";

export interface LinkedQuote {
  quoteNumber: string;
  accessToken: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  location: string;
  projectType: string | null;
  squareMetres: number;
}

export function SiteAssessmentForm({ linked }: { linked?: LinkedQuote }) {
  const { submit, errors, formError, submitting, clearError } = usePublicForm(siteVisitRequestSchema, "/api/site-visits");
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [v, setV] = useState({
    fullName: linked?.fullName ?? "",
    email: linked?.email ?? "",
    phone: linked?.phone ?? "",
    whatsapp: linked?.whatsapp ?? "",
    location: linked?.location ?? "",
    projectType: linked?.projectType ?? "",
    squareMetres: linked ? String(linked.squareMetres) : "",
    preferredDate: "",
    preferredTime: "any",
    notes: "",
  });
  const set = (k: keyof typeof v, value: string) => {
    setV((s) => ({ ...s, [k]: value }));
    clearError(k);
  };
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = await submit(
      { ...v, squareMetres: v.squareMetres || undefined, quoteNumber: linked?.quoteNumber, accessToken: linked?.accessToken },
      honeypot,
    );
    if (data) {
      track("site_assessment_requested", { linked: !!linked });
      setDone({ reference: String(data.reference) });
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center" role="status">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-moss-500 text-white">
          <Icon name="check" className="size-8" />
        </span>
        <h2 className="mt-5 text-3xl font-extrabold">Site assessment requested</h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-ink-600">
          Thank you, {v.fullName.split(" ")[0]}. Our team will contact you on {v.phone} to confirm a date. Your reference is{" "}
          <strong className="font-mono">{done.reference}</strong>.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <WhatsAppLink source="site_assessment_done" message={`Hello Mozaik Pavers, I've requested a site assessment (ref ${done.reference}).`} />
          <Link href="/projects" className="btn btn-outline text-ink-900">Browse our projects</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card relative p-6 sm:p-8">
      {linked && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-sand-100 p-4 text-sm">
          <Icon name="check" className="mt-0.5 size-5 shrink-0 text-moss-500" />
          <p>
            Linked to quotation <strong className="font-mono">{linked.quoteNumber}</strong>. We&apos;ve filled in your details — just choose a
            convenient time.
          </p>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="fullName" label="Full name *" error={errors.fullName} className="sm:col-span-2">
          <input id="f-fullName" autoComplete="name" className="field" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!errors.fullName} />
        </FormField>
        <FormField id="phone" label="Phone number *" error={errors.phone}>
          <input id="f-phone" type="tel" inputMode="tel" autoComplete="tel" className="field" value={v.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} />
        </FormField>
        <FormField id="email" label="Email address *" error={errors.email}>
          <input id="f-email" type="email" inputMode="email" autoComplete="email" className="field" value={v.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
        </FormField>
        <FormField id="location" label="Site location *" error={errors.location} hint="Area/plot and town" className="sm:col-span-2">
          <input id="f-location" className="field" value={v.location} onChange={(e) => set("location", e.target.value)} aria-invalid={!!errors.location} />
        </FormField>
        {!linked && (
          <>
            <FormField id="projectType" label="Type of project" error={errors.projectType}>
              <select id="f-projectType" className="field" value={v.projectType} onChange={(e) => set("projectType", e.target.value)}>
                <option value="">Select…</option>
                {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField id="squareMetres" label="Approximate area (SQM)" error={errors.squareMetres}>
              <input id="f-squareMetres" type="number" inputMode="decimal" className="field" value={v.squareMetres} onChange={(e) => set("squareMetres", e.target.value)} />
            </FormField>
          </>
        )}
        <FormField id="preferredDate" label="Preferred date" error={errors.preferredDate}>
          <input id="f-preferredDate" type="date" min={today} className="field" value={v.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} />
        </FormField>
        <FormField id="preferredTime" label="Preferred time" error={errors.preferredTime}>
          <select id="f-preferredTime" className="field" value={v.preferredTime} onChange={(e) => set("preferredTime", e.target.value)}>
            <option value="any">Any time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </select>
        </FormField>
        <FormField id="notes" label="Anything we should know?" error={errors.notes} className="sm:col-span-2">
          <textarea id="f-notes" rows={3} className="field" value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Directions, gate access, best person to meet…" />
        </FormField>
      </div>
      <Honeypot value={honeypot} onChange={setHoneypot} />
      {formError && (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{formError}</p>
      )}
      <button type="submit" disabled={submitting} className="btn btn-primary btn-lg mt-6 w-full">
        {submitting ? "Sending request…" : "Request Site Assessment"}
      </button>
    </form>
  );
}
