/**
 * Google Sheet export of downloaded quotations: one row per quotation,
 * resilient to Google failures, and correct requests to the Sheets API.
 */
import { generateKeyPairSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL = "pglite:memory";
process.env.EMAIL_TRANSPORT = "file";
process.env.SEED_PORTFOLIO = "false";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "integration-test-password";

const { getDb, closeDb } = await import("@/lib/db");
const schema = await import("@/lib/db/schema");
const { createQuotation } = await import("@/lib/services/quotations");
const { recordQuotationDownload, quotationSheetRow, SHEET_HEADER } = await import("@/lib/services/quotation-sheet");
const { appendSheetRow, contactSheetsConfig, resetSheetsTokenCache, sheetsConfig } = await import("@/lib/google/sheets");
const { contactSheetRow, recordContactSubmission, CONTACT_SHEET_HEADER } = await import("@/lib/services/contact-sheet");
const { quotationRequestSchema } = await import("@/lib/validation/schemas");

const config = { clientEmail: "robot@test.iam.gserviceaccount.com", privateKey: "unused", spreadsheetId: "sheet-123" };

async function newQuotation() {
  return createQuotation(
    quotationRequestSchema.parse({
      idempotencyKey: crypto.randomUUID(),
      squareMetres: 150,
      options: { includeLandscaping: true, sitePreparation: false, removalOfExistingPaving: false, drainage: false },
      customer: { fullName: "Chikondi Banda", email: "chikondi@example.com", phone: "0999 123 456", whatsapp: "0888 111 222" },
      project: { location: "Area 43, Lilongwe" },
    }),
  );
}

async function reload(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.quotations).where(eq(schema.quotations.id, id));
  return row;
}

afterAll(async () => {
  await closeDb();
});

describe("recordQuotationDownload", () => {
  it("writes the customer, total square metres and total amount", async () => {
    const { quotation, customer } = await newQuotation();
    const row = quotationSheetRow(quotation, customer, new Date("2026-10-12T12:05:00Z"));
    expect(SHEET_HEADER).toHaveLength(row.length);
    expect(row).toEqual([
      "2026-10-12 14:05", // Malawi time
      quotation.quoteNumber,
      "Chikondi Banda",
      "chikondi@example.com",
      "+265999123456",
      "+265888111222",
      "Area 43, Lilongwe",
      150,
      10_397_500,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ]);
  });

  it("adds exactly one row however many times the PDF is downloaded", async () => {
    const { quotation, customer } = await newQuotation();
    const append = vi.fn().mockResolvedValue(undefined);

    const results = await Promise.all([
      recordQuotationDownload(quotation, customer, { config, append }),
      recordQuotationDownload(quotation, customer, { config, append }),
      recordQuotationDownload(quotation, customer, { config, append }),
    ]);
    expect(results.filter((r) => r === "exported")).toHaveLength(1);
    expect(results.filter((r) => r === "already_exported")).toHaveLength(2);
    expect(await recordQuotationDownload(quotation, customer, { config, append })).toBe("already_exported");
    expect(append).toHaveBeenCalledTimes(1);

    const saved = await reload(quotation.id);
    expect(saved.downloadedAt).toBeInstanceOf(Date);
    expect(saved.sheetExportedAt).toBeInstanceOf(Date);
  });

  it("retries on the next download when Google rejects the write, without ever throwing", async () => {
    const { quotation, customer } = await newQuotation();
    const failing = vi.fn().mockRejectedValue(new Error("Google Sheets: The caller does not have permission"));
    expect(await recordQuotationDownload(quotation, customer, { config, append: failing })).toBe("failed");
    expect((await reload(quotation.id)).sheetExportedAt).toBeNull();
    expect((await reload(quotation.id)).downloadedAt).toBeInstanceOf(Date);

    const working = vi.fn().mockResolvedValue(undefined);
    expect(await recordQuotationDownload(quotation, customer, { config, append: working })).toBe("exported");
    expect(working).toHaveBeenCalledTimes(1);
  });

  it("still records the download when the sheet is not configured", async () => {
    const { quotation, customer } = await newQuotation();
    const append = vi.fn();
    expect(await recordQuotationDownload(quotation, customer, { config: null, append })).toBe("not_configured");
    expect(append).not.toHaveBeenCalled();
    const saved = await reload(quotation.id);
    expect(saved.downloadedAt).toBeInstanceOf(Date);
    expect(saved.sheetExportedAt).toBeNull();
  });
});

describe("Google Sheets client", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  const live = { clientEmail: "robot@test.iam.gserviceaccount.com", privateKey, spreadsheetId: "sheet-123", tab: "Quotes 2026" };

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSheetsTokenCache();
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    delete process.env.GOOGLE_SHEET_ID;
    delete process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  });

  function stubGoogle(firstCell: unknown[][] | undefined) {
    const calls: { url: string; method: string; body?: string; auth?: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({ url: String(url), method: init.method ?? "GET", body: init.body?.toString(), auth: headers.Authorization });
      if (String(url).includes("oauth2.googleapis.com")) return Response.json({ access_token: "token-abc", expires_in: 3600 });
      if ((init.method ?? "GET") === "GET") return Response.json(firstCell ? { values: firstCell } : {});
      return Response.json({ updates: { updatedRows: 1 } });
    });
    return calls;
  }

  it("signs in as the service account and writes the heading row to an empty sheet", async () => {
    const calls = stubGoogle(undefined);
    await appendSheetRow(live, ["Name", "Total"], ["=HYPERLINK(1)", 10_397_500]);

    const [signIn, read, append] = calls;
    expect(signIn.url).toBe("https://oauth2.googleapis.com/token");
    expect(signIn.body).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");
    expect(read.auth).toBe("Bearer token-abc");
    expect(decodeURIComponent(read.url)).toContain("/spreadsheets/sheet-123/values/'Quotes 2026'!A1:A1");

    expect(append.method).toBe("POST");
    expect(append.url).toContain("valueInputOption=RAW"); // text can never run as a formula
    expect(JSON.parse(append.body!)).toEqual({ values: [["Name", "Total"], ["=HYPERLINK(1)", 10_397_500]] });
  });

  it("appends only the data row when the sheet already has headings, reusing the sign-in", async () => {
    const calls = stubGoogle([["Name"]]);
    await appendSheetRow(live, ["Name", "Total"], ["A", 1]);
    await appendSheetRow(live, ["Name", "Total"], ["B", 2]);
    expect(calls.filter((c) => c.url.includes("oauth2")).length).toBe(1);
    const appends = calls.filter((c) => c.method === "POST" && c.url.includes(":append"));
    expect(appends.map((a) => JSON.parse(a.body!).values)).toEqual([[["A", 1]], [["B", 2]]]);
  });

  it("reports Google's error message", async () => {
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("oauth2")
        ? Response.json({ access_token: "t", expires_in: 3600 })
        : Response.json({ error: { message: "The caller does not have permission" } }, { status: 403 }),
    );
    await expect(appendSheetRow(live, ["Name"], ["A"])).rejects.toThrow("The caller does not have permission");
  });

  it("is off until all three settings are present, and accepts a one-line key", () => {
    expect(sheetsConfig()).toBeNull();
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "robot@test.iam.gserviceaccount.com";
    process.env.GOOGLE_SHEET_ID = "sheet-123";
    expect(sheetsConfig()).toBeNull();
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = '"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"';
    expect(sheetsConfig()?.privateKey).toBe("-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n");
  });

  it("keeps the Get in Touch sheet settings separate from the quotation sheet", () => {
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL = "forms@test.iam.gserviceaccount.com";
    process.env.GOOGLE_SHEETS_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n";
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-456";
    expect(sheetsConfig()).toBeNull();
    expect(contactSheetsConfig()).toMatchObject({ clientEmail: "forms@test.iam.gserviceaccount.com", spreadsheetId: "sheet-456" });
    expect(contactSheetsConfig()?.privateKey).toBe("-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n");
  });

  it("builds the Get in Touch row and never throws when Google fails", async () => {
    const input = {
      fullName: "=Tamanda Phiri",
      email: "t@example.com",
      phone: "+265999000111",
      location: "Area 10, Lilongwe",
      squareMetres: 120,
      availableDate: "2026-11-02",
      availableTime: "morning" as const,
    };
    const row = contactSheetRow(input, "MP-L-TEST", new Date("2026-10-12T12:05:00Z"));
    expect(row).toEqual(["2026-10-12 14:05", "MP-L-TEST", "=Tamanda Phiri", "t@example.com", "+265999000111", "Area 10, Lilongwe", 120, "2026-11-02", "Morning"]);
    expect(row).toHaveLength(CONTACT_SHEET_HEADER.length);
    expect(contactSheetRow({ ...input, squareMetres: undefined }, "MP-L-TEST", new Date())[6]).toBe("");

    expect(await recordContactSubmission(input, "MP-L-TEST", { config: null })).toBe("not_configured");
    const sent: unknown[] = [];
    expect(await recordContactSubmission(input, "MP-L-TEST", { config, append: async (_c, _h, r) => void sent.push(r) })).toBe("exported");
    expect(sent).toHaveLength(1);
    const failing = async () => {
      throw new Error("Google is down");
    };
    expect(await recordContactSubmission(input, "MP-L-TEST", { config, append: failing })).toBe("failed");
  });
});
