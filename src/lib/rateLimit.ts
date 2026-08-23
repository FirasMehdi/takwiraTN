type Entry = { count: number; resetAt: number };

const hits = new Map<string, Entry>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/**
 * In-memory, single-process rate limiter: counts hits per `key` in a fixed
 * window. Good enough for this app's current single-instance deployment —
 * it does NOT coordinate across multiple processes/instances. If this app
 * is ever deployed with more than one instance, replace with a shared store
 * (Redis, or a DB-backed counter).
 */
export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true };
}

/** Test-only: clears all counters so test cases don't bleed into each other. */
export function resetRateLimits(): void {
  hits.clear();
}

/** Best-effort client IP from proxy headers; "unknown" if none is present
 * (e.g. local dev without a reverse proxy in front). */
export function extractIp(
  headers: Headers | Record<string, string | string[] | undefined> | null | undefined
): string {
  if (!headers) return "unknown";
  const raw = headers instanceof Headers
    ? headers.get("x-forwarded-for")
    : headers["x-forwarded-for"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.split(",")[0]?.trim() || "unknown";
}
