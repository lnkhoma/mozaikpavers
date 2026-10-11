import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/lib/logger";

export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * EMAIL_TRANSPORT:
 *   resend → deliver through Resend (requires RESEND_API_KEY, EMAIL_FROM)
 *   file   → write the message to .data/outbox (local development only)
 * Defaults to resend when RESEND_API_KEY is set, file in development,
 * and refuses to pretend success in production without a provider.
 */
function transport(): "resend" | "file" | "none" {
  const configured = process.env.EMAIL_TRANSPORT?.trim();
  if (configured === "resend" || configured === "file") return configured;
  if (process.env.RESEND_API_KEY) return "resend";
  return process.env.NODE_ENV === "production" ? "none" : "file";
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const mode = transport();
  try {
    if (mode === "resend") return await sendWithResend(message);
    if (mode === "file") return await writeToOutbox(message);
    return { ok: false, error: "No email provider configured (set RESEND_API_KEY)." };
  } catch (error) {
    logger.error("email.send_failed", { error, subject: message.subject });
    return { ok: false, error: error instanceof Error ? error.message : "Unknown email error" };
  }
}

async function sendWithResend(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: "RESEND_API_KEY and EMAIL_FROM must be set." };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
        content_type: a.contentType,
      })),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !body.id) {
    const error = body.message ?? `Resend responded with HTTP ${response.status}`;
    logger.warn("email.provider_rejected", { status: response.status, error });
    return { ok: false, error };
  }
  return { ok: true, id: body.id };
}

async function writeToOutbox(message: EmailMessage): Promise<SendResult> {
  if (process.env.EMAIL_SIMULATE_FAILURE === "true") {
    return { ok: false, error: "Simulated email failure (EMAIL_SIMULATE_FAILURE=true)." };
  }
  const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.EMAIL_OUTBOX_DIR ?? ".data/outbox");
  await mkdir(dir, { recursive: true });
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(path.join(dir, `${id}.html`), `<!-- To: ${message.to}\n     Subject: ${message.subject} -->\n${message.html}`);
  for (const a of message.attachments ?? []) {
    await writeFile(path.join(dir, `${id}-${a.filename}`), a.content);
  }
  logger.info("email.written_to_outbox", { id, to: message.to, subject: message.subject });
  return { ok: true, id: `outbox:${id}` };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
