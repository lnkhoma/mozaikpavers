import { and, asc, eq, sql } from "drizzle-orm";
import { company } from "@/config/company";
import { getDb, type Executor } from "@/lib/db";
import {
  customers,
  leads,
  quotationItems,
  quotations,
  quoteCounters,
  type Customer,
  type Quotation,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { newLeadNotificationEmail, quotationEmail } from "@/lib/email/templates";
import { addDaysIso, formatQuoteNumber, malawiDate, newAccessToken, newLeadReference, tokensMatch } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { buildQuotationPdf, type QuotationPdfData } from "@/lib/pdf/quotation-pdf";
import { calculateQuotation } from "@/lib/pricing/engine";
import type { QuotationRequest } from "@/lib/validation/schemas";
import { audit } from "./audit";
import { getCurrentPricing } from "./pricing";

/** Emails per quotation (first send + retries) before we ask the customer to call. */
export const MAX_EMAIL_ATTEMPTS = 5;

export interface QuotationOutcome {
  quotation: Quotation;
  customer: Customer;
  leadId: string;
  /** false when an earlier submission with the same idempotency key was returned. */
  created: boolean;
}

export function quotationLinks(q: Pick<Quotation, "quoteNumber" | "accessToken">) {
  const base = company.siteUrl;
  const params = new URLSearchParams({ token: q.accessToken });
  return {
    downloadUrl: `${base}/api/quotations/${q.quoteNumber}/pdf?${params}`,
    siteAssessmentUrl: `${base}/site-assessment?${new URLSearchParams({ quote: q.quoteNumber, token: q.accessToken })}`,
  };
}

/** Customers are matched on email + phone; otherwise a new record is created. */
async function upsertCustomer(tx: Executor, input: QuotationRequest["customer"]): Promise<Customer> {
  const [existing] = await tx
    .select()
    .from(customers)
    .where(and(sql`lower(${customers.email}) = ${input.email.toLowerCase()}`, eq(customers.phone, input.phone)))
    .limit(1);
  if (existing) {
    const [updated] = await tx
      .update(customers)
      .set({ fullName: input.fullName, whatsapp: input.whatsapp ?? existing.whatsapp, updatedAt: new Date() })
      .where(eq(customers.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await tx
    .insert(customers)
    .values({ fullName: input.fullName, email: input.email, phone: input.phone, whatsapp: input.whatsapp ?? null })
    .returning();
  return created;
}

async function nextQuoteNumber(tx: Executor, year: number): Promise<string> {
  // Atomic per-year sequence; safe under concurrent submissions.
  const [row] = await tx
    .insert(quoteCounters)
    .values({ year, lastSeq: 1 })
    .onConflictDoUpdate({ target: quoteCounters.year, set: { lastSeq: sql`${quoteCounters.lastSeq} + 1` } })
    .returning({ seq: quoteCounters.lastSeq });
  return formatQuoteNumber(year, row.seq);
}

async function findByIdempotencyKey(db: Executor, key: string) {
  const [row] = await db
    .select({ quotation: quotations, customer: customers, leadId: leads.id })
    .from(quotations)
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .leftJoin(leads, eq(leads.quotationId, quotations.id))
    .where(eq(quotations.idempotencyKey, key))
    .limit(1);
  return row ?? null;
}

/**
 * Steps 6–7 & 10 of the quotation workflow: recalculate on the server with
 * the current pricing, save the quotation with a pricing snapshot, and create
 * the lead. Submitting the same idempotency key again returns the original.
 */
export async function createQuotation(
  input: QuotationRequest,
  ctx: { ipAddress?: string | null } = {},
): Promise<QuotationOutcome> {
  const db = await getDb();

  const existing = await findByIdempotencyKey(db, input.idempotencyKey);
  if (existing) {
    return { quotation: existing.quotation, customer: existing.customer, leadId: existing.leadId ?? "", created: false };
  }

  try {
    return await db.transaction(async (tx) => {
      const pricing = await getCurrentPricing(tx);
      // Never trust browser totals: recompute from the area and options only.
      const result = calculateQuotation(input.squareMetres, pricing.values, input.options);
      const today = malawiDate();

      const customer = await upsertCustomer(tx, input.customer);
      const quoteNumber = await nextQuoteNumber(tx, today.year);

      const [quotation] = await tx
        .insert(quotations)
        .values({
          quoteNumber,
          customerId: customer.id,
          idempotencyKey: input.idempotencyKey,
          accessToken: newAccessToken(),
          squareMetres: result.squareMetres,
          options: {
            includeLandscaping: input.options.includeLandscaping,
            sitePreparation: input.options.sitePreparation,
            removalOfExistingPaving: input.options.removalOfExistingPaving,
            drainage: input.options.drainage,
            otherRequirements: input.options.otherRequirements ?? "",
          },
          projectLocation: input.project.location,
          projectType: input.project.projectType ?? null,
          paverStyle: input.project.paverStyle ?? null,
          expectedStartDate: input.project.expectedStartDate ?? null,
          notes: input.project.notes ?? null,
          pricingVersion: pricing.version,
          pricingSnapshot: pricing.values,
          result,
          grandTotal: result.grandTotal,
          validUntil: addDaysIso(today.iso, pricing.values.quoteValidityDays),
        })
        .returning();

      await tx.insert(quotationItems).values(
        result.lines.map((l, position) => ({
          quotationId: quotation.id,
          position,
          code: l.code,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          amount: l.amount,
          note: l.note ?? null,
        })),
      );

      const [lead] = await tx
        .insert(leads)
        .values({
          reference: newLeadReference(),
          customerId: customer.id,
          quotationId: quotation.id,
          source: "online_quotation",
          status: "new",
          location: input.project.location,
          projectType: input.project.projectType ?? null,
          squareMetres: result.squareMetres,
          estimatedValue: result.grandTotal,
          message: input.project.notes ?? null,
        })
        .returning({ id: leads.id });

      await audit(tx, {
        action: "quotation.created",
        entityType: "quotation",
        entityId: quotation.id,
        details: { quoteNumber, total: result.grandTotal, pricingVersion: pricing.version },
        ipAddress: ctx.ipAddress,
      });

      logger.info("quotation.created", { quoteNumber, total: result.grandTotal, sqm: result.squareMetres });
      return { quotation, customer, leadId: lead.id, created: true };
    });
  } catch (error) {
    // Two identical submissions raced: the loser returns the winner's quotation.
    const raced = await findByIdempotencyKey(db, input.idempotencyKey);
    if (raced) {
      return { quotation: raced.quotation, customer: raced.customer, leadId: raced.leadId ?? "", created: false };
    }
    throw error;
  }
}

export function pdfDataFor(quotation: Quotation, customer: Customer): QuotationPdfData {
  return {
    quoteNumber: quotation.quoteNumber,
    issuedAt: quotation.createdAt,
    validUntil: quotation.validUntil,
    pricingVersion: quotation.pricingVersion,
    customer: { fullName: customer.fullName, email: customer.email, phone: customer.phone, whatsapp: customer.whatsapp },
    project: {
      location: quotation.projectLocation,
      projectType: quotation.projectType,
      paverStyle: quotation.paverStyle,
      expectedStartDate: quotation.expectedStartDate,
      notes: quotation.notes,
    },
    // The stored result is the snapshot taken at generation time.
    result: quotation.result,
    pricing: quotation.pricingSnapshot,
  };
}

export async function renderQuotationPdf(quotation: Quotation, customer: Customer): Promise<Uint8Array> {
  return buildQuotationPdf(pdfDataFor(quotation, customer));
}

export type DeliveryResult =
  | { status: "sent" }
  | { status: "failed"; error: string; canRetry: boolean };

/** Steps 8–9: build the PDF and email it. Records the outcome on the quotation. */
export async function deliverQuotationEmail(quotation: Quotation, customer: Customer): Promise<DeliveryResult> {
  const db = await getDb();

  if (quotation.emailAttempts >= MAX_EMAIL_ATTEMPTS) {
    return { status: "failed", error: "Too many delivery attempts.", canRetry: false };
  }

  // Reserve an attempt atomically so concurrent retries cannot exceed the cap.
  const [reserved] = await db
    .update(quotations)
    .set({ emailAttempts: sql`${quotations.emailAttempts} + 1` })
    .where(and(eq(quotations.id, quotation.id), sql`${quotations.emailAttempts} < ${MAX_EMAIL_ATTEMPTS}`))
    .returning({ attempts: quotations.emailAttempts });
  if (!reserved) return { status: "failed", error: "Too many delivery attempts.", canRetry: false };

  let pdf: Uint8Array;
  try {
    pdf = await renderQuotationPdf(quotation, customer);
  } catch (error) {
    logger.error("quotation.pdf_failed", { error, quoteNumber: quotation.quoteNumber });
    await db.update(quotations).set({ emailStatus: "failed", emailLastError: "PDF generation failed" }).where(eq(quotations.id, quotation.id));
    return { status: "failed", error: "We could not generate the PDF.", canRetry: reserved.attempts < MAX_EMAIL_ATTEMPTS };
  }

  const links = quotationLinks(quotation);
  const email = quotationEmail({
    quoteNumber: quotation.quoteNumber,
    customerName: customer.fullName,
    squareMetres: quotation.squareMetres,
    grandTotal: quotation.grandTotal,
    validUntil: quotation.validUntil,
    hasItemsSubjectToAssessment: quotation.result.hasItemsSubjectToAssessment,
    ...links,
  });

  const sent = await sendEmail({
    to: customer.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: company.email,
    attachments: [{ filename: `Mozaik-Pavers-${quotation.quoteNumber}.pdf`, content: pdf, contentType: "application/pdf" }],
  });

  if (sent.ok) {
    await db
      .update(quotations)
      .set({ emailStatus: "sent", emailSentAt: new Date(), emailLastError: null })
      .where(eq(quotations.id, quotation.id));
    logger.info("quotation.emailed", { quoteNumber: quotation.quoteNumber, attempt: reserved.attempts });
    return { status: "sent" };
  }

  await db
    .update(quotations)
    .set({ emailStatus: "failed", emailLastError: sent.error.slice(0, 500) })
    .where(eq(quotations.id, quotation.id));
  logger.warn("quotation.email_failed", { quoteNumber: quotation.quoteNumber, attempt: reserved.attempts, error: sent.error });
  return { status: "failed", error: sent.error, canRetry: reserved.attempts < MAX_EMAIL_ATTEMPTS };
}

/** Internal heads-up to the sales inbox. Best effort; never blocks the customer. */
export async function notifySalesOfQuotation(outcome: QuotationOutcome): Promise<void> {
  const to = process.env.SALES_NOTIFICATION_EMAIL?.trim();
  if (!to || !outcome.created) return;
  const [lead] = await (await getDb()).select({ reference: leads.reference }).from(leads).where(eq(leads.id, outcome.leadId));
  const mail = newLeadNotificationEmail({
    kind: `online quotation ${outcome.quotation.quoteNumber}`,
    reference: lead?.reference ?? outcome.quotation.quoteNumber,
    customerName: outcome.customer.fullName,
    email: outcome.customer.email,
    phone: outcome.customer.phone,
    location: outcome.quotation.projectLocation,
    squareMetres: outcome.quotation.squareMetres,
    estimatedValue: outcome.quotation.grandTotal,
    message: outcome.quotation.notes,
    adminUrl: `${company.siteUrl}/admin/leads/${outcome.leadId}`,
  });
  const result = await sendEmail({ to, ...mail });
  if (!result.ok) logger.warn("sales_notification.failed", { error: result.error });
}

/** Look up a quotation with the customer's secret token (constant-time compare). */
export async function getQuotationForCustomer(quoteNumber: string, accessToken: string) {
  const db = await getDb();
  const [row] = await db
    .select({ quotation: quotations, customer: customers, leadId: leads.id })
    .from(quotations)
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .leftJoin(leads, eq(leads.quotationId, quotations.id))
    .where(eq(quotations.quoteNumber, quoteNumber))
    .limit(1);
  if (!row || !tokensMatch(row.quotation.accessToken, accessToken)) return null;
  return row;
}

export async function getQuotationItems(quotationId: string) {
  const db = await getDb();
  return db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId)).orderBy(asc(quotationItems.position));
}
