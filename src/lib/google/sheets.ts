import { importPKCS8, SignJWT } from "jose";
import { logger } from "@/lib/logger";

/**
 * Minimal Google Sheets client using a service account (no SDK).
 *
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL        …@….iam.gserviceaccount.com
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  the "private_key" from the JSON key
 *   GOOGLE_SHEET_ID                     spreadsheet id from its URL
 *   GOOGLE_SHEET_TAB                    optional tab name (default: first tab)
 *
 * Also accepted: GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY,
 * GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_TAB.
 *
 * The spreadsheet must be shared with the service account as an Editor.
 */
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export type SheetCell = string | number;

export interface SheetsConfig {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  tab?: string;
}

/** First non-empty value among several accepted names for the same setting. */
function setting(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function sheetsConfig(): SheetsConfig | null {
  // The GOOGLE_SHEETS_* names are accepted as alternatives.
  const clientEmail = setting("GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SHEETS_CLIENT_EMAIL");
  const rawKey = setting("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "GOOGLE_SHEETS_PRIVATE_KEY");
  const spreadsheetId = setting("GOOGLE_SHEET_ID", "GOOGLE_SHEETS_SPREADSHEET_ID");
  if (!clientEmail || !rawKey || !spreadsheetId) return null;
  // Hosting dashboards usually store the key on one line with literal "\n".
  const privateKey = rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  return { clientEmail, privateKey, spreadsheetId, tab: setting("GOOGLE_SHEET_TAB", "GOOGLE_SHEETS_TAB") };
}

let cachedToken: { value: string; expiresAt: number; for: string } | null = null;

async function accessToken(config: SheetsConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.for === config.clientEmail && cachedToken.expiresAt > now + 60_000) return cachedToken.value;

  const key = await importPKCS8(config.privateKey, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(`Google sign-in failed: ${body.error_description ?? `HTTP ${response.status}`}`);
  }
  cachedToken = { value: body.access_token, expiresAt: now + (body.expires_in ?? 3600) * 1000, for: config.clientEmail };
  return body.access_token;
}

/** A1 range for the configured tab (quoted, so tab names with spaces work). */
function range(config: SheetsConfig, cells: string): string {
  return config.tab ? `'${config.tab.replace(/'/g, "''")}'!${cells}` : cells;
}

async function sheetsFetch(config: SheetsConfig, path: string, init?: RequestInit): Promise<unknown> {
  const token = await accessToken(config);
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) throw new Error(`Google Sheets: ${body.error?.message ?? `HTTP ${response.status}`}`);
  return body;
}

/**
 * Appends one row, writing `header` first when the sheet is still empty.
 * Values are sent RAW: text stays text, so a name beginning with "=" can
 * never run as a spreadsheet formula.
 */
export async function appendSheetRow(config: SheetsConfig, header: string[], row: SheetCell[]): Promise<void> {
  const firstCell = (await sheetsFetch(config, `/values/${encodeURIComponent(range(config, "A1:A1"))}`)) as { values?: unknown[][] };
  const rows = firstCell.values?.length ? [row] : [header, row];
  await sheetsFetch(
    config,
    `/values/${encodeURIComponent(range(config, "A1"))}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: rows }) },
  );
  logger.info("sheets.row_appended", { rows: rows.length });
}

/** Test hook: forget the cached Google access token. */
export function resetSheetsTokenCache(): void {
  cachedToken = null;
}
