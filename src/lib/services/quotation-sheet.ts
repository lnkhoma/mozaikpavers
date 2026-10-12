import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { quotations, type Customer, type Quotation } from "@/lib/db/schema";
import { appendSheetRow, sheetsConfig, type SheetCell, type SheetsConfig } from "@/lib/google/sheets";
import { logger } from "@/lib/logger";

/** Column headings of the "downloaded quotations" sheet, in order. */
export const SHEET_HEADER = [
  "Downloaded (Malawi time)",
  "Quotation No.",
  "Customer Name",
  "Email",
  "Phone",
  "WhatsApp",
  "Project Location",
  "Total Square Metres",
  "Total Amount (MWK)",
  "Quotation Date",
];

/** "2026-10-12 14:05" in Malawi time (UTC+2, no daylight saving). */
function malawiDateTime(date: Date): string {
  return new Date(date.getTime() + 2 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}

export function quotationSheetRow(quotation: Quotation, customer: Customer, downloadedAt: Date): SheetCell[] {
  return [
    malawiDateTime(downloadedAt),
    quotation.quoteNumber,
    customer.fullName,
    customer.email,
    customer.phone,
    customer.whatsapp ?? "",
    quotation.projectLocation,
    quotation.squareMetres,
    quotation.grandTotal,
    malawiDateTime(quotation.createdAt).slice(0, 10),
  ];
}

type Appender = (config: SheetsConfig, header: string[], row: SheetCell[]) => Promise<void>;

/**
 * Called when a customer downloads their quotation PDF. Records the first
 * download and writes the quotation to the Google Sheet exactly once.
 *
 * The row is "claimed" in the database before it is sent, so two downloads
 * at the same moment cannot produce two rows; if Google rejects the write
 * the claim is released and the next download tries again. Never throws:
 * a spreadsheet problem must not stop the customer getting their PDF.
 */
export async function recordQuotationDownload(
  quotation: Quotation,
  customer: Customer,
  deps: { config?: SheetsConfig | null; append?: Appender } = {},
): Promise<"exported" | "already_exported" | "not_configured" | "failed"> {
  const now = new Date();
  try {
    const db = await getDb();
    await db.update(quotations).set({ downloadedAt: now }).where(and(eq(quotations.id, quotation.id), isNull(quotations.downloadedAt)));

    const config = deps.config === undefined ? sheetsConfig() : deps.config;
    if (!config) return "not_configured";

    const [claimed] = await db
      .update(quotations)
      .set({ sheetExportedAt: now })
      .where(and(eq(quotations.id, quotation.id), isNull(quotations.sheetExportedAt)))
      .returning({ id: quotations.id });
    if (!claimed) return "already_exported";

    try {
      await (deps.append ?? appendSheetRow)(config, SHEET_HEADER, quotationSheetRow(quotation, customer, now));
      return "exported";
    } catch (error) {
      await db.update(quotations).set({ sheetExportedAt: null }).where(eq(quotations.id, quotation.id));
      logger.error("quotation.sheet_export_failed", { error, quoteNumber: quotation.quoteNumber });
      return "failed";
    }
  } catch (error) {
    logger.error("quotation.download_record_failed", { error, quoteNumber: quotation.quoteNumber });
    return "failed";
  }
}
