import { describe, expect, it } from "vitest";
import { formatKwacha } from "@/lib/format";
import { areaSchema, contactSchema, emailSchema, phoneSchema, quotationRequestSchema } from "./schemas";

describe("phoneSchema", () => {
  it.each([
    ["0999 123 456", "+265999123456"],
    ["0888-123-456", "+265888123456"],
    ["+265 999 123 456", "+265999123456"],
    ["265999123456", "+265999123456"],
    ["00265 999 123 456", "+265999123456"],
    ["0111 234 567", "+265111234567"],
    ["+27 82 123 4567", "+27821234567"],
  ])("accepts %s", (input, expected) => {
    expect(phoneSchema.parse(input)).toBe(expected);
  });

  it.each(["", "12345", "phone", "+1", "0999 123"])("rejects %s", (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("lower-cases and trims", () => expect(emailSchema.parse("  Info@Mozaik.MW ")).toBe("info@mozaik.mw"));
  it.each(["", "nope", "a@b", "a b@c.com"])("rejects %s", (e) => expect(emailSchema.safeParse(e).success).toBe(false));
});

describe("areaSchema", () => {
  it("coerces strings and rounds to 2 decimals", () => expect(areaSchema.parse("150.456")).toBe(150.46));
  it.each([0, -1, 100_001, "abc"])("rejects %s", (a) => expect(areaSchema.safeParse(a).success).toBe(false));
});

describe("quotationRequestSchema", () => {
  const base = {
    idempotencyKey: "4b9f3c1e-2d7a-4e1b-9c3d-5a6b7c8d9e0f",
    squareMetres: 120,
    options: { includeLandscaping: true, sitePreparation: false, removalOfExistingPaving: false, drainage: false },
    customer: { fullName: "  Thandi   Phiri ", email: "thandi@example.com", phone: "0999123456", whatsapp: "" },
    project: { location: "Blantyre", projectType: "", expectedStartDate: "" },
  };

  it("needs only the essential fields", () => {
    const r = quotationRequestSchema.parse(base);
    expect(r.customer.fullName).toBe("Thandi Phiri");
    expect(r.customer.whatsapp).toBeUndefined();
    expect(r.project.projectType).toBeUndefined();
  });

  it("ignores any client-supplied totals", () => {
    const r = quotationRequestSchema.parse({ ...base, grandTotal: 1 }) as Record<string, unknown>;
    expect(r.grandTotal).toBeUndefined();
  });

  it("requires location", () => {
    expect(quotationRequestSchema.safeParse({ ...base, project: { location: "" } }).success).toBe(false);
  });

  it("strips control characters from free text", () => {
    const r = quotationRequestSchema.parse({ ...base, project: { location: "Area\u0000 9" } });
    expect(r.project.location).toBe("Area 9");
  });
});

describe("formatKwacha", () => {
  it("uses K prefix and thousands separators", () => {
    expect(formatKwacha(5_000_000)).toBe("K5,000,000");
    expect(formatKwacha(10_847_500)).toBe("K10,847,500");
    expect(formatKwacha(850)).toBe("K850");
  });
});

describe("contactSchema (get in touch)", () => {
  const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const base = { fullName: "Grace Phiri", email: "grace@example.com", phone: "0993 000 111", location: "Area 49, Lilongwe", availableDate: future };

  it("needs name, email, phone, location and an availability date; area is optional", () => {
    const r = contactSchema.parse({ ...base, squareMetres: "" });
    expect(r.squareMetres).toBeUndefined();
    expect(r.availableTime).toBe("any");
    expect(contactSchema.parse({ ...base, squareMetres: "85" }).squareMetres).toBe(85);
  });

  it.each(["fullName", "email", "phone", "location", "availableDate"])("requires %s", (key) => {
    expect(contactSchema.safeParse({ ...base, [key]: "" }).success).toBe(false);
  });

  it("rejects an availability date in the past", () => {
    expect(contactSchema.safeParse({ ...base, availableDate: "2020-01-01" }).success).toBe(false);
  });
});
