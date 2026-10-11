import Link from "next/link";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, PROJECT_SIZE_BUCKETS, type LeadStatus, type ProjectSizeBucket } from "@/lib/constants";
import type { LeadFilters } from "@/lib/services/leads";

type Params = Record<string, string | string[] | undefined>;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse untrusted query-string filters into a validated LeadFilters. */
export function parseLeadFilters(params: Params): LeadFilters {
  const s = (k: string) => (typeof params[k] === "string" ? (params[k] as string).trim().slice(0, 100) : "");
  const status = s("status");
  const size = s("size");
  return {
    from: DATE.test(s("from")) ? s("from") : undefined,
    to: DATE.test(s("to")) ? s("to") : undefined,
    location: s("location") || undefined,
    status: (LEAD_STATUSES as readonly string[]).includes(status) ? (status as LeadStatus) : undefined,
    projectType: s("projectType") || undefined,
    size: size in PROJECT_SIZE_BUCKETS ? (size as ProjectSizeBucket) : undefined,
    q: s("q") || undefined,
  };
}

export function filtersToQuery(f: LeadFilters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, String(v));
  const q = p.toString();
  return q ? `?${q}` : "";
}

/** Plain GET form: works without JavaScript and keeps filters in the URL. */
export function LeadFiltersForm({ filters, action, projectTypes, showSearch = false }: { filters: LeadFilters; action: string; projectTypes: string[]; showSearch?: boolean }) {
  const active = Object.values(filters).some(Boolean);
  return (
    <form action={action} method="get" className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {showSearch && (
          <label className="text-xs font-bold text-ink-600 sm:col-span-2 lg:col-span-4 xl:col-span-1">
            Search
            <input name="q" defaultValue={filters.q} placeholder="Name, phone, ref…" className="field mt-1 min-h-10 py-1.5 text-sm" />
          </label>
        )}
        <label className="text-xs font-bold text-ink-600">
          From
          <input type="date" name="from" defaultValue={filters.from} className="field mt-1 min-h-10 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-bold text-ink-600">
          To
          <input type="date" name="to" defaultValue={filters.to} className="field mt-1 min-h-10 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-bold text-ink-600">
          Location
          <input name="location" defaultValue={filters.location} placeholder="e.g. Lilongwe" className="field mt-1 min-h-10 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-bold text-ink-600">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className="field mt-1 min-h-10 py-1.5 text-sm">
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-ink-600">
          Project type
          <select name="projectType" defaultValue={filters.projectType ?? ""} className="field mt-1 min-h-10 py-1.5 text-sm">
            <option value="">All types</option>
            {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-ink-600">
          Project size
          <select name="size" defaultValue={filters.size ?? ""} className="field mt-1 min-h-10 py-1.5 text-sm">
            <option value="">All sizes</option>
            {Object.entries(PROJECT_SIZE_BUCKETS).map(([k, b]) => <option key={k} value={k}>{b.label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn btn-dark btn-sm">Apply filters</button>
        {active && <Link href={action} className="btn btn-sm text-ink-600 hover:bg-ink-100">Clear</Link>}
      </div>
    </form>
  );
}
