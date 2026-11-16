/**
 * Site assessment requests with the database down: accepted once written to
 * the Google Sheet, linked to an offline quotation when the link is genuine.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// Nothing listens on port 1, so every database call fails straight away.
process.env.DATABASE_URL = "postgres://nobody:nothing@127.0.0.1:1/none";
process.env.EMAIL_TRANSPORT = "file";
process.env.AUTH_SECRET = "site-visit-test-secret-0123456789";

const sheet = vi.hoisted(() => ({ outcome: "exported" as "exported" | "not_configured" | "failed", calls: [] as unknown[][] }));
vi.mock("@/lib/services/site-visit-sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/site-visit-sheet")>()),
  recordSiteVisitSubmission: async (...args: unknown[]) => {
    sheet.calls.push(args);
    return sheet.outcome;
  },
}));

const { POST } = await import("@/app/api/site-visits/route");
const { createOfflineQuotation } = await import("@/lib/services/offline-quotations");
const { siteVisitSheetRow, SITE_VISIT_SHEET_HEADER } = await import("@/lib/services/site-visit-sheet");
const { quotationRequestSchema } = await import("@/lib/validation/schemas");

function submit(extra: Record<string, unknown> = {}) {
  return POST(
    new Request("http://localhost:3000/api/site-visits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", Host: "localhost:3000" },
      body: JSON.stringify({
        fullName: "Tamanda Phiri",
        email: "tamanda@example.com",
        phone: "0999 123 456",
        location: "Area 10, Lilongwe",
        projectType: "Driveway",
        squareMetres: 120,
        preferredDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        preferredTime: "morning",
        notes: "Gate on the left",
        ...extra,
      }),
    }),
  );
}

describe("site assessment without a database", () => {
  afterEach(() => {
    sheet.calls.length = 0;
    sheet.outcome = "exported";
  });

  it("accepts the request once it is written to the Google Sheet", async () => {
    const response = await submit();
    expect(response.status).toBe(201);
    const body = (await response.json()) as { reference: string; linkedQuote: string | null };
    expect(body.linkedQuote).toBeNull();
    expect(sheet.calls).toHaveLength(1);
    expect(sheet.calls[0][0]).toMatchObject({ fullName: "Tamanda Phiri", projectType: "Driveway", notes: "Gate on the left" });
    expect(sheet.calls[0][1]).toBe(body.reference);
  });

  it("links a genuine offline quotation and ignores a forged one", async () => {
    const { quotation } = createOfflineQuotation(
      quotationRequestSchema.parse({
        idempotencyKey: crypto.randomUUID(),
        squareMetres: 150,
        options: {},
        customer: { fullName: "Tamanda Phiri", email: "tamanda@example.com", phone: "0999 123 456" },
        project: { location: "Area 10, Lilongwe" },
      }),
    );
    const linked = await submit({ quoteNumber: quotation.quoteNumber, accessToken: quotation.accessToken });
    expect(linked.status).toBe(201);
    expect(((await linked.json()) as { linkedQuote: string }).linkedQuote).toBe(quotation.quoteNumber);

    const forged = await submit({ quoteNumber: "MP-Q-2026-1234567", accessToken: quotation.accessToken });
    expect(((await forged.json()) as { linkedQuote: string | null }).linkedQuote).toBeNull();
  });

  it("reports an error when the sheet is not set up either", async () => {
    sheet.outcome = "not_configured";
    expect((await submit()).status).toBe(500);
  });

  it("lays the row out under the sheet headings", () => {
    const row = siteVisitSheetRow(
      { fullName: "Tamanda Phiri", email: "t@example.com", phone: "+265999000111", location: "Area 10", preferredTime: "afternoon" },
      "L-TEST",
      null,
      new Date("2026-11-17T08:00:00Z"),
    );
    expect(row).toHaveLength(SITE_VISIT_SHEET_HEADER.length);
    expect(row.slice(0, 3)).toEqual(["2026-11-17 10:00", "L-TEST", "Tamanda Phiri"]);
    expect(row[10]).toBe("Afternoon");
  });
});
