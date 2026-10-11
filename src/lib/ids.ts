import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Unguessable token for customer-facing links (PDF download, follow-ups). */
export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function tokensMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Short human-friendly reference, e.g. "L-7KQ2M9". Not derived from DB ids. */
export function newLeadReference(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += CROCKFORD[randomInt(CROCKFORD.length)];
  return `L-${out}`;
}

/** MP-Q-2026-00001 */
export function formatQuoteNumber(year: number, seq: number): string {
  return `MP-Q-${year}-${String(seq).padStart(5, "0")}`;
}

export const QUOTE_NUMBER_PATTERN = /^MP-Q-\d{4}-\d{5,}$/;

/** Malawi is UTC+2 all year (no daylight saving). */
const MALAWI_OFFSET_MS = 2 * 60 * 60 * 1000;

export function malawiDate(date = new Date()): { year: number; iso: string } {
  const local = new Date(date.getTime() + MALAWI_OFFSET_MS);
  return { year: local.getUTCFullYear(), iso: local.toISOString().slice(0, 10) };
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
