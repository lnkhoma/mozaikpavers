import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { company } from "@/config/company";
import type { Customer, Quotation } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { quotationEmail } from "@/lib/email/templates";
import { appendSheetRow, readSheetColumn, sheetsConfig, type SheetCell, type SheetsConfig } from "@/lib/google/sheets";
import { addDaysIso, formatQuoteNumber, malawiDate } from "@/lib/ids";
import { logger } from "@/lib/logger";
import { DEFAULT_PRICING } from "@/lib/pricing/defaults";
import { calculateQuotation } from "@/lib/pricing/engine";
import type { PricingConfig, QuotationOptions } from "@/lib/pricing/types";
import type { QuotationRequest } from "@/lib/validation/schemas";
import { quotationSheetRow, SHEET_HEADER } from "./quotation-sheet";
import { renderQuotationPdf, quotationLinks, type DeliveryResult } from "./quotations";

/**
 * Quotations without a database.
 *
 * When the database cannot be reached, the quotation is still calculated and
 * shown, and everything needed to rebuild it (area, options, customer, rates,
 * date) travels inside its access token, encrypted so no personal details
 * appear in links. The PDF is rebuilt from the token on download, and the
 * download is written to the Google Sheet, which is then the only record.
 */
const TOKEN_PREFIX = "o1.";

interface OfflinePayload {
  n: string; // quote number
  at: number; // created, ms since epoch
  k: string; // idempotency key
  a: number; // square metres
  o: QuotationOptions;
  c: QuotationRequest["customer"];
  p: QuotationRequest["project"];
  r: PricingConfig;
}

export function isOfflineToken(token: string | null | undefined): token is string {
  return Boolean(token?.startsWith(TOKEN_PREFIX));
}

/** Any one server-side secret works; AUTH_SECRET is preferred when set. */
function tokenKey(): Buffer {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_SHEETS_PRIVATE_KEY?.trim();
  if (!secret) throw new Error("No secret is configured to protect quotation links.");
  return createHash("sha256").update(`mozaik-offline-quotation:${secret}`).digest();
}

function seal(payload: OfflinePayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const body = Buffer.concat([cipher.update(deflateRawSync(JSON.stringify(payload))), cipher.final()]);
  return TOKEN_PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function open(token: string): OfflinePayload | null {
  try {
    const raw = Buffer.from(token.slice(TOKEN_PREFIX.length), "base64url");
    const decipher = createDecipheriv("aes-256-gcm", tokenKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = inflateRawSync(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]));
    return JSON.parse(json.toString("utf8")) as OfflinePayload;
  } catch {
    return null;
  }
}

/**
 * Seven digits from the idempotency key, so a retried submission gets the
 * same number. Seven digits also keeps these apart from the database's own
 * five-digit sequence (MP-Q-2026-00001…).
 */
function offlineQuoteNumber(idempotencyKey: string, year: number): string {
  const hash = createHash("sha256").update(idempotencyKey).digest();
  return formatQuoteNumber(year, 1_000_000 + (hash.readUInt32BE(0) % 9_000_000));
}

/** Rebuilds the same records the database would hold, for the PDF and email code. */
function toRecords(payload: OfflinePayload, token: string): { quotation: Quotation; customer: Customer } {
  const createdAt = new Date(payload.at);
  const result = calculateQuotation(payload.a, payload.r, payload.o);
  const customer: Customer = {
    id: "offline",
    fullName: payload.c.fullName,
    email: payload.c.email,
    phone: payload.c.phone,
    whatsapp: payload.c.whatsapp ?? null,
    createdAt,
    updatedAt: createdAt,
  };
  const quotation: Quotation = {
    id: payload.n,
    quoteNumber: payload.n,
    customerId: customer.id,
    idempotencyKey: payload.k,
    accessToken: token,
    squareMetres: result.squareMetres,
    options: payload.o,
    projectLocation: payload.p.location,
    projectType: payload.p.projectType ?? null,
    paverStyle: payload.p.paverStyle ?? null,
    expectedStartDate: payload.p.expectedStartDate ?? null,
    notes: payload.p.notes ?? null,
    pricingVersion: 0,
    pricingSnapshot: payload.r,
    result,
    grandTotal: result.grandTotal,
    validUntil: addDaysIso(malawiDate(createdAt).iso, payload.r.quoteValidityDays),
    emailStatus: "pending",
    emailAttempts: 0,
    emailLastError: null,
    emailSentAt: null,
    downloadedAt: null,
    sheetExportedAt: null,
    createdAt,
  };
  return { quotation, customer };
}

export function createOfflineQuotation(input: QuotationRequest, pricing: PricingConfig = DEFAULT_PRICING) {
  const now = new Date();
  const options: QuotationOptions = { ...input.options, otherRequirements: input.options.otherRequirements ?? "" };
  // Validates the area and rates exactly as the database path does.
  calculateQuotation(input.squareMetres, pricing, options);
  const payload: OfflinePayload = {
    n: offlineQuoteNumber(input.idempotencyKey, malawiDate(now).year),
    at: now.getTime(),
    k: input.idempotencyKey,
    a: input.squareMetres,
    o: options,
    c: input.customer,
    p: input.project,
    r: pricing,
  };
  const token = seal(payload);
  logger.info("quotation.created_offline", { quoteNumber: payload.n, sqm: input.squareMetres });
  return toRecords(payload, token);
}

/** The quotation behind an offline token, or null if the token is not genuine or does not match. */
export function getOfflineQuotation(quoteNumber: string, token: string) {
  const payload = open(token);
  if (!payload || payload.n !== quoteNumber) return null;
  return toRecords(payload, token);
}

/** Emails the PDF when an email provider is set up; no retry bookkeeping without a database. */
export async function deliverOfflineQuotationEmail(quotation: Quotation, customer: Customer): Promise<DeliveryResult> {
  try {
    const pdf = await renderQuotationPdf(quotation, customer);
    const email = quotationEmail({
      quoteNumber: quotation.quoteNumber,
      customerName: customer.fullName,
      squareMetres: quotation.squareMetres,
      grandTotal: quotation.grandTotal,
      validUntil: quotation.validUntil,
      hasItemsSubjectToAssessment: quotation.result.hasItemsSubjectToAssessment,
      ...quotationLinks(quotation),
    });
    const sent = await sendEmail({
      to: customer.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: company.email,
      attachments: [{ filename: `Mozaik-Pavers-${quotation.quoteNumber}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
    if (sent.ok) return { status: "sent" };
    return { status: "failed", error: sent.error, canRetry: false };
  } catch (error) {
    logger.warn("quotation.offline_email_failed", { error, quoteNumber: quotation.quoteNumber });
    return { status: "failed", error: "Email could not be sent.", canRetry: false };
  }
}

type Appender = (config: SheetsConfig, header: string[], row: SheetCell[]) => Promise<void>;
type ColumnReader = (config: SheetsConfig, column: string) => Promise<string[]>;

/**
 * Writes a downloaded offline quotation to the Google Sheet once: the sheet's
 * quotation-number column is checked first, as there is no database to remember it.
 * Never throws.
 */
export async function recordOfflineQuotationDownload(
  quotation: Quotation,
  customer: Customer,
  deps: { config?: SheetsConfig | null; append?: Appender; readColumn?: ColumnReader } = {},
): Promise<"exported" | "already_exported" | "not_configured" | "failed"> {
  const config = deps.config === undefined ? sheetsConfig() : deps.config;
  if (!config) return "not_configured";
  try {
    const numbers = await (deps.readColumn ?? readSheetColumn)(config, "B");
    if (numbers.includes(quotation.quoteNumber)) return "already_exported";
    await (deps.append ?? appendSheetRow)(config, SHEET_HEADER, quotationSheetRow(quotation, customer, new Date()));
    return "exported";
  } catch (error) {
    logger.error("quotation.offline_sheet_export_failed", { error, quoteNumber: quotation.quoteNumber });
    return "failed";
  }
}
