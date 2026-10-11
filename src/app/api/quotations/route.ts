import { after, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { QuotationInputError } from "@/lib/pricing/engine";
import { botVerdict, clientIp, guardPublicPost, jsonError, readJson } from "@/lib/security/request";
import { createQuotation, deliverQuotationEmail, notifySalesOfQuotation } from "@/lib/services/quotations";
import { fieldErrors, quotationRequestSchema } from "@/lib/validation/schemas";

/**
 * POST /api/quotations
 * Validates input, recalculates server-side, saves the quotation + lead,
 * generates the PDF and emails it. Safe to retry with the same idempotencyKey.
 */
export async function POST(request: Request) {
  const blocked = guardPublicPost(request, "quotation", "quotation");
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid request.");
  }

  const parsed = quotationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }

  const verdict = botVerdict(parsed.data.bot);
  if (verdict !== "ok") {
    logger.warn("quotation.bot_blocked", { verdict, ip: clientIp(request.headers) });
    return jsonError(400, "We couldn't process this request. Please try again in a moment.");
  }

  try {
    const outcome = await createQuotation(parsed.data, { ipAddress: clientIp(request.headers) });
    const { quotation, customer } = outcome;

    // Re-submitting an already-emailed quotation must not send it twice.
    const delivery =
      quotation.emailStatus === "sent" && !outcome.created
        ? ({ status: "sent" } as const)
        : await deliverQuotationEmail(quotation, customer);

    if (outcome.created) {
      // Internal notification runs after the response so the customer never waits on it.
      after(() => notifySalesOfQuotation(outcome).catch((error) => logger.warn("sales_notification.error", { error })));
    }

    return NextResponse.json(
      {
        ok: true,
        quoteNumber: quotation.quoteNumber,
        accessToken: quotation.accessToken,
        customerName: customer.fullName,
        customerEmail: customer.email,
        squareMetres: quotation.squareMetres,
        grandTotal: quotation.grandTotal,
        validUntil: quotation.validUntil,
        result: quotation.result,
        delivery: {
          status: delivery.status,
          ...(delivery.status === "failed" ? { canRetry: delivery.canRetry } : {}),
        },
      },
      { status: outcome.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof QuotationInputError) return jsonError(422, error.message);
    logger.error("quotation.create_failed", { error });
    return jsonError(500, "Something went wrong while generating your quotation. Please try again.");
  }
}
