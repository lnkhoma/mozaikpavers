"use client";

import type { AnalyticsEventName } from "@/lib/validation/schemas";

const SESSION_KEY = "mp_sid";

function sessionId(): string | undefined {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** Fire-and-forget first-party analytics. Never throws, never blocks. */
export function track(name: AnalyticsEventName, properties?: Record<string, string | number | boolean>) {
  try {
    const body = JSON.stringify({ name, sessionId: sessionId(), path: location.pathname.slice(0, 300), properties });
    const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/events", new Blob([body], { type: "text/plain" }));
    if (!sent) void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
  } catch {
    // analytics must never break the page
  }
}

/** Track an event once per page load (e.g. first slider drag). */
const seen = new Set<string>();
export function trackOnce(key: string, name: AnalyticsEventName, properties?: Record<string, string | number | boolean>) {
  if (seen.has(key)) return;
  seen.add(key);
  track(name, properties);
}
