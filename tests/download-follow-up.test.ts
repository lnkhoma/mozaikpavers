/**
 * The first time a customer downloads their quotation they receive a
 * follow-up email with the PDF attached; later downloads send nothing.
 */
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

delete process.env.DATABASE_URL;
process.env.AUTH_SECRET = "download-follow-up-test-secret-0123456789";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ recorded: new Set<string>(), sent: [] as { to: string; bcc?: string[]; subject: string; text: string; attachments?: { filename: string }[] }[] }));
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  sendEmail: async (message: (typeof state.sent)[number]) => (state.sent.push(message), { ok: true, id: "test" }),
}));
vi.mock("@/lib/services/offline-quotations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/offline-quotations")>()),
  // Stands in for the Google Sheet: "exported" the first time, then "already_exported".
  recordOfflineQuotationDownload: async (quotation: { quoteNumber: string }) =>
    state.recorded.has(quotation.quoteNumber) ? "already_exported" : (state.recorded.add(quotation.quoteNumber), "exported"),
}));
const deferred = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => void deferred.push(task),
}));

const { GET } = await import("@/app/api/quotations/[number]/pdf/route");
const { createOfflineQuotation } = await import("@/lib/services/offline-quotations");
const { quotationRequestSchema } = await import("@/lib/validation/schemas");

async function download(number: string, token: string) {
  deferred.length = 0;
  const url = `http://localhost:3000/api/quotations/${number}/pdf?token=${encodeURIComponent(token)}&download=1`;
  const response = await GET(new NextRequest(url), { params: Promise.resolve({ number }) } as never);
  for (const task of deferred) await task();
  return response;
}

describe("follow-up email after downloading a quotation", () => {
  it("emails the customer once, with the PDF attached", async () => {
    const { quotation } = createOfflineQuotation(
      quotationRequestSchema.parse({
        idempotencyKey: crypto.randomUUID(),
        squareMetres: 150,
        options: {},
        customer: { fullName: "Chikondi Banda", email: "chikondi@example.com", phone: "0999 123 456" },
        project: { location: "Area 43, Lilongwe" },
      }),
    );

    const first = await download(quotation.quoteNumber, quotation.accessToken);
    expect(first.headers.get("Content-Disposition")).toContain("attachment");
    expect(state.sent).toHaveLength(1);
    const [mail] = state.sent;
    expect(mail.to).toBe("chikondi@example.com");
    expect(mail.bcc).toEqual(["lnkhoma@gmail.com"]);
    expect(mail.subject).toBe(`Thank you for downloading your Mozaik Pavers quotation – ${quotation.quoteNumber}`);
    expect(mail.text).toContain("Dear Chikondi,");
    expect(mail.text).toContain("K10,397,500");
    expect(mail.attachments?.[0].filename).toBe(`Mozaik-Pavers-${quotation.quoteNumber}.pdf`);

    await download(quotation.quoteNumber, quotation.accessToken);
    expect(state.sent).toHaveLength(1);
  });
});
