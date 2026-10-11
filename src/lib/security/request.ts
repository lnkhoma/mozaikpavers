import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "./rate-limit";

/** Client IP from the reverse proxy (first hop of x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * CSRF defence for JSON route handlers: the request must come from our own
 * origin. (Server Actions get the equivalent check from Next.js itself.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(status: number, message: string, extra: Record<string, unknown> = {}, headers?: HeadersInit) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status, headers });
}

/** Common guard for public POST endpoints: origin, content type, rate limit. */
export function guardPublicPost(request: Request, policy: keyof typeof LIMITS, scope: string): NextResponse | null {
  if (!isSameOrigin(request)) return jsonError(403, "Request blocked.");
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return jsonError(415, "Expected JSON.");
  }
  const { limit, windowMs } = LIMITS[policy];
  const rl = rateLimit(`${scope}:${clientIp(request.headers)}`, limit, windowMs);
  if (!rl.ok) {
    return jsonError(429, "Too many requests. Please wait a few minutes and try again, or contact us directly.", {}, { "Retry-After": String(rl.retryAfterSeconds) });
  }
  return null;
}

/** Reads JSON with a size cap so oversized bodies are rejected early. */
export async function readJson(request: Request, maxBytes = 32 * 1024): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("Payload too large");
  return JSON.parse(text);
}

/**
 * Bot heuristics: a filled honeypot or an implausibly fast submission is
 * treated as spam. The caller should respond as if successful-but-ignored
 * only for honeypots; too-fast submissions get a soft error.
 */
export function botVerdict(bot: { website?: string; elapsedMs?: number } | undefined): "ok" | "honeypot" | "too_fast" {
  if (bot?.website) return "honeypot";
  if (typeof bot?.elapsedMs === "number" && bot.elapsedMs < 2500) return "too_fast";
  return "ok";
}
