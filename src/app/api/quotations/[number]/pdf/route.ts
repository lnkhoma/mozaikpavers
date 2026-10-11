import type { NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { customers, quotations } from "@/lib/db/schema";
import { QUOTE_NUMBER_PATTERN } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { clientIp, jsonError } from "@/lib/security/request";
import { getQuotationForCustomer, renderQuotationPdf } from "@/lib/services/quotations";
import { eq } from "drizzle-orm";

/**
 * GET /api/quotations/:number/pdf?token=…
 * Customers use their secret token; signed-in staff can open any quotation.
 * The PDF is rebuilt from the stored snapshot, so it never changes.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/quotations/[number]/pdf">) {
  const { number } = await ctx.params;
  if (!QUOTE_NUMBER_PATTERN.test(number)) return jsonError(404, "Quotation not found.");

  const rl = rateLimit(`pdf:${clientIp(request.headers)}`, LIMITS.pdfDownload.limit, LIMITS.pdfDownload.windowMs);
  if (!rl.ok) return jsonError(429, "Too many requests.", {}, { "Retry-After": String(rl.retryAfterSeconds) });

  const token = request.nextUrl.searchParams.get("token");
  let row = token ? await getQuotationForCustomer(number, token) : null;

  if (!row && (await getAdminUser())) {
    const db = await getDb();
    const [found] = await db
      .select({ quotation: quotations, customer: customers })
      .from(quotations)
      .innerJoin(customers, eq(customers.id, quotations.customerId))
      .where(eq(quotations.quoteNumber, number))
      .limit(1);
    row = found ? { ...found, leadId: null } : null;
  }
  if (!row) return jsonError(404, "Quotation not found.");

  try {
    const pdf = await renderQuotationPdf(row.quotation, row.customer);
    const download = request.nextUrl.searchParams.get("download") === "1";
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Mozaik-Pavers-${number}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error("quotation.pdf_render_failed", { error, quoteNumber: number });
    return jsonError(500, "Could not generate the PDF.");
  }
}
