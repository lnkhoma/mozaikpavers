import type { ReactNode } from "react";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/constants";

export function AdminHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="border-b border-ink-200 bg-white">
      <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function AdminBody({ children }: { children: ReactNode }) {
  return <div className="space-y-6 px-4 py-6 lg:px-8">{children}</div>;
}

export function Panel({ title, children, actions, className = "" }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-ink-200 bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
          <h2 className="font-bold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-clay-100 text-clay-700",
  contacted: "bg-sky-100 text-sky-800",
  site_visit_scheduled: "bg-indigo-100 text-indigo-800",
  site_assessed: "bg-violet-100 text-violet-800",
  final_quote_issued: "bg-amber-100 text-amber-900",
  negotiation: "bg-orange-100 text-orange-900",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-ink-200 text-ink-700",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

/** Single-series horizontal bar list (one hue, values in ink text). */
export function BarList({ rows, format = (n: number) => n.toLocaleString("en-US"), empty = "No data yet." }: {
  rows: { label: string; value: number; detail?: string }[];
  format?: (n: number) => string;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) return <p className="text-sm text-ink-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${format(r.value)}${r.detail ? ` · ${r.detail}` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-ink-700">{r.label}</span>
            <span className="shrink-0 font-bold text-ink-900 tabular-nums">
              {format(r.value)}
              {r.detail && <span className="ml-1.5 font-normal text-ink-500">{r.detail}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink-100">
            <div className="h-2 rounded-full bg-clay-500 transition-[width] group-hover:bg-clay-600" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? "4px" : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
