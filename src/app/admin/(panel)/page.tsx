import Link from "next/link";
import { AdminBody, AdminHeader, BarList, Panel, StatTile, StatusBadge } from "@/components/admin/ui";
import { LeadFiltersForm, filtersToQuery, parseLeadFilters } from "@/components/admin/lead-filters";
import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/session";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime, formatKwacha, formatKwachaCompact, formatNumber } from "@/lib/format";
import { funnel } from "@/lib/services/analytics";
import { dashboardMetrics, distinctLeadValues, listLeads, recentSiteVisits } from "@/lib/services/leads";

export const metadata = { title: "Dashboard" };

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireAdmin();
  const params = await searchParams;
  const filters = parseLeadFilters(params);
  const [m, types, recent, visits, events] = await Promise.all([
    dashboardMetrics(filters),
    distinctLeadValues(),
    listLeads(filters, 1, 6),
    recentSiteVisits(),
    funnel({ from: filters.from, to: filters.to }),
  ]);
  const forbidden = params.error === "forbidden";
  const top = events.funnel[0]?.sessions || 0;

  return (
    <>
      <AdminHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Quotations, leads and pipeline at a glance"
        actions={<Link href={`/admin/leads${filtersToQuery(filters)}`} className="btn btn-dark btn-sm"><Icon name="users" className="size-4" /> Open leads</Link>}
      />
      <AdminBody>
        {forbidden && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">That page is restricted to administrators.</p>}
        <LeadFiltersForm filters={filters} action="/admin" projectTypes={types.projectTypes} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Quotation requests" value={formatNumber(m.totalQuotations)} hint={`${formatNumber(m.totalLeads)} leads in total`} />
          <StatTile label="New leads" value={formatNumber(m.newLeads)} hint="Awaiting first contact" />
          <StatTile label="Total SQM quoted" value={formatNumber(m.totalSqm)} hint="Square metres" />
          <StatTile label="Pipeline value" value={formatKwachaCompact(m.pipelineValue)} hint="Open leads, estimated" />
          <StatTile label="Average quotation" value={formatKwachaCompact(m.averageQuote)} hint={formatKwacha(m.averageQuote)} />
          <StatTile label="Won customers" value={formatNumber(m.won)} hint={m.wonValue ? `${formatKwachaCompact(m.wonValue)} won` : undefined} />
          <StatTile label="Lost customers" value={formatNumber(m.lost)} />
          <StatTile label="Conversion rate" value={pct(m.conversionRate)} hint={`Won ÷ leads · win rate ${pct(m.winRate)}`} />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel title="Leads by status">
            <BarList
              rows={LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], value: m.byStatus[s] ?? 0 }))}
              empty="No leads match these filters."
            />
          </Panel>
          <Panel title="Top locations">
            <BarList
              rows={m.byLocation.map((l) => ({ label: l.location, value: l.count, detail: formatKwachaCompact(l.value) }))}
              empty="No leads match these filters."
            />
          </Panel>
          <Panel title="Conversion funnel" actions={<span className="text-xs text-ink-500">Unique sessions</span>}>
            <BarList
              rows={events.funnel.map((s) => ({
                label: s.label,
                value: s.sessions,
                detail: top && s.name !== "page_view" ? pct(s.sessions / top) : undefined,
              }))}
              empty="No visitor activity recorded yet."
            />
            <div className="mt-4 flex gap-4 border-t border-ink-100 pt-3 text-sm text-ink-600">
              {events.contact.map((c) => (
                <span key={c.name}><strong className="text-ink-900 tabular-nums">{formatNumber(c.events)}</strong> {c.label}</span>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Panel title="Latest leads" actions={<Link href="/admin/leads" className="text-sm font-bold text-clay-700">View all</Link>}>
            {recent.rows.length === 0 ? (
              <p className="text-sm text-ink-500">No leads yet. They appear here as soon as a customer generates a quotation.</p>
            ) : (
              <ul className="-my-2 divide-y divide-ink-100">
                {recent.rows.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-sand-50">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{l.customerName}</p>
                        <p className="truncate text-xs text-ink-500">
                          {l.quoteNumber ?? l.reference} · {l.location ?? "—"} · {formatDateTime(l.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-bold tabular-nums">{l.estimatedValue ? formatKwacha(l.estimatedValue) : "—"}</span>
                        <StatusBadge status={l.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Site assessment requests">
            {visits.length === 0 ? (
              <p className="text-sm text-ink-500">No pending requests.</p>
            ) : (
              <ul className="-my-2 divide-y divide-ink-100">
                {visits.map((v) => (
                  <li key={v.id}>
                    <Link href={`/admin/leads/${v.leadId}`} className="block py-3 hover:bg-sand-50">
                      <p className="font-semibold">{v.customerName}</p>
                      <p className="text-xs text-ink-500">
                        {v.location} · {v.preferredDate ? `${formatDate(v.preferredDate)} (${v.preferredTime})` : "Any date"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </AdminBody>
    </>
  );
}
