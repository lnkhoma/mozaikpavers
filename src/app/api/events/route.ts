import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { clientIp, isSameOrigin } from "@/lib/security/request";
import { recordEvent } from "@/lib/services/analytics";
import { analyticsEventSchema } from "@/lib/validation/schemas";

/**
 * POST /api/events — first-party conversion analytics (sent with
 * navigator.sendBeacon). Always answers 204 so tracking never affects the UX.
 */
export async function POST(request: Request) {
  const noContent = new Response(null, { status: 204 });
  if (!isSameOrigin(request)) return noContent;
  if (!rateLimit(`events:${clientIp(request.headers)}`, LIMITS.analytics.limit, LIMITS.analytics.windowMs).ok) return noContent;
  if (/bot|crawler|spider|crawling|headless/i.test(request.headers.get("user-agent") ?? "")) return noContent;

  try {
    const text = await request.text();
    if (text.length > 4096) return noContent;
    const parsed = analyticsEventSchema.safeParse(JSON.parse(text));
    if (parsed.success) await recordEvent(parsed.data);
  } catch {
    // ignore malformed events
  }
  return noContent;
}
