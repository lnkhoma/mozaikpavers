/**
 * Fixed-window rate limiter held in process memory.
 *
 * Fine for a single Node.js instance. When running several instances, swap the
 * store for Redis/Upstash behind the same `rateLimit` signature.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as unknown as { __mozaikRateLimit?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (globalStore.__mozaikRateLimit ??= new Map());

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  const ok = bucket.count <= limit;
  return { ok, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000) };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Named policies so limits are tuned in one place. */
export const LIMITS = {
  quotation: { limit: 8, windowMs: 60 * 60 * 1000 },
  quotationEmailRetry: { limit: 6, windowMs: 15 * 60 * 1000 },
  publicForm: { limit: 6, windowMs: 60 * 60 * 1000 },
  pdfDownload: { limit: 30, windowMs: 15 * 60 * 1000 },
  analytics: { limit: 120, windowMs: 60 * 1000 },
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const;
