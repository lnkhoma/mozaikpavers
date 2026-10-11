import type { Metadata } from "next";
import Link from "next/link";
import { LeadFiltersForm, filtersToQuery, parseLeadFilters } from "@/components/admin/lead-filters";
import { AdminBody, AdminHeader, StatusBadge } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/session";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import { formatDateTime, formatKwacha, formatNumber } from "@/lib/format";
import { distinctLeadValues, listLeads } from "@/lib/services/leads";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  await requireAdmin();
  const params = await searchParams;
  const filters = parseLeadFilters(params);
  const page = Math.max(1, Math.min(10_000, Number(params.page) || 1));
  const [data, types] = await Promise.all([listLeads(filters, page), distinctLeadValues()]);

  return (
    <>
      <AdminHeader
        title="Lead management"
        subtitle={`${formatNumber(data.total)} ${data.total === 1 ? "lead" : "leads"}`}
        actions={
          <a href={`/admin/leads/export${filtersToQuery(filters)}`} className="btn btn-sm border border-ink-300 bg-white hover:bg-ink-100">
            <Icon name="download" className="size-4" /> Export CSV
          </a>
        }
      />
      <AdminBody>
        <LeadFiltersForm filters={filters} action="/admin/leads" projectTypes={types.projectTypes} showSearch />

        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
          {data.rows.length === 0 ? (
            <p className="p-8 text-center text-ink-500">No leads match these filters.</p>
          ) : (
            <>
              <table className="hidden w-full text-sm md:table">
                <thead className="bg-ink-50 text-left text-xs tracking-wider text-ink-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold">Quotation</th>
                    <th className="px-4 py-3 font-bold">Location</th>
                    <th className="px-4 py-3 text-right font-bold">Area</th>
                    <th className="px-4 py-3 text-right font-bold">Value</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data.rows.map((l) => (
                    <tr key={l.id} className="hover:bg-sand-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/leads/${l.id}`} className="font-semibold text-ink-900 hover:text-clay-700">{l.customerName}</Link>
                        <p className="text-xs text-ink-500">{l.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{l.quoteNumber ?? l.reference}</span>
                        <p className="text-xs text-ink-500">{LEAD_SOURCE_LABELS[l.source]}</p>
                      </td>
                      <td className="px-4 py-3">{l.location ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{l.squareMetres ? `${formatNumber(l.squareMetres)} m²` : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{l.estimatedValue ? formatKwacha(l.estimatedValue) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={l.status} />
                          {l.siteVisitRequested && <span className="text-xs font-semibold text-indigo-700">Site visit requested</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-500">{formatDateTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-ink-100 md:hidden">
                {data.rows.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="block p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{l.customerName}</p>
                          <p className="text-xs text-ink-500">{l.quoteNumber ?? l.reference} · {l.location ?? "—"}</p>
                        </div>
                        <StatusBadge status={l.status} />
                      </div>
                      <p className="mt-1 text-sm font-bold tabular-nums">{l.estimatedValue ? formatKwacha(l.estimatedValue) : "—"}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {data.pages > 1 && (
          <nav className="flex items-center justify-between" aria-label="Pagination">
            <span className="text-sm text-ink-500">Page {data.page} of {data.pages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link className="btn btn-sm border border-ink-300 bg-white" href={`/admin/leads${filtersToQuery(filters, { page: String(page - 1) })}`}>Previous</Link>}
              {page < data.pages && <Link className="btn btn-sm border border-ink-300 bg-white" href={`/admin/leads${filtersToQuery(filters, { page: String(page + 1) })}`}>Next</Link>}
            </div>
          </nav>
        )}
      </AdminBody>
    </>
  );
}
