/** Every customer email carries a hidden copy to the owner's inbox. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { clientCopyRecipients, sendEmail } from "@/lib/email";

describe("hidden copy of customer emails", () => {
  afterEach(() => {
    delete process.env.CLIENT_EMAIL_BCC;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("copies lnkhoma@gmail.com by default", () => {
    expect(clientCopyRecipients("chikondi@example.com")).toEqual(["lnkhoma@gmail.com"]);
  });

  it("does not copy the customer to themselves", () => {
    expect(clientCopyRecipients("LNKhoma@gmail.com")).toEqual([]);
  });

  it("can be changed or switched off", () => {
    process.env.CLIENT_EMAIL_BCC = "sales@mozaikpavers.com, lnkhoma@gmail.com";
    expect(clientCopyRecipients("chikondi@example.com")).toEqual(["sales@mozaikpavers.com", "lnkhoma@gmail.com"]);
    process.env.CLIENT_EMAIL_BCC = "none";
    expect(clientCopyRecipients("chikondi@example.com")).toEqual([]);
  });

  it("sends the copy as Bcc through Resend", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Mozaik Pavers <sales@mozaikpavers.com>");
    let payload: Record<string, unknown> = {};
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      payload = JSON.parse(String(init.body));
      return Response.json({ id: "email-1" });
    });
    const result = await sendEmail({ to: "chikondi@example.com", bcc: ["lnkhoma@gmail.com"], subject: "Hi", html: "<p>Hi</p>", text: "Hi" });
    expect(result.ok).toBe(true);
    expect(payload.to).toEqual(["chikondi@example.com"]);
    expect(payload.bcc).toEqual(["lnkhoma@gmail.com"]);
    expect(payload).not.toHaveProperty("cc");
  });
});
