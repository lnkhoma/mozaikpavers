import { z } from "zod";
import { MAX_AREA_SQM, MIN_AREA_SQM } from "@/lib/pricing/engine";
import { LEAD_STATUSES, PROJECT_CATEGORIES, SITE_VISIT_STATUSES } from "@/lib/constants";
import { PRICING_FIELDS } from "@/lib/pricing/defaults";
import type { PricingKey } from "@/lib/pricing/types";

/**
 * Shared validation schemas: used by client forms for instant feedback and
 * re-applied on the server, which is the only place the result is trusted.
 */

/** Trim, collapse whitespace, strip control characters. */
const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").trim())
    .pipe(z.string().max(max, `Must be ${max} characters or fewer`));

const optionalText = (max: number) =>
  cleanText(max)
    .nullish()
    .transform((v) => (v ? v : undefined));

/**
 * Malawi numbers (+265 / 0 followed by 8–9 digits) and other international
 * numbers in E.164 range. Normalised to "+<digits>".
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((raw, ctx) => {
    const compact = raw.replace(/[\s\-().]/g, "");
    let digits: string | null = null;
    if (/^\+\d{9,15}$/.test(compact)) digits = compact.slice(1);
    else if (/^00\d{9,15}$/.test(compact)) digits = compact.slice(2);
    else if (/^0\d{8,9}$/.test(compact)) digits = `265${compact.slice(1)}`;
    else if (/^265\d{8,9}$/.test(compact)) digits = compact;
    else if (/^[1-9]\d{8}$/.test(compact)) digits = `265${compact}`;
    if (!digits) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 0999 123 456 or +265 999 123 456" });
      return z.NEVER;
    }
    return `+${digits}`;
  });

const optionalPhone = z
  .union([z.literal(""), phoneSchema])
  .nullish()
  .transform((v) => (v ? v : undefined));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email address is required")
  .max(254)
  .pipe(z.email("Enter a valid email address"));

export const areaSchema = z.coerce
  .number({ error: "Enter the area in square metres" })
  .refine(Number.isFinite, "Enter the area in square metres")
  .min(MIN_AREA_SQM, `Minimum area is ${MIN_AREA_SQM} SQM`)
  .max(MAX_AREA_SQM, `For areas above ${MAX_AREA_SQM.toLocaleString("en-US")} SQM please contact us directly`)
  .transform((n) => Math.round(n * 100) / 100);

export const quotationOptionsSchema = z.object({
  includeCompaction: z.boolean().default(true),
  includeLandscaping: z.boolean().default(true),
  sitePreparation: z.boolean().default(false),
  removalOfExistingPaving: z.boolean().default(false),
  drainage: z.boolean().default(false),
  otherRequirements: optionalText(500),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

const optionalDate = z
  .union([z.literal(""), isoDate])
  .nullish()
  .transform((v) => (v ? v : undefined));

/** Anti-bot fields included with every public form. */
export const botCheckSchema = z.object({
  /** Honeypot: hidden from humans, must stay empty. */
  website: z.string().max(0).optional().or(z.literal("")),
  /** ms since the form was rendered; humans take a few seconds. */
  elapsedMs: z.number().int().nonnegative().optional(),
});

export const quotationRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  squareMetres: areaSchema,
  options: quotationOptionsSchema,
  customer: z.object({
    fullName: cleanText(120).pipe(z.string().min(2, "Please enter your full name")),
    email: emailSchema,
    phone: phoneSchema,
    whatsapp: optionalPhone,
  }),
  project: z.object({
    location: cleanText(200).pipe(z.string().min(2, "Please enter the project location")),
    projectType: optionalText(60),
    paverStyle: optionalText(60),
    expectedStartDate: optionalDate,
    notes: optionalText(2000),
  }),
  bot: botCheckSchema.optional(),
});
export type QuotationRequest = z.infer<typeof quotationRequestSchema>;
export type QuotationRequestInput = z.input<typeof quotationRequestSchema>;

export const siteVisitRequestSchema = z.object({
  /** When following up a quotation, the quote number + access token link it. */
  quoteNumber: optionalText(32),
  accessToken: optionalText(128),
  fullName: cleanText(120).pipe(z.string().min(2, "Please enter your full name")),
  email: emailSchema,
  phone: phoneSchema,
  whatsapp: optionalPhone,
  location: cleanText(200).pipe(z.string().min(2, "Please enter the site location")),
  projectType: optionalText(60),
  squareMetres: z
    .union([z.literal(""), areaSchema])
    .nullish()
    .transform((v) => (v === "" || v == null ? undefined : v)),
  preferredDate: optionalDate,
  preferredTime: z.enum(["morning", "afternoon", "any"]).default("any"),
  notes: optionalText(2000),
  bot: botCheckSchema.optional(),
});
export type SiteVisitRequestInput = z.input<typeof siteVisitRequestSchema>;

/** "Get in touch" form: who, where, roughly how big, and when we can meet on site. */
export const contactSchema = z.object({
  fullName: cleanText(120).pipe(z.string().min(2, "Please enter your name")),
  email: emailSchema,
  phone: phoneSchema,
  location: cleanText(200).pipe(z.string().min(2, "Please enter the location of the project")),
  squareMetres: z
    .union([z.literal(""), areaSchema])
    .nullish()
    .transform((v) => (v === "" || v == null ? undefined : v)),
  availableDate: z
    .string({ error: "Please choose a date you're available" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date you're available")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Please choose a valid date")
    // Allow "today" in any timezone: compare against yesterday (UTC).
    .refine((s) => s >= new Date(Date.now() - 86_400_000).toISOString().slice(0, 10), "Please choose today or a future date"),
  availableTime: z.enum(["morning", "afternoon", "any"]).default("any"),
  bot: botCheckSchema.optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const resendEmailSchema = z.object({
  accessToken: z.string().min(16).max(128),
});

/* --------------------------- Admin --------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export const pricingUpdateSchema = z
  .object(
    Object.fromEntries(
      PRICING_FIELDS.map((f) => [
        f.key,
        z.coerce
          .number({ error: `${f.label} must be a number` })
          .refine(Number.isFinite, `${f.label} must be a number`)
          .refine((n) => (f.kind === "quantity" ? n > 0 : n >= 0), `${f.label} must be ${f.kind === "quantity" ? "greater than zero" : "zero or more"}`)
          .refine((n) => n <= 1_000_000_000, `${f.label} is too large`)
          .refine((n) => (f.kind === "money" || f.kind === "days" ? Number.isInteger(n) : true), `${f.label} must be a whole number`),
      ]),
    ) as unknown as Record<PricingKey, z.ZodType<number>>,
  )
  .extend({ changeNote: optionalText(300) });

export const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  adminNotes: optionalText(5000),
});

export const siteVisitUpdateSchema = z.object({
  status: z.enum(SITE_VISIT_STATUSES),
  scheduledFor: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)]).optional(),
});

export const projectSchema = z.object({
  name: cleanText(120).pipe(z.string().min(2, "Project name is required")),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .optional()
    .or(z.literal("")),
  location: cleanText(120).pipe(z.string().min(2, "Location is required")),
  categories: z.array(z.enum(PROJECT_CATEGORIES)).min(1, "Choose at least one category"),
  description: cleanText(4000),
  squareMetres: z.union([z.literal(""), z.coerce.number().positive().max(1_000_000)]).optional().transform((v) => (v === "" || v == null ? null : v)),
  paverType: optionalText(120),
  completionDate: optionalDate,
  featured: z.boolean(),
  published: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const analyticsEventSchema = z.object({
  name: z.enum([
    "page_view",
    "project_viewed",
    "before_after_interaction",
    "calculator_opened",
    "sqm_entered",
    "quotation_completed",
    "quotation_emailed",
    "whatsapp_clicked",
    "phone_clicked",
    "site_assessment_requested",
  ]),
  sessionId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/).optional(),
  path: z.string().max(300).optional(),
  properties: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});
export type AnalyticsEventName = z.infer<typeof analyticsEventSchema>["name"];

/** Flatten a ZodError into { "customer.email": "message" } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
