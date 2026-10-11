import type { NextRequest } from "next/server";
import { parseLeadFilters } from "@/components/admin/lead-filters";
import { getAdminUser } from "@/lib/auth/session";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/services/audit";
import { listLeads } from "@/lib/services/leads";

/** Neutralise spreadsheet formula injection and quote for CSV. */
function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const filters = parseLeadFilters(Object.fromEntries(request.nextUrl.searchParams));
  const { rows } = await listLeads(filters, 1, 5000);
  const header = ["Reference", "Quotation", "Created", "Status", "Source", "Customer", "Email", "Phone", "WhatsApp", "Location", "Project type", "SQM", "Estimated value (MWK)", "Site visit requested"];
  const lines = rows.map((l) =>
    [
      l.reference,
      l.quoteNumber,
      new Date(l.createdAt).toISOString(),
      LEAD_STATUS_LABELS[l.status],
      LEAD_SOURCE_LABELS[l.source],
      l.customerName,
      l.customerEmail,
      l.customerPhone,
      l.customerWhatsapp,
      l.location,
      l.projectType,
      l.squareMetres,
      l.estimatedValue,
      l.siteVisitRequested ? "Yes" : "No",
    ]
      .map(cell)
      .join(","),
  );
  await audit(await getDb(), { actorUserId: user.id, action: "leads.exported", entityType: "lead", details: { count: rows.length, filters: { ...filters } } });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${[header.map(cell).join(","), ...lines].join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mozaik-leads-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
