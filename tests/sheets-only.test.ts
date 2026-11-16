/**
 * With no DATABASE_URL the website keeps no database: every form saves to
 * Google Sheets and nothing ever opens a database connection.
 */
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

delete process.env.DATABASE_URL;
process.env.EMAIL_TRANSPORT = "file";
process.env.AUTH_SECRET = "sheets-only-test-secret-0123456789";

vi.mock("server-only", () => ({}));
const calls = vi.hoisted(() => ({ db: 0, contact: [] as unknown[][], siteVisit: [] as unknown[][], download: [] as unknown[][] }));
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb: async () => {
    calls.db++;
    throw new Error("the database must not be used");
  },
}));
vi.mock("@/lib/services/contact-sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/contact-sheet")>()),
  recordContactSubmission: async (...args: unknown[]) => (calls.contact.push(args), "exported"),
}));
vi.mock("@/lib/services/site-visit-sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/site-visit-sheet")>()),
  recordSiteVisitSubmission: async (...args: unknown[]) => (calls.siteVisit.push(args), "exported"),
}));
const deferred = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => void deferred.push(task),
}));

const quotations = await import("@/app/api/quotations/route");
const pdf = await import("@/app/api/quotations/[number]/pdf/route");
const contact = await import("@/app/api/contact/route");
const siteVisits = await import("@/app/api/site-visits/route");
const health = await import("@/app/api/health/route");
const { getPublicPricing, getPublishedProjects } = await import("@/lib/public-data");

const headers = { "Content-Type": "application/json", Origin: "http://localhost:3000", Host: "localhost:3000" };
const post = (url: string, body: unknown) => new Request(`http://localhost:3000${url}`, { method: "POST", headers, body: JSON.stringify(body) });
const nextWeek = () => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
const customer = { fullName: "Tamanda Phiri", email: "tamanda@example.com", phone: "0999 123 456" };

describe("Google Sheets only (no DATABASE_URL)", () => {
  afterEach(() => {
    expect(calls.db).toBe(0);
  });

  it("issues a quotation and serves its PDF without a database", async () => {
    const res = await quotations.POST(post("/api/quotations", { idempotencyKey: crypto.randomUUID(), squareMetres: 150, options: {}, customer, project: { location: "Area 10, Lilongwe" } }));
    expect(res.status).toBe(201);
    const q = (await res.json()) as { quoteNumber: string; accessToken: string; grandTotal: number };
    expect(q.accessToken.startsWith("o1.")).toBe(true);
    expect(q.grandTotal).toBe(10_397_500);

    deferred.length = 0;
    const url = `http://localhost:3000/api/quotations/${q.quoteNumber}/pdf?token=${encodeURIComponent(q.accessToken)}`;
    const file = await pdf.GET(new NextRequest(url), { params: Promise.resolve({ number: q.quoteNumber }) } as never);
    expect(file.status).toBe(200);
    expect(deferred).toHaveLength(1); // the Google Sheet write

    // A database-style link cannot be looked up without a database.
    const old = new NextRequest(`http://localhost:3000/api/quotations/MP-Q-2026-00001/pdf?token=abcdefghijklmnopqrstuvwx`);
    expect((await pdf.GET(old, { params: Promise.resolve({ number: "MP-Q-2026-00001" }) } as never)).status).toBe(404);
  });

  it("saves Get in Touch and site assessment requests to the sheets", async () => {
    const c = await contact.POST(post("/api/contact", { ...customer, location: "Area 10, Lilongwe", availableDate: nextWeek(), availableTime: "morning" }));
    expect(c.status).toBe(201);
    expect(calls.contact).toHaveLength(1);

    const s = await siteVisits.POST(post("/api/site-visits", { ...customer, location: "Area 10, Lilongwe", preferredTime: "any" }));
    expect(s.status).toBe(201);
    expect(calls.siteVisit).toHaveLength(1);
  });

  it("shows built-in content and rates on public pages", async () => {
    const pricing = await getPublicPricing();
    expect(pricing.values.compactionPricePerDay).toBe(450_000);
    expect((await getPublishedProjects()).length).toBeGreaterThan(0);
  });

  it("reports Google Sheets only on the health check", async () => {
    const res = await health.GET(new Request("http://localhost:3000/api/health"));
    const body = (await res.json()) as { storage: string; database: { ok?: boolean } };
    expect(body.storage).toBe("Google Sheets only");
    expect(body.database.ok).toBeUndefined();
  });
});
