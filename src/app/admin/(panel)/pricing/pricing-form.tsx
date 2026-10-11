"use client";

import { useActionState, useMemo, useState } from "react";
import { formatKwacha } from "@/lib/format";
import { PRICING_FIELDS } from "@/lib/pricing/defaults";
import { calculateQuotation } from "@/lib/pricing/engine";
import type { PricingConfig } from "@/lib/pricing/types";
import { updatePricingAction, type ActionState } from "../../actions";

const GROUPS = [...new Set(PRICING_FIELDS.map((f) => f.group))];

export function PricingForm({ current }: { current: PricingConfig }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePricingAction, {});
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(current).map(([k, v]) => [k, String(v)])));
  const [previewArea, setPreviewArea] = useState("150");

  const candidate = useMemo(() => {
    const parsed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)])) as unknown as PricingConfig;
    return Object.values(parsed).every((n) => Number.isFinite(n) && n >= 0) ? parsed : null;
  }, [values]);

  const preview = useMemo(() => {
    const area = Number(previewArea);
    try {
      if (!candidate || !(area >= 1)) return null;
      return { next: calculateQuotation(area, candidate), now: calculateQuotation(area, current) };
    } catch {
      return null;
    }
  }, [candidate, current, previewArea]);

  const changed = PRICING_FIELDS.filter((f) => Number(values[f.key]) !== current[f.key]);

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {GROUPS.map((group) => (
          <fieldset key={group} className="rounded-xl border border-ink-200 bg-white p-5">
            <legend className="px-1 font-bold">{group}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {PRICING_FIELDS.filter((f) => f.group === group).map((f) => {
                const err = state.errors?.[f.key];
                const dirty = Number(values[f.key]) !== current[f.key];
                return (
                  <label key={f.key} className="block">
                    <span className="field-label flex items-center justify-between">
                      {f.label}
                      {dirty && <span className="rounded bg-clay-100 px-1.5 text-[0.65rem] font-bold text-clay-700 uppercase">Changed</span>}
                    </span>
                    <div className="relative">
                      {f.kind === "money" && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-bold text-ink-500">K</span>}
                      <input
                        name={f.key}
                        type="number"
                        inputMode="decimal"
                        min={f.kind === "quantity" ? "0.01" : "0"}
                        step={f.kind === "quantity" ? "any" : "1"}
                        required
                        value={values[f.key]}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        className={`field tabular-nums ${f.kind === "money" ? "pl-7" : ""} pr-24`}
                        aria-invalid={!!err}
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-ink-500">{f.unit}</span>
                    </div>
                    {err ? <span className="field-error block">{err}</span> : <span className="field-hint block">{f.help}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="font-bold">Preview</h2>
          <label className="mt-3 flex items-center gap-2 text-sm">
            Example area
            <input type="number" min="1" value={previewArea} onChange={(e) => setPreviewArea(e.target.value)} className="field min-h-9 w-24 py-1 text-sm" /> SQM
          </label>
          {preview ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">Current total</dt><dd className="font-semibold tabular-nums">{formatKwacha(preview.now.grandTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">With these values</dt><dd className="font-display text-xl font-extrabold text-clay-700 tabular-nums">{formatKwacha(preview.next.grandTotal)}</dd></div>
              <div className="flex justify-between border-t border-ink-100 pt-2">
                <dt className="text-ink-500">Difference</dt>
                <dd className="font-semibold tabular-nums">
                  {preview.next.grandTotal - preview.now.grandTotal >= 0 ? "+" : ""}
                  {formatKwacha(preview.next.grandTotal - preview.now.grandTotal)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-red-700">Enter valid values to preview.</p>
          )}
        </div>

        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <label className="block">
            <span className="field-label">Reason for change</span>
            <input name="changeNote" maxLength={300} placeholder="e.g. Supplier price increase, October" className="field" />
          </label>
          <p className="mt-3 text-sm text-ink-600">
            {changed.length === 0 ? "No changes yet." : `${changed.length} value${changed.length === 1 ? "" : "s"} changed.`} Saving creates a new pricing
            version. Existing quotations keep the rates they were issued with.
          </p>
          {state.message && <p role="status" className={`mt-3 text-sm font-semibold ${state.ok ? "text-moss-600" : "text-red-700"}`}>{state.message}</p>}
          <button disabled={pending || changed.length === 0} className="btn btn-primary mt-4 w-full">
            {pending ? "Saving…" : "Save new pricing version"}
          </button>
        </div>
      </div>
    </form>
  );
}
