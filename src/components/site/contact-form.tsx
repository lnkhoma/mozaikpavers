"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import { contactSchema } from "@/lib/validation/schemas";
import { FormField, Honeypot, usePublicForm } from "./public-form";

const TIMES = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "any", label: "Any time" },
] as const;

/** Get in touch: name, email, phone, project location, approximate area and site-visit availability. */
export function ContactForm() {
  const { submit, errors, formError, submitting, clearError } = usePublicForm(contactSchema, "/api/contact");
  const [honeypot, setHoneypot] = useState("");
  const [sent, setSent] = useState<{ reference: string } | null>(null);
  const [v, setV] = useState({ fullName: "", email: "", phone: "", location: "", squareMetres: "", availableDate: "", availableTime: "any" });
  const set = (k: keyof typeof v, value: string) => {
    setV((s) => ({ ...s, [k]: value }));
    clearError(k);
  };
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = await submit({ ...v, squareMetres: v.squareMetres || undefined }, honeypot);
    if (data) setSent({ reference: String(data.reference) });
  }

  if (sent) {
    const time = TIMES.find((t) => t.value === v.availableTime)?.label.toLowerCase();
    return (
      <div className="card p-8 text-center" role="status">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-moss-500 text-white">
          <Icon name="check" className="size-7" />
        </span>
        <h2 className="mt-4 text-2xl font-extrabold">Thank you, {v.fullName.split(" ")[0]}</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-600">
          We&apos;ve received your details and will call you on {v.phone} to confirm a site visit on{" "}
          <strong>{formatDate(v.availableDate)}</strong> ({time}).
        </p>
        <p className="mt-3 text-sm text-ink-500">
          Your reference: <span className="font-mono font-bold">{sent.reference}</span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card relative p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="fullName" label="Name *" error={errors.fullName} className="sm:col-span-2">
          <input id="f-fullName" autoComplete="name" className="field" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!errors.fullName} />
        </FormField>
        <FormField id="email" label="Email *" error={errors.email}>
          <input id="f-email" type="email" inputMode="email" autoComplete="email" className="field" value={v.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
        </FormField>
        <FormField id="phone" label="Phone number *" error={errors.phone}>
          <input id="f-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0999 123 456" className="field" value={v.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} />
        </FormField>
        <FormField id="location" label="Location of the project *" error={errors.location} hint="Area and town, e.g. Area 47, Lilongwe" className="sm:col-span-2">
          <input id="f-location" className="field" value={v.location} onChange={(e) => set("location", e.target.value)} aria-invalid={!!errors.location} />
        </FormField>
        <FormField id="squareMetres" label="Approximate area" error={errors.squareMetres} hint="In square metres (length × width). Leave blank if unsure." className="sm:col-span-2">
          <div className="relative">
            <input
              id="f-squareMetres"
              type="number"
              inputMode="decimal"
              min="1"
              step="any"
              className="field pr-16"
              value={v.squareMetres}
              onChange={(e) => set("squareMetres", e.target.value)}
              aria-invalid={!!errors.squareMetres}
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold text-ink-500">SQM</span>
          </div>
        </FormField>

        <fieldset className="sm:col-span-2">
          <legend className="field-label">Availability to meet on site *</legend>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <label htmlFor="f-availableDate" className="sr-only">Date</label>
              <input
                id="f-availableDate"
                type="date"
                min={today}
                className="field"
                value={v.availableDate}
                onChange={(e) => set("availableDate", e.target.value)}
                aria-invalid={!!errors.availableDate}
              />
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-100 p-1" role="radiogroup" aria-label="Time of day">
              {TIMES.map((t) => (
                <label
                  key={t.value}
                  className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                    v.availableTime === t.value ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  <input type="radio" name="availableTime" value={t.value} checked={v.availableTime === t.value} onChange={() => set("availableTime", t.value)} className="sr-only" />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          {errors.availableDate ? <p className="field-error" role="alert">{errors.availableDate}</p> : <p className="field-hint">We&apos;ll call to confirm the exact time.</p>}
        </fieldset>
      </div>
      <Honeypot value={honeypot} onChange={setHoneypot} />
      {formError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{formError}</p>}
      <button type="submit" disabled={submitting} className="btn btn-primary btn-lg mt-6 w-full">
        {submitting ? "Sending…" : "Send my details"}
      </button>
    </form>
  );
}
