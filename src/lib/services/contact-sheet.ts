import { appendSheetRow, contactSheetsConfig, type SheetCell, type SheetsConfig } from "@/lib/google/sheets";
import { logger } from "@/lib/logger";

/** Column headings of the "Get in Touch" sheet, in order. */
export const CONTACT_SHEET_HEADER = [
  "Submitted (Malawi time)",
  "Reference",
  "Customer Name",
  "Email",
  "Phone",
  "Project Location",
  "Approximate Area (SQM)",
  "Available On",
  "Preferred Time",
];

const TIME_LABELS = { morning: "Morning", afternoon: "Afternoon", any: "Any time" } as const;

export interface ContactSubmission {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  squareMetres?: number;
  availableDate: string;
  availableTime: keyof typeof TIME_LABELS;
}

/** "2026-10-12 14:05" in Malawi time (UTC+2, no daylight saving). */
function malawiDateTime(date: Date): string {
  return new Date(date.getTime() + 2 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}

export function contactSheetRow(input: ContactSubmission, reference: string, submittedAt: Date): SheetCell[] {
  return [
    malawiDateTime(submittedAt),
    reference,
    input.fullName,
    input.email,
    input.phone,
    input.location,
    input.squareMetres ?? "",
    input.availableDate,
    TIME_LABELS[input.availableTime],
  ];
}

type Appender = (config: SheetsConfig, header: string[], row: SheetCell[]) => Promise<void>;

/**
 * Adds a "Get in Touch" submission to its Google Sheet. Never throws: the
 * enquiry is already saved as a lead, so a spreadsheet problem must not
 * turn a successful submission into an error for the customer.
 */
export async function recordContactSubmission(
  input: ContactSubmission,
  reference: string,
  deps: { config?: SheetsConfig | null; append?: Appender } = {},
): Promise<"exported" | "not_configured" | "failed"> {
  const config = deps.config === undefined ? contactSheetsConfig() : deps.config;
  if (!config) return "not_configured";
  try {
    await (deps.append ?? appendSheetRow)(config, CONTACT_SHEET_HEADER, contactSheetRow(input, reference, new Date()));
    return "exported";
  } catch (error) {
    logger.error("contact.sheet_export_failed", { error, reference });
    return "failed";
  }
}
