/**
 * Quotations with the database down: the customer still gets a quotation and
 * its PDF, links reveal no personal details, and a download is written to the
 * Google Sheet once.
 */
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Nothing listens on port 1, so every database call fails straight away.
process.env.DATABASE_URL = "postgres://nobody:nothing@127.0.0.1:1/none";
process.env.EMAIL_TRANSPORT = "file";
process.env.AUTH_SECRET = "offline-quotation-test-secret-0123456789";

vi.mock("server-only", () => ({}));
const deferred = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => void deferred.push(task),
}));

const { POST } = await import("@/app/api/quotations/route");
const { GET } = await import("@/app/api/quotations/[number]/pdf/route");
const { getOfflineQuotation, recordOfflineQuotationDownload } = await import("@/lib/services/offline-quotations");

const config = { clientEmail: "robot@test.iam.gserviceaccount.com", privateKey: "unused", spreadsheetId: "sheet-123" };

function requestQuote(idempotencyKey: string) {
  return POST(
    new Request("http://localhost:3000/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", Host: "localhost:3000" },
      body: JSON.stringify({
        idempotencyKey,
        squareMetres: 150,
        options: { includeCompaction: true, includeLandscaping: true, sitePreparation: false, removalOfExistingPaving: false, drainage: false },
        customer: { fullName: "Chikondi Banda", email: "chikondi@example.com", phone: "0999 123 456" },
        project: { location: "Area 43, Lilongwe" },
      }),
    }),
  );
}

function download(number: string, token: string) {
  const url = `http://localhost:3000/api/quotations/${number}/pdf?token=${encodeURIComponent(token)}`;
  return GET(new NextRequest(url), { params: Promise.resolve({ number }) } as never);
}

type Issued = { quoteNumber: string; accessToken: string; grandTotal: number; delivery: { status: string; canRetry?: boolean } };

describe("quotations without a database", () => {
  const key = crypto.randomUUID();

  it("issues the quotation with the usual total", async () => {
    const response = await requestQuote(key);
    expect(response.status).toBe(201);
    const body = (await response.json()) as Issued;
    expect(body.quoteNumber).toMatch(/^MP-Q-\d{4}-\d{7}$/);
    expect(body.grandTotal).toBe(10_397_500);
    expect(body.accessToken.startsWith("o1.")).toBe(true);
    // Personal details are encrypted, not just encoded.
    expect(Buffer.from(body.accessToken.slice(3), "base64url").toString("latin1")).not.toContain("chikondi");
    expect(body.delivery.canRetry ?? false).toBe(false);
  });

  it("gives a retried submission the same quotation number", async () => {
    const a = (await (await requestQuote(key)).json()) as Issued;
    const b = (await (await requestQuote(key)).json()) as Issued;
    expect(a.quoteNumber).toBe(b.quoteNumber);
  });

  it("serves the PDF from the token and refuses altered or mismatched links", async () => {
    const issued = (await (await requestQuote(crypto.randomUUID())).json()) as Issued;
    deferred.length = 0;

    const ok = await download(issued.quoteNumber, issued.accessToken);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toBe("application/pdf");
    expect(Buffer.from(await ok.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
    expect(deferred).toHaveLength(1); // the Google Sheet write, after the response

    const flipped = issued.accessToken.slice(0, -2) + (issued.accessToken.endsWith("A") ? "BB" : "AA");
    expect((await download(issued.quoteNumber, flipped)).status).toBe(404);
    expect((await download("MP-Q-2026-1234567", issued.accessToken)).status).toBe(404);
  });

  it("writes a download to the sheet only once", async () => {
    const issued = (await (await requestQuote(crypto.randomUUID())).json()) as Issued;
    const found = getOfflineQuotation(issued.quoteNumber, issued.accessToken)!;
    const sheet: string[][] = [["Quotation No."]];
    const deps = {
      config,
      readColumn: async () => sheet.map((r) => r[0]),
      append: async (_c: unknown, _h: unknown, row: (string | number)[]) => void sheet.push([String(row[1])]),
    };
    expect(await recordOfflineQuotationDownload(found.quotation, found.customer, deps)).toBe("exported");
    expect(await recordOfflineQuotationDownload(found.quotation, found.customer, deps)).toBe("already_exported");
    expect(sheet).toHaveLength(2);
    expect(await recordOfflineQuotationDownload(found.quotation, found.customer, { config: null })).toBe("not_configured");
  });
});
