import { and, desc, eq, or } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBody, AdminHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { CostBreakdown } from "@/components/quote/cost-breakdown";
import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/session";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { formatDate, formatDateTime, formatKwacha, formatNumber } from "@/lib/format";
import { calculateQuotation } from "@/lib/pricing/engine";
import { getLead } from "@/lib/services/leads";
import { LeadStatusForm, SiteVisitForm } from "./lead-forms";

export const metadata: Metadata = { title: "Lead" };

const UUID = /^[0-9a-f-]{36}$/i;

/** datetime-local value in Malawi time. */
function localInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d.getTime() + 2 * 3600_000).toISOString().slice(0, 16);
}

export default async function LeadDetailPage({ params }: PageProps<"/admin/leads/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const data = await getLead(id);
  if (!data) notFound();
  const { lead, customer, quotation, visits } = data;

  // Reproduce the quotation from its stored pricing snapshot to prove it is unchanged.
  let reproducible: boolean | null = null;
  if (quotation) {
    try {
      reproducible = calculateQuotation(quotation.squareMetres, quotation.pricingSnapshot, quotation.options).grandTotal === quotation.grandTotal;
    } catch {
      reproducible = false;
    }
  }

  const db = await getDb();
  const history = await db
    .select({ id: auditLogs.id, action: auditLogs.action, details: auditLogs.details, createdAt: auditLogs.createdAt, actor: users.name })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(
      or(
        and(eq(auditLogs.entityType, "lead"), eq(auditLogs.entityId, lead.id)),
        quotation ? and(eq(auditLogs.entityType, "quotation"), eq(auditLogs.entityId, quotation.id)) : undefined,
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);

  const firstName = customer.fullName.split(" ")[0];
  const waNumber = (customer.whatsapp ?? customer.phone).replace(/\D/g, "");

  return (
    <>
      <AdminHeader
        title={customer.fullName}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono">{quotation?.quoteNumber ?? lead.reference}</span> · {LEAD_SOURCE_LABELS[lead.source]} · {formatDateTime(lead.createdAt)}
            <StatusBadge status={lead.status} />
          </span>
        }
        actions={<Link href="/admin/leads" className="btn btn-sm border border-ink-300 bg-white"><Icon name="chevronLeft" className="size-4" /> All leads</Link>}
      />
      <AdminBody>
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            <Panel title="Contact">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-ink-500">Email</dt><dd className="font-semibold break-all">{customer.email}</dd></div>
                <div><dt className="text-ink-500">Phone</dt><dd className="font-semibold">{customer.phone}</dd></div>
                <div><dt className="text-ink-500">WhatsApp</dt><dd className="font-semibold">{customer.whatsapp ?? "—"}</dd></div>
                <div><dt className="text-ink-500">Location</dt><dd className="font-semibold">{lead.location ?? "—"}</dd></div>
                {lead.projectType && <div><dt className="text-ink-500">Project type</dt><dd className="font-semibold">{lead.projectType}</dd></div>}
                {quotation?.paverStyle && <div><dt className="text-ink-500">Paver style</dt><dd className="font-semibold">{quotation.paverStyle}</dd></div>}
                {quotation?.expectedStartDate && <div><dt className="text-ink-500">Expected start</dt><dd className="font-semibold">{formatDate(quotation.expectedStartDate)}</dd></div>}
              </dl>
              {lead.message && <p className="mt-4 rounded-lg bg-sand-100 p-3 text-sm whitespace-pre-line">{lead.message}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={`tel:${customer.phone}`} className="btn btn-sm btn-dark"><Icon name="phone" className="size-4" /> Call</a>
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${firstName}, this is Mozaik Pavers regarding ${quotation ? `quotation ${quotation.quoteNumber}` : "your enquiry"}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-whatsapp"
                >
                  <Icon name="whatsapp" className="size-4" /> WhatsApp
                </a>
                <a href={`mailto:${customer.email}?subject=${encodeURIComponent(quotation ? `Your Mozaik Pavers quotation ${quotation.quoteNumber}` : "Mozaik Pavers")}`} className="btn btn-sm border border-ink-300 bg-white">
                  <Icon name="mail" className="size-4" /> Email
                </a>
              </div>
            </Panel>

            {quotation && (
              <Panel
                title={`Quotation ${quotation.quoteNumber}`}
                actions={
                  <a href={`/api/quotations/${quotation.quoteNumber}/pdf`} target="_blank" className="inline-flex items-center gap-1 text-sm font-bold text-clay-700">
                    <Icon name="download" className="size-4" /> PDF
                  </a>
                }
              >
                <div className="mb-4 grid gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-ink-500">Area</p><p className="font-bold">{formatNumber(quotation.squareMetres)} SQM</p></div>
                  <div><p className="text-ink-500">Total</p><p className="font-bold">{formatKwacha(quotation.grandTotal)}</p></div>
                  <div><p className="text-ink-500">Valid until</p><p className="font-bold">{formatDate(quotation.validUntil)}</p></div>
                  <div>
                    <p className="text-ink-500">Email</p>
                    <p className={`font-bold ${quotation.emailStatus === "sent" ? "text-moss-600" : quotation.emailStatus === "failed" ? "text-red-700" : ""}`}>
                      {quotation.emailStatus === "sent" ? `Sent ${formatDateTime(quotation.emailSentAt)}` : quotation.emailStatus === "failed" ? `Failed (${quotation.emailAttempts} attempts)` : "Pending"}
                    </p>
                  </div>
                </div>
                {quotation.emailStatus === "failed" && quotation.emailLastError && (
                  <p className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">Last email error: {quotation.emailLastError}</p>
                )}
                <CostBreakdown result={quotation.result} compact />
                <p className={`mt-4 flex items-center gap-2 text-xs ${reproducible ? "text-moss-600" : "text-red-700"}`}>
                  <Icon name={reproducible ? "check" : "alert"} className="size-4" />
                  {reproducible
                    ? `Reproduced from pricing version ${quotation.pricingVersion} snapshot — total matches.`
                    : "Warning: recalculating from the stored snapshot gives a different total."}
                </p>
              </Panel>
            )}

            <Panel title={`Site visits (${visits.length})`}>
              {visits.length === 0 ? (
                <p className="text-sm text-ink-500">No site assessment requested yet.</p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {visits.map((v) => (
                    <li key={v.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="font-semibold">{v.location}</p>
                      <p className="text-sm text-ink-500">
                        Requested {formatDateTime(v.createdAt)} · Preferred {v.preferredDate ? formatDate(v.preferredDate) : "any date"} ({v.preferredTime ?? "any"})
                      </p>
                      {v.notes && <p className="mt-1 text-sm">{v.notes}</p>}
                      <SiteVisitForm visitId={v.id} leadId={lead.id} status={v.status} scheduledFor={localInput(v.scheduledFor)} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Pipeline">
              <LeadStatusForm leadId={lead.id} status={lead.status} adminNotes={lead.adminNotes} />
            </Panel>
            <Panel title="Activity">
              {history.length === 0 ? (
                <p className="text-sm text-ink-500">No activity yet.</p>
              ) : (
                <ol className="space-y-3 text-sm">
                  {history.map((h) => (
                    <li key={h.id} className="border-l-2 border-ink-200 pl-3">
                      <p className="font-semibold">{describe(h.action, h.details)}</p>
                      <p className="text-xs text-ink-500">{h.actor ?? "System"} · {formatDateTime(h.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>
      </AdminBody>
    </>
  );
}

function describe(action: string, details: Record<string, unknown> | null): string {
  if (action === "lead.status_changed" && details) return `Status: ${String(details.from).replace(/_/g, " ")} → ${String(details.to).replace(/_/g, " ")}`;
  if (action === "quotation.created") return "Quotation generated online";
  if (action === "lead.updated") return "Notes updated";
  if (action === "lead.created") return "Lead created";
  return action.replace(/[._]/g, " ");
}

