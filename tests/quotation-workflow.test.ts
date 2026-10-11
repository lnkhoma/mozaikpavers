/**
 * Integration tests for the quotation workflow against a real (in-memory)
 * PostgreSQL via PGlite: server-side recalculation, numbering, idempotency,
 * pricing snapshots, lead creation, PDF generation and email delivery.
 */
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite:memory";
process.env.EMAIL_TRANSPORT = "file";
process.env.SEED_PORTFOLIO = "false";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "integration-test-password";

const { getDb, closeDb } = await import("@/lib/db");
const schema = await import("@/lib/db/schema");
const { createQuotation, deliverQuotationEmail, getQuotationForCustomer, renderQuotationPdf, MAX_EMAIL_ATTEMPTS } = await import("@/lib/services/quotations");
const { getCurrentPricing, updatePricing } = await import("@/lib/services/pricing");
const { requestSiteVisit, dashboardMetrics, updateLead, createContactLead } = await import("@/lib/services/leads");
const { calculateQuotation } = await import("@/lib/pricing/engine");
const { quotationRequestSchema } = await import("@/lib/validation/schemas");

const outbox = path.join(process.cwd(), ".data", "test-outbox");
process.env.EMAIL_OUTBOX_DIR = outbox;

function request(overrides: Record<string, unknown> = {}) {
  return quotationRequestSchema.parse({
    idempotencyKey: crypto.randomUUID(),
    squareMetres: 150,
    options: { includeLandscaping: true, sitePreparation: false, removalOfExistingPaving: false, drainage: false },
    customer: { fullName: "Chikondi Banda", email: "Chikondi@Example.com", phone: "0999 123 456" },
    project: { location: "Area 43, Lilongwe", projectType: "Driveway" },
    ...overrides,
  });
}

let adminId: string;

beforeAll(async () => {
  const db = await getDb();
  const [admin] = await db.select().from(schema.users).limit(1);
  adminId = admin.id;
});

afterAll(async () => {
  await closeDb();
});

describe("quotation workflow", () => {
  it("normalises input: lower-cased email and +265 phone", () => {
    const r = request();
    expect(r.customer.email).toBe("chikondi@example.com");
    expect(r.customer.phone).toBe("+265999123456");
  });

  it("creates a quotation with a server-calculated total, snapshot, items and lead", async () => {
    const outcome = await createQuotation(request());
    const q = outcome.quotation;
    expect(outcome.created).toBe(true);
    expect(q.quoteNumber).toMatch(/^MP-Q-\d{4}-00001$/);
    expect(q.grandTotal).toBe(10_847_500);
    expect(q.pricingVersion).toBe(1);
    expect(q.pricingSnapshot.paverPricePerSqm).toBe(50_000);

    const db = await getDb();
    const items = await db.select().from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, q.id));
    expect(items).toHaveLength(9);
    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.quotationId, q.id));
    expect(lead.status).toBe("new");
    expect(lead.estimatedValue).toBe(10_847_500);
    expect(lead.source).toBe("online_quotation");
  });

  it("issues sequential quote numbers", async () => {
    const a = await createQuotation(request());
    const b = await createQuotation(request());
    const seq = (n: string) => Number(n.split("-").pop());
    expect(seq(b.quotation.quoteNumber)).toBe(seq(a.quotation.quoteNumber) + 1);
  });

  it("never creates a duplicate for a retried submission", async () => {
    const body = request();
    const [first, second] = await Promise.all([createQuotation(body), createQuotation(body)]);
    expect(second.quotation.id).toBe(first.quotation.id);
    const db = await getDb();
    const rows = await db.select().from(schema.quotations).where(eq(schema.quotations.idempotencyKey, body.idempotencyKey));
    expect(rows).toHaveLength(1);
  });

  it("keeps old quotations reproducible after a pricing change", async () => {
    const before = await createQuotation(request());
    const current = await getCurrentPricing();
    const version = await updatePricing({ ...current.values, paverPricePerSqm: 55_000 }, { actorUserId: adminId, changeNote: "test" });
    expect(version).toBe(current.version + 1);

    const after = await createQuotation(request());
    expect(after.quotation.pricingVersion).toBe(version);
    expect(after.quotation.grandTotal).toBe(10_847_500 + 150 * 5_000);

    // The earlier quotation still reproduces exactly from its own snapshot.
    const old = before.quotation;
    expect(calculateQuotation(old.squareMetres, old.pricingSnapshot, old.options).grandTotal).toBe(old.grandTotal);
    expect(old.grandTotal).toBe(10_847_500);

    await updatePricing(current.values, { actorUserId: adminId, changeNote: "restore" });
  });

  it("renders a PDF from the stored snapshot", async () => {
    const { quotation, customer } = await createQuotation(request());
    const pdf = await renderQuotationPdf(quotation, customer);
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(3000);
  });

  it("emails the quotation with the PDF attached and records success", async () => {
    await rm(outbox, { recursive: true, force: true });
    const { quotation, customer } = await createQuotation(request());
    const result = await deliverQuotationEmail(quotation, customer);
    expect(result.status).toBe("sent");
    const files = await readdir(outbox);
    expect(files.some((f) => f.endsWith(`${quotation.quoteNumber}.pdf`))).toBe(true);
    const db = await getDb();
    const [row] = await db.select().from(schema.quotations).where(eq(schema.quotations.id, quotation.id));
    expect(row.emailStatus).toBe("sent");
    expect(row.emailAttempts).toBe(1);
  });

  it("records a failed delivery and caps retries", async () => {
    const { quotation, customer } = await createQuotation(request());
    process.env.EMAIL_SIMULATE_FAILURE = "true";
    try {
      let last;
      for (let i = 0; i < MAX_EMAIL_ATTEMPTS; i++) last = await deliverQuotationEmail(quotation, customer);
      expect(last).toMatchObject({ status: "failed", canRetry: false });
      const extra = await deliverQuotationEmail(quotation, customer);
      expect(extra).toMatchObject({ status: "failed", canRetry: false });
      const db = await getDb();
      const [row] = await db.select().from(schema.quotations).where(eq(schema.quotations.id, quotation.id));
      expect(row.emailStatus).toBe("failed");
      expect(row.emailAttempts).toBe(MAX_EMAIL_ATTEMPTS);
    } finally {
      delete process.env.EMAIL_SIMULATE_FAILURE;
    }
  });

  it("only exposes a quotation with the correct access token", async () => {
    const { quotation } = await createQuotation(request());
    expect(await getQuotationForCustomer(quotation.quoteNumber, quotation.accessToken)).not.toBeNull();
    expect(await getQuotationForCustomer(quotation.quoteNumber, "x".repeat(quotation.accessToken.length))).toBeNull();
  });

  it("links a site assessment request to the quotation lead", async () => {
    const { quotation, leadId } = await createQuotation(request());
    const res = await requestSiteVisit(
      { quoteNumber: quotation.quoteNumber, accessToken: quotation.accessToken, fullName: "Chikondi Banda", email: "chikondi@example.com", phone: "+265999123456", location: "Area 43, Lilongwe", preferredTime: "morning" },
      {},
    );
    expect(res.leadId).toBe(leadId);
    expect(res.linkedQuote).toBe(quotation.quoteNumber);
    const db = await getDb();
    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId));
    expect(lead.siteVisitRequested).toBe(true);
  });

  it("reports dashboard metrics", async () => {
    const { leadId } = await createQuotation(request({ squareMetres: 49 }));
    await updateLead(leadId, { status: "won" }, { actorUserId: adminId });
    const m = await dashboardMetrics({});
    expect(m.totalQuotations).toBeGreaterThan(5);
    expect(m.won).toBe(1);
    expect(m.conversionRate).toBeGreaterThan(0);
    const filtered = await dashboardMetrics({ status: "won" });
    expect(filtered.totalLeads).toBe(1);
    expect(filtered.totalSqm).toBe(49);
  });

  it("turns a get-in-touch request into a lead with a site visit at the customer's availability", async () => {
    const lead = await createContactLead(
      { fullName: "Grace Phiri", email: "grace@example.com", phone: "+265993000111", location: "Area 49, Lilongwe", squareMetres: 120, availableDate: "2026-12-01", availableTime: "afternoon" },
      {},
    );
    const db = await getDb();
    const [row] = await db.select().from(schema.leads).where(eq(schema.leads.id, lead.id));
    expect(row).toMatchObject({ source: "contact_form", location: "Area 49, Lilongwe", squareMetres: 120, siteVisitRequested: true });
    const visits = await db.select().from(schema.siteVisitRequests).where(eq(schema.siteVisitRequests.leadId, lead.id));
    expect(visits).toHaveLength(1);
    expect(visits[0]).toMatchObject({ preferredDate: "2026-12-01", preferredTime: "afternoon", status: "requested" });
  });
});
