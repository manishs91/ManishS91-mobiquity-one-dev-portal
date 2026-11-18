/**
 * Fixed-window in-memory rate limiter. Good enough for a single instance; use
 * Redis (or your API gateway) when running several replicas.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= t) {
    buckets.set(key, { count: 1, resetAt: t + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= t) buckets.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count > limit ? { ok: false, retryAfter: Math.ceil((b.resetAt - t) / 1000) } : { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
