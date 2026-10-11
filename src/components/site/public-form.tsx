"use client";

import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { fieldErrors as toFieldErrors } from "@/lib/validation/schemas";

/**
 * Shared submit logic for public forms: client-side validation with the same
 * schema the server uses, honeypot + timing bot checks, and error mapping.
 */
export function usePublicForm<S extends z.ZodType>(schema: S, endpoint: string) {
  const startedAt = useRef(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function submit(values: Record<string, unknown>, honeypot: string): Promise<Record<string, unknown> | null> {
    if (submitting) return null;
    setFormError(null);
    const body = { ...values, bot: { website: honeypot, elapsedMs: Date.now() - startedAt.current } };
    const check = schema.safeParse(body);
    if (!check.success) {
      const errs = toFieldErrors(check.error);
      setErrors(errs);
      const first = Object.keys(errs)[0];
      if (first) document.getElementById(`f-${first}`)?.focus();
      return null;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return null;
      }
      return data;
    } catch {
      setFormError("We couldn't reach our server. Please check your connection and try again.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  const clearError = (key: string) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  return { submit, errors, formError, submitting, clearError };
}

export function FormField({
  id,
  label,
  error,
  hint,
  className = "",
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={`f-${id}`} className="field-label">{label}</label>
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
      <label htmlFor="f-website">Website</label>
      <input id="f-website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
