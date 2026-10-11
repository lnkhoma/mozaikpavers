import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { botVerdict, clientIp, guardPublicPost, jsonError, readJson } from "@/lib/security/request";
import { requestSiteVisit } from "@/lib/services/leads";
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

  try {
    const { bot: _bot, ...input } = parsed.data;
    const result = await requestSiteVisit(input, { ipAddress: clientIp(request.headers) });
    return NextResponse.json({ ok: true, reference: result.reference, linkedQuote: result.linkedQuote }, { status: 201 });
  } catch (error) {
    logger.error("site_visit.request_failed", { error });
    return jsonError(500, "Something went wrong. Please try again or call us.");
  }
}
