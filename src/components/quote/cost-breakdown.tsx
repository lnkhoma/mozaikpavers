import { formatKwacha, formatNumber } from "@/lib/format";
import { SUBJECT_TO_ASSESSMENT } from "@/lib/pricing/engine";
import type { QuotationResult } from "@/lib/pricing/types";

/**
 * Responsive cost table: a classic table from `sm` up, stacked rows on
 * phones so nothing scrolls sideways.
 */
export function CostBreakdown({ result, compact = false }: { result: QuotationResult; compact?: boolean }) {
  return (
    <div>
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b-2 border-ink-900 text-left text-xs tracking-wider text-ink-500 uppercase">
            <th className="py-2.5 pr-3 font-bold">Description</th>
            <th className="py-2.5 pr-3 text-right font-bold">Quantity</th>
            <th className="py-2.5 pr-3 text-right font-bold">Unit price</th>
            <th className="py-2.5 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {result.lines.map((l) => (
            <tr key={l.code} className="border-b border-ink-100">
              <td className={`${compact ? "py-2" : "py-3"} pr-3 font-semibold text-ink-800`}>{l.description}</td>
              {l.amount === null ? (
                <td colSpan={3} className="py-3 text-right text-sm font-semibold text-clay-700">
                  {SUBJECT_TO_ASSESSMENT}
                </td>
              ) : (
                <>
                  <td className="py-3 pr-3 text-right text-ink-600">
                    {formatNumber(l.quantity ?? 0)} {l.unit}
                  </td>
                  <td className="py-3 pr-3 text-right text-ink-600">{formatKwacha(l.unitPrice ?? 0)}</td>
                  <td className="py-3 text-right font-bold text-ink-900">{formatKwacha(l.amount)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 text-right text-sm font-bold tracking-wider text-ink-600 uppercase">
              Estimated total
            </td>
            <td className="pt-4 text-right font-display text-2xl font-extrabold text-clay-700 tabular-nums">
              {formatKwacha(result.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      <ul className="divide-y divide-ink-100 sm:hidden">
        {result.lines.map((l) => (
          <li key={l.code} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-ink-800">{l.description}</p>
              {l.amount !== null ? (
                <p className="text-xs text-ink-500 tabular-nums">
                  {formatNumber(l.quantity ?? 0)} {l.unit} × {formatKwacha(l.unitPrice ?? 0)}
                </p>
              ) : (
                <p className="text-xs font-semibold text-clay-700">{SUBJECT_TO_ASSESSMENT}</p>
              )}
            </div>
            <p className="shrink-0 font-bold text-ink-900 tabular-nums">{l.amount === null ? "—" : formatKwacha(l.amount)}</p>
          </li>
        ))}
        <li className="flex items-center justify-between pt-4">
          <span className="text-sm font-bold tracking-wider text-ink-600 uppercase">Estimated total</span>
          <span className="font-display text-2xl font-extrabold text-clay-700 tabular-nums">{formatKwacha(result.grandTotal)}</span>
        </li>
      </ul>
      {result.hasItemsSubjectToAssessment && (
        <p className="mt-2 text-right text-xs text-ink-500">Items subject to site assessment are not included in the total.</p>
      )}
    </div>
  );
}
