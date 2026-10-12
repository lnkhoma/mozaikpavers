/**
 * Get in Touch with the database down: the enquiry must still be accepted
 * when it reaches the Google Sheet, and rejected when it reaches neither.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// Nothing listens on port 1, so every database call fails straight away.
process.env.DATABASE_URL = "postgres://nobody:nothing@127.0.0.1:1/none";
process.env.EMAIL_TRANSPORT = "file";

const sheet = vi.hoisted(() => ({ outcome: "exported" as "exported" | "not_configured" | "failed", calls: [] as unknown[][] }));
vi.mock("@/lib/services/contact-sheet", () => ({
  recordContactSubmission: async (...args: unknown[]) => {
    sheet.calls.push(args);
    return sheet.outcome;
  },
}));

const { POST } = await import("@/app/api/contact/route");

function submit() {
  return POST(
    new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", Host: "localhost:3000" },
      body: JSON.stringify({
        fullName: "Tamanda Phiri",
        email: "tamanda@example.com",
        phone: "0999 123 456",
        location: "Area 10, Lilongwe",
        squareMetres: 120,
        availableDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        availableTime: "morning",
      }),
    }),
  );
}

describe("Get in Touch without a database", () => {
  afterEach(() => {
    sheet.calls.length = 0;
  });

  it("accepts the enquiry once it is written to the Google Sheet", async () => {
    sheet.outcome = "exported";
    const response = await submit();
    expect(response.status).toBe(201);
    const body = (await response.json()) as { ok: boolean; reference: string };
    expect(body.ok).toBe(true);
    expect(sheet.calls).toHaveLength(1);
    expect(sheet.calls[0][0]).toMatchObject({ fullName: "Tamanda Phiri", location: "Area 10, Lilongwe", squareMetres: 120 });
    expect(sheet.calls[0][1]).toBe(body.reference);
  });

  it("reports an error when the sheet is not set up either", async () => {
    sheet.outcome = "not_configured";
    expect((await submit()).status).toBe(500);
  });
});
