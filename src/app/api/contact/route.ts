import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { botVerdict, clientIp, guardPublicPost, jsonError, readJson } from "@/lib/security/request";
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

  try {
    const { bot: _bot, ...input } = parsed.data;
    const lead = await createContactLead(input, { ipAddress: clientIp(request.headers) });
    return NextResponse.json({ ok: true, reference: lead.reference }, { status: 201 });
  } catch (error) {
    logger.error("contact.create_failed", { error });
    return jsonError(500, "Something went wrong. Please try again or call us.");
  }
}
