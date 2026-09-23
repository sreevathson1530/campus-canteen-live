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
