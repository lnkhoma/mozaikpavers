import { after, NextResponse } from "next/server";
import { newLeadReference } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { botVerdict, clientIp, guardPublicPost, jsonError, readJson } from "@/lib/security/request";
import { recordContactSubmission } from "@/lib/services/contact-sheet";
import { createContactLead } from "@/lib/services/leads";
import { contactSchema, fieldErrors } from "@/lib/validation/schemas";

/** POST /api/contact — general enquiry; becomes a lead. */
export async function POST(request: Request) {
  const blocked = guardPublicPost(request, "publicForm", "contact");
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid request.");
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  if (botVerdict(parsed.data.bot) !== "ok") return jsonError(400, "We couldn't process this request. Please try again in a moment.");

  const { bot: _bot, ...input } = parsed.data;
  try {
    const lead = await createContactLead(input, { ipAddress: clientIp(request.headers) });
    after(() => recordContactSubmission(input, lead.reference));
    return NextResponse.json({ ok: true, reference: lead.reference }, { status: 201 });
  } catch (error) {
    logger.error("contact.create_failed", { error });
  }

  // The database is unavailable. The enquiry still counts as received if it
  // reaches the Google Sheet, so wait for that write before answering.
  const reference = newLeadReference();
  if ((await recordContactSubmission(input, reference)) === "exported") {
    return NextResponse.json({ ok: true, reference }, { status: 201 });
  }
  return jsonError(500, "Something went wrong. Please try again or call us.");
}
