/**
 * Tiny in-memory fixed-window rate limiter keyed by user id.
 * Enough to stop a single account from draining the Gemini quota; for multi-instance
 * deployments put a shared store (Redis / Cloud Armor) in front instead.
 */
export interface RateLimiter {
  /** Returns ok=false plus seconds to wait when the key is over its limit. */
  check(key: string): { ok: true } | { ok: false; retryAfterSec: number };
}

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  now?: () => number;
}): RateLimiter {
  const now = opts.now ?? Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key) {
      const t = now();
      // opportunistic cleanup so the map cannot grow without bound
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
      }
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        hits.set(key, { count: 1, resetAt: t + opts.windowMs });
        return { ok: true };
      }
      if (entry.count >= opts.max) {
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)) };
      }
      entry.count += 1;
      return { ok: true };
    }
  };
}
