import { NextResponse } from "next/server";
import { QUOTE_NUMBER_PATTERN } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { guardPublicPost, jsonError, readJson } from "@/lib/security/request";
import { deliverQuotationEmail, getQuotationForCustomer } from "@/lib/services/quotations";
import { resendEmailSchema } from "@/lib/validation/schemas";

/**
 * POST /api/quotations/:number/email — retry delivery of an existing
 * quotation. Never creates a new quotation.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/quotations/[number]/email">) {
  const blocked = guardPublicPost(request, "quotationEmailRetry", "quotation-email");
  if (blocked) return blocked;

  const { number } = await ctx.params;
  if (!QUOTE_NUMBER_PATTERN.test(number)) return jsonError(404, "Quotation not found.");

  let body: unknown;
  try {
    body = await readJson(request, 2048);
  } catch {
    return jsonError(400, "Invalid request.");
  }
  const parsed = resendEmailSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid request.");

  const row = await getQuotationForCustomer(number, parsed.data.accessToken);
  if (!row) return jsonError(404, "Quotation not found.");

  try {
    const delivery = await deliverQuotationEmail(row.quotation, row.customer);
    return NextResponse.json({
      ok: true,
      delivery: { status: delivery.status, ...(delivery.status === "failed" ? { canRetry: delivery.canRetry } : {}) },
    });
  } catch (error) {
    logger.error("quotation.email_retry_failed", { error, quoteNumber: number });
    return jsonError(500, "We couldn't send the email right now.");
  }
}
