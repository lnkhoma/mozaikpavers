import { appendSheetRow, contactSheetsConfig, ensureSheetTab, type SheetCell, type SheetsConfig } from "@/lib/google/sheets";
import { logger } from "@/lib/logger";

/** Site assessment requests go on their own tab of the "Get in Touch" spreadsheet. */
export const SITE_VISIT_TAB = "Site Assessments";

export const SITE_VISIT_SHEET_HEADER = [
  "Submitted (Malawi time)",
  "Reference",
  "Customer Name",
  "Email",
  "Phone",
  "WhatsApp",
  "Site Location",
  "Project Type",
  "Approximate Area (SQM)",
  "Preferred Date",
  "Preferred Time",
  "Quotation No.",
  "Notes",
];

const TIME_LABELS = { morning: "Morning", afternoon: "Afternoon", any: "Any time" } as const;

export interface SiteVisitSubmission {
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  location: string;
  projectType?: string;
  squareMetres?: number;
  preferredDate?: string;
  preferredTime: keyof typeof TIME_LABELS;
  notes?: string;
}

/** "2026-10-12 14:05" in Malawi time (UTC+2, no daylight saving). */
function malawiDateTime(date: Date): string {
  return new Date(date.getTime() + 2 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}

export function siteVisitSheetRow(input: SiteVisitSubmission, reference: string, quoteNumber: string | null, submittedAt: Date): SheetCell[] {
  return [
    malawiDateTime(submittedAt),
    reference,
    input.fullName,
    input.email,
    input.phone,
    input.whatsapp ?? "",
    input.location,
    input.projectType ?? "",
    input.squareMetres ?? "",
    input.preferredDate ?? "",
    TIME_LABELS[input.preferredTime],
    quoteNumber ?? "",
    input.notes ?? "",
  ];
}

type Appender = (config: SheetsConfig, header: string[], row: SheetCell[]) => Promise<void>;

/**
 * Adds a site assessment request to the "Site Assessments" tab, creating the
 * tab the first time. Used when the database is unavailable. Never throws.
 */
export async function recordSiteVisitSubmission(
  input: SiteVisitSubmission,
  reference: string,
  quoteNumber: string | null,
  deps: { config?: SheetsConfig | null; append?: Appender; ensureTab?: (config: SheetsConfig) => Promise<void> } = {},
): Promise<"exported" | "not_configured" | "failed"> {
  const base = deps.config === undefined ? contactSheetsConfig() : deps.config;
  if (!base) return "not_configured";
  const config = { ...base, tab: SITE_VISIT_TAB };
  try {
    await (deps.ensureTab ?? ensureSheetTab)(config);
    await (deps.append ?? appendSheetRow)(config, SITE_VISIT_SHEET_HEADER, siteVisitSheetRow(input, reference, quoteNumber, new Date()));
    return "exported";
  } catch (error) {
    logger.error("site_visit.sheet_export_failed", { error, reference });
    return "failed";
  }
}
