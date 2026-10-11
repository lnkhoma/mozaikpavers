import { and, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import type { AnalyticsEventName } from "@/lib/validation/schemas";

export async function recordEvent(event: {
  name: AnalyticsEventName;
  sessionId?: string;
  path?: string;
  properties?: Record<string, string | number | boolean>;
}) {
  const db = await getDb();
  await db.insert(analyticsEvents).values({
    name: event.name,
    sessionId: event.sessionId ?? null,
    path: event.path ?? null,
    properties: event.properties,
  });
}

/** Visitor → engagement → quotation → site assessment funnel (unique sessions per step). */
export const FUNNEL_STEPS: { name: AnalyticsEventName; label: string }[] = [
  { name: "page_view", label: "Visitors" },
  { name: "project_viewed", label: "Viewed a project" },
  { name: "before_after_interaction", label: "Used before/after slider" },
  { name: "calculator_opened", label: "Opened calculator" },
  { name: "sqm_entered", label: "Entered SQM" },
  { name: "quotation_completed", label: "Completed quotation" },
  { name: "quotation_emailed", label: "Quotation emailed" },
  { name: "site_assessment_requested", label: "Requested site assessment" },
];

export const CONTACT_EVENTS: { name: AnalyticsEventName; label: string }[] = [
  { name: "whatsapp_clicked", label: "WhatsApp clicks" },
  { name: "phone_clicked", label: "Phone clicks" },
];

export async function funnel(range: { from?: string; to?: string }) {
  const db = await getDb();
  const conditions = [];
  if (range.from) conditions.push(gte(analyticsEvents.createdAt, new Date(`${range.from}T00:00:00+02:00`)));
  if (range.to) {
    const end = new Date(`${range.to}T00:00:00+02:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    conditions.push(lt(analyticsEvents.createdAt, end));
  }
  const rows = await db
    .select({
      name: analyticsEvents.name,
      sessions: sql<number>`count(distinct coalesce(${analyticsEvents.sessionId}, ${analyticsEvents.id}::text))`,
      events: sql<number>`count(*)`,
    })
    .from(analyticsEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(analyticsEvents.name);
  const byName = new Map(rows.map((r) => [r.name, { sessions: Number(r.sessions), events: Number(r.events) }]));
  const pick = (steps: typeof FUNNEL_STEPS) =>
    steps.map((s) => ({ ...s, sessions: byName.get(s.name)?.sessions ?? 0, events: byName.get(s.name)?.events ?? 0 }));
  return { funnel: pick(FUNNEL_STEPS), contact: pick(CONTACT_EVENTS) };
}
