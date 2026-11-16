import { after, NextResponse } from "next/server";
import { databaseConfigured } from "@/lib/db";
import { newLeadReference } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { botVerdict, clientIp, guardPublicPost, jsonError, readJson } from "@/lib/security/request";
import { requestSiteVisit } from "@/lib/services/leads";
import { getOfflineQuotation, isOfflineToken } from "@/lib/services/offline-quotations";
import { recordSiteVisitSubmission } from "@/lib/services/site-visit-sheet";
import { fieldErrors, siteVisitRequestSchema } from "@/lib/validation/schemas";

/** POST /api/site-visits — request a site assessment. */
export async function POST(request: Request) {
  const blocked = guardPublicPost(request, "publicForm", "site-visit");
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid request.");
  }
  const parsed = siteVisitRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  if (botVerdict(parsed.data.bot) !== "ok") return jsonError(400, "We couldn't process this request. Please try again in a moment.");

  const { bot: _bot, ...input } = parsed.data;
  if (databaseConfigured()) {
    try {
      const result = await requestSiteVisit(input, { ipAddress: clientIp(request.headers) });
      after(() => recordSiteVisitSubmission(input, result.reference, result.linkedQuote));
      return NextResponse.json({ ok: true, reference: result.reference, linkedQuote: result.linkedQuote }, { status: 201 });
    } catch (error) {
      logger.error("site_visit.request_failed", { error });
    }
  }

  // No database (or it is unavailable): the request counts as received once it is on the Google Sheet.
  const reference = newLeadReference();
  const linkedQuote =
    input.quoteNumber && isOfflineToken(input.accessToken) && getOfflineQuotation(input.quoteNumber, input.accessToken)
      ? input.quoteNumber
      : null;
  if ((await recordSiteVisitSubmission(input, reference, linkedQuote)) === "exported") {
    return NextResponse.json({ ok: true, reference, linkedQuote }, { status: 201 });
  }
  return jsonError(500, "Something went wrong. Please try again or call us.");
}
