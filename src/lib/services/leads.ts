import { and, count, desc, eq, gte, ilike, lt, sql, type SQL } from "drizzle-orm";
import { company } from "@/config/company";
import { getDb, type Executor } from "@/lib/db";
import {
  customers,
  leads,
  quotations,
  siteVisitRequests,
  PROJECT_SIZE_BUCKETS,
  type LeadSource,
  type LeadStatus,
  type ProjectSizeBucket,
  type SiteVisitStatus,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { newLeadNotificationEmail } from "@/lib/email/templates";
import { newLeadReference } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { audit } from "./audit";
import { getQuotationForCustomer } from "./quotations";

export interface LeadFilters {
  from?: string; // YYYY-MM-DD inclusive
  to?: string; // YYYY-MM-DD inclusive
  location?: string;
  status?: LeadStatus;
  projectType?: string;
  size?: ProjectSizeBucket;
  q?: string;
}

function whereFor(f: LeadFilters): SQL | undefined {
  const conditions: SQL[] = [];
  // Dates are interpreted in Malawi time (UTC+2).
  if (f.from) conditions.push(gte(leads.createdAt, new Date(`${f.from}T00:00:00+02:00`)));
  if (f.to) {
    const end = new Date(`${f.to}T00:00:00+02:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    conditions.push(lt(leads.createdAt, end));
  }
  if (f.location) conditions.push(ilike(leads.location, `%${escapeLike(f.location)}%`));
  if (f.status) conditions.push(eq(leads.status, f.status));
  if (f.projectType) conditions.push(eq(leads.projectType, f.projectType));
  if (f.size) {
    const b = PROJECT_SIZE_BUCKETS[f.size];
    conditions.push(gte(leads.squareMetres, b.min), lt(leads.squareMetres, b.max));
  }
  if (f.q) {
    const term = `%${escapeLike(f.q)}%`;
    conditions.push(
      sql`(${customers.fullName} ilike ${term} or ${customers.email} ilike ${term} or ${customers.phone} ilike ${term} or ${leads.reference} ilike ${term} or ${quotations.quoteNumber} ilike ${term})`,
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listLeads(filters: LeadFilters, page = 1, pageSize = 25) {
  const db = await getDb();
  const where = whereFor(filters);
  const base = db
    .select({
      id: leads.id,
      reference: leads.reference,
      status: leads.status,
      source: leads.source,
      location: leads.location,
      projectType: leads.projectType,
      squareMetres: leads.squareMetres,
      estimatedValue: leads.estimatedValue,
      siteVisitRequested: leads.siteVisitRequested,
      createdAt: leads.createdAt,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerWhatsapp: customers.whatsapp,
      quoteNumber: quotations.quoteNumber,
    })
    .from(leads)
    .innerJoin(customers, eq(customers.id, leads.customerId))
    .leftJoin(quotations, eq(quotations.id, leads.quotationId));

  const [rows, [{ total }]] = await Promise.all([
    base.where(where).orderBy(desc(leads.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(leads)
      .innerJoin(customers, eq(customers.id, leads.customerId))
      .leftJoin(quotations, eq(quotations.id, leads.quotationId))
      .where(where),
  ]);
  return { rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getLead(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ lead: leads, customer: customers, quotation: quotations })
    .from(leads)
    .innerJoin(customers, eq(customers.id, leads.customerId))
    .leftJoin(quotations, eq(quotations.id, leads.quotationId))
    .where(eq(leads.id, id))
    .limit(1);
  if (!row) return null;
  const visits = await db
    .select()
    .from(siteVisitRequests)
    .where(eq(siteVisitRequests.leadId, id))
    .orderBy(desc(siteVisitRequests.createdAt));
  return { ...row, visits };
}

export async function updateLead(
  id: string,
  data: { status: LeadStatus; adminNotes?: string },
  ctx: { actorUserId: string; ipAddress?: string | null },
) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(leads).where(eq(leads.id, id)).for("update");
    if (!before) throw new Error("Lead not found");
    const statusChanged = before.status !== data.status;
    await tx
      .update(leads)
      .set({
        status: data.status,
        adminNotes: data.adminNotes ?? null,
        updatedAt: new Date(),
        ...(statusChanged ? { statusChangedAt: new Date() } : {}),
      })
      .where(eq(leads.id, id));
    await audit(tx, {
      actorUserId: ctx.actorUserId,
      action: statusChanged ? "lead.status_changed" : "lead.updated",
      entityType: "lead",
      entityId: id,
      details: statusChanged ? { from: before.status, to: data.status } : { notesUpdated: true },
      ipAddress: ctx.ipAddress,
    });
  });
}

export async function updateSiteVisit(
  id: string,
  data: { status: SiteVisitStatus; scheduledFor?: Date | null },
  ctx: { actorUserId: string; ipAddress?: string | null },
) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [visit] = await tx
      .update(siteVisitRequests)
      .set({ status: data.status, scheduledFor: data.scheduledFor ?? null, updatedAt: new Date() })
      .where(eq(siteVisitRequests.id, id))
      .returning();
    if (!visit) throw new Error("Site visit not found");
    // Keep the pipeline in step with the visit.
    const leadStatus: LeadStatus | null =
      data.status === "scheduled" ? "site_visit_scheduled" : data.status === "completed" ? "site_assessed" : null;
    if (leadStatus) {
      await tx
        .update(leads)
        .set({ status: leadStatus, statusChangedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(leads.id, visit.leadId), sql`${leads.status} in ('new','contacted','site_visit_scheduled')`));
    }
    await audit(tx, {
      actorUserId: ctx.actorUserId,
      action: "site_visit.updated",
      entityType: "site_visit",
      entityId: id,
      details: { status: data.status, scheduledFor: data.scheduledFor?.toISOString() },
      ipAddress: ctx.ipAddress,
    });
  });
}

/* ------------------------------------------------------------------ */
/* Public intake: contact form & site-assessment requests              */
/* ------------------------------------------------------------------ */

async function findOrCreateCustomer(
  db: Executor,
  input: { fullName: string; email: string; phone: string; whatsapp?: string },
) {
  const [existing] = await db
    .select()
    .from(customers)
    .where(and(sql`lower(${customers.email}) = ${input.email.toLowerCase()}`, eq(customers.phone, input.phone)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(customers)
    .values({ fullName: input.fullName, email: input.email, phone: input.phone, whatsapp: input.whatsapp ?? null })
    .returning();
  return created;
}

async function notifySales(kind: string, lead: { id: string; reference: string }, d: Omit<Parameters<typeof newLeadNotificationEmail>[0], "kind" | "reference" | "adminUrl">) {
  const to = process.env.SALES_NOTIFICATION_EMAIL?.trim();
  if (!to) return;
  const mail = newLeadNotificationEmail({ ...d, kind, reference: lead.reference, adminUrl: `${company.siteUrl}/admin/leads/${lead.id}` });
  const result = await sendEmail({ to, ...mail });
  if (!result.ok) logger.warn("sales_notification.failed", { error: result.error });
}

const TIME_LABELS = { morning: "morning", afternoon: "afternoon", any: "any time" } as const;

export interface ContactLeadInput {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  squareMetres?: number;
  availableDate: string;
  availableTime: "morning" | "afternoon" | "any";
}

/**
 * "Get in touch" form: creates the lead and a site-visit request for the
 * customer's availability, so it appears in the dashboard's request list.
 */
export async function createContactLead(input: ContactLeadInput, ctx: { ipAddress?: string | null }) {
  const db = await getDb();
  const availability = `Available to meet on site: ${input.availableDate} (${TIME_LABELS[input.availableTime]})`;
  const lead = await db.transaction(async (tx) => {
    const customer = await findOrCreateCustomer(tx, input);
    const [created] = await tx
      .insert(leads)
      .values({
        reference: newLeadReference(),
        customerId: customer.id,
        source: "contact_form" satisfies LeadSource,
        location: input.location,
        squareMetres: input.squareMetres ?? null,
        message: availability,
        siteVisitRequested: true,
      })
      .returning({ id: leads.id, reference: leads.reference });
    await tx.insert(siteVisitRequests).values({
      leadId: created.id,
      location: input.location,
      preferredDate: input.availableDate,
      preferredTime: input.availableTime,
    });
    await audit(tx, { action: "lead.created", entityType: "lead", entityId: created.id, details: { source: "contact_form" }, ipAddress: ctx.ipAddress });
    return created;
  });
  void notifySales("get-in-touch request", lead, {
    customerName: input.fullName,
    email: input.email,
    phone: input.phone,
    location: input.location,
    squareMetres: input.squareMetres,
    message: availability,
  });
  return lead;
}

export interface SiteVisitInput {
  quoteNumber?: string;
  accessToken?: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  location: string;
  projectType?: string;
  squareMetres?: number;
  preferredDate?: string;
  preferredTime: "morning" | "afternoon" | "any";
  notes?: string;
}

/**
 * Converts a quotation lead into a site-visit request, or — without a valid
 * quotation link — creates a fresh lead from the assessment form.
 */
export async function requestSiteVisit(input: SiteVisitInput, ctx: { ipAddress?: string | null }) {
  const db = await getDb();
  const linked =
    input.quoteNumber && input.accessToken ? await getQuotationForCustomer(input.quoteNumber, input.accessToken) : null;

  return db.transaction(async (tx) => {
    let leadId: string;
    let reference: string;
    let quotationId: string | null = null;

    if (linked?.leadId) {
      leadId = linked.leadId;
      quotationId = linked.quotation.id;
      const [l] = await tx
        .update(leads)
        .set({ siteVisitRequested: true, updatedAt: new Date() })
        .where(eq(leads.id, leadId))
        .returning({ reference: leads.reference });
      reference = l.reference;
    } else {
      const customer = await findOrCreateCustomer(tx, input);
      const [l] = await tx
        .insert(leads)
        .values({
          reference: newLeadReference(),
          customerId: customer.id,
          source: "site_assessment_form",
          location: input.location,
          projectType: input.projectType ?? null,
          squareMetres: input.squareMetres ?? null,
          message: input.notes ?? null,
          siteVisitRequested: true,
        })
        .returning({ id: leads.id, reference: leads.reference });
      leadId = l.id;
      reference = l.reference;
    }

    const [visit] = await tx
      .insert(siteVisitRequests)
      .values({
        leadId,
        quotationId,
        location: input.location,
        preferredDate: input.preferredDate ?? null,
        preferredTime: input.preferredTime,
        notes: input.notes ?? null,
      })
      .returning({ id: siteVisitRequests.id });

    await audit(tx, {
      action: "site_visit.requested",
      entityType: "site_visit",
      entityId: visit.id,
      details: { leadId, quoteNumber: linked?.quotation.quoteNumber },
      ipAddress: ctx.ipAddress,
    });

    void notifySales("site assessment request", { id: leadId, reference }, {
      customerName: input.fullName,
      email: input.email,
      phone: input.phone,
      location: input.location,
      squareMetres: linked?.quotation.squareMetres ?? input.squareMetres,
      estimatedValue: linked?.quotation.grandTotal,
      message: [input.preferredDate && `Preferred date: ${input.preferredDate} (${input.preferredTime})`, input.notes].filter(Boolean).join("\n"),
    });

    return { leadId, reference, linkedQuote: linked?.quotation.quoteNumber ?? null };
  });
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export async function dashboardMetrics(filters: LeadFilters) {
  const db = await getDb();
  const where = whereFor(filters);
  const num = (v: unknown) => Number(v ?? 0);

  const [totals] = await db
    .select({
      leads: count(),
      quotations: sql<number>`count(${leads.quotationId})`,
      newLeads: sql<number>`count(*) filter (where ${leads.status} = 'new')`,
      won: sql<number>`count(*) filter (where ${leads.status} = 'won')`,
      lost: sql<number>`count(*) filter (where ${leads.status} = 'lost')`,
      totalSqm: sql<string>`coalesce(sum(${quotations.squareMetres}), 0)`,
      quotedValue: sql<string>`coalesce(sum(${quotations.grandTotal}), 0)`,
      avgQuote: sql<string>`coalesce(avg(${quotations.grandTotal}), 0)`,
      pipelineValue: sql<string>`coalesce(sum(${leads.estimatedValue}) filter (where ${leads.status} not in ('won','lost')), 0)`,
      wonValue: sql<string>`coalesce(sum(${leads.estimatedValue}) filter (where ${leads.status} = 'won'), 0)`,
      siteVisits: sql<number>`count(*) filter (where ${leads.siteVisitRequested})`,
    })
    .from(leads)
    .innerJoin(customers, eq(customers.id, leads.customerId))
    .leftJoin(quotations, eq(quotations.id, leads.quotationId))
    .where(where);

  const byStatus = await db
    .select({ status: leads.status, n: count() })
    .from(leads)
    .innerJoin(customers, eq(customers.id, leads.customerId))
    .leftJoin(quotations, eq(quotations.id, leads.quotationId))
    .where(where)
    .groupBy(leads.status);

  const byLocation = await db
    .select({ location: sql<string>`coalesce(nullif(trim(${leads.location}), ''), 'Unspecified')`, n: count(), value: sql<string>`coalesce(sum(${leads.estimatedValue}), 0)` })
    .from(leads)
    .innerJoin(customers, eq(customers.id, leads.customerId))
    .leftJoin(quotations, eq(quotations.id, leads.quotationId))
    .where(where)
    .groupBy(sql`1`)
    .orderBy(desc(count()))
    .limit(8);

  const won = num(totals.won);
  const lost = num(totals.lost);
  const leadsTotal = num(totals.leads);
  return {
    totalLeads: leadsTotal,
    totalQuotations: num(totals.quotations),
    newLeads: num(totals.newLeads),
    won,
    lost,
    totalSqm: num(totals.totalSqm),
    quotedValue: num(totals.quotedValue),
    averageQuote: Math.round(num(totals.avgQuote)),
    pipelineValue: num(totals.pipelineValue),
    wonValue: num(totals.wonValue),
    siteVisitRequests: num(totals.siteVisits),
    /** Won ÷ all leads in the period. */
    conversionRate: leadsTotal ? won / leadsTotal : 0,
    /** Won ÷ (won + lost): win rate on decided leads. */
    winRate: won + lost ? won / (won + lost) : 0,
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Partial<Record<LeadStatus, number>>,
    byLocation: byLocation.map((r) => ({ location: r.location, count: r.n, value: num(r.value) })),
  };
}

export async function distinctLeadValues() {
  const db = await getDb();
  const types = await db
    .selectDistinct({ v: leads.projectType })
    .from(leads)
    .where(sql`${leads.projectType} is not null`)
    .orderBy(leads.projectType);
  return { projectTypes: types.map((t) => t.v!).filter(Boolean) };
}

export async function recentSiteVisits(limit = 6) {
  const db = await getDb();
  return db
    .select({
      id: siteVisitRequests.id,
      leadId: siteVisitRequests.leadId,
      location: siteVisitRequests.location,
      preferredDate: siteVisitRequests.preferredDate,
      preferredTime: siteVisitRequests.preferredTime,
      status: siteVisitRequests.status,
      createdAt: siteVisitRequests.createdAt,
      customerName: customers.fullName,
      customerPhone: customers.phone,
    })
    .from(siteVisitRequests)
    .innerJoin(leads, eq(leads.id, siteVisitRequests.leadId))
    .innerJoin(customers, eq(customers.id, leads.customerId))
    .where(eq(siteVisitRequests.status, "requested"))
    .orderBy(desc(siteVisitRequests.createdAt))
    .limit(limit);
}
