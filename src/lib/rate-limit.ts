// In-memory sliding-window limiter. One process only (see PRD architecture principle 4).
const g = globalThis as unknown as { __rl?: Map<string, number[]> };
const hits = (g.__rl ??= new Map<string, number[]>());

/** Records a hit and returns true if it is within `limit` hits per `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function resetRateLimits(): void {
  hits.clear();
}

/**
 * The limiter used by routes. With Redis (Vercel: many instances) it's a shared fixed window, so a
 * limit holds across instances; otherwise (one local process) the in-memory limiter above.
 */
export async function allow(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { getRedis } = await import("./realtime/bus");
  const redis = getRedis();
  if (!redis) return rateLimit(key, limit, windowMs);
  const r = await redis;
  const bucket = `ccl:rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  const n = await r.incr(bucket);
  if (n === 1) await r.pexpire(bucket, windowMs);
  return n <= limit;
}
