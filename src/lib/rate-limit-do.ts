// Simple in-memory rate limiter for Cloudflare Pages
// Note: This works for single-instance deployments. For multi-instance, use Upstash Redis.

const buckets = new Map<string, { hits: number[] }>();
const MAX_BUCKETS = 10_000;

export interface Env {
  // No Durable Objects or KV needed for this simple rate limiter
}

export class RateLimiterDO {
  constructor() {}

  async check(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const stored = buckets.get(key);
    const hits = (stored?.hits ?? []).filter((t: number) => now - t < windowMs);

    if (hits.length >= limit) {
      buckets.set(key, { hits });
      return false;
    }

    hits.push(now);
    buckets.set(key, { hits });
    
    // Cleanup old buckets
    if (buckets.size > MAX_BUCKETS) {
      for (const [k, v] of buckets) {
        if (v.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
      }
    }
    return true;
  }
}

export async function rateLimitCheck(env: Env, key: string, limit: number, windowMs: number): Promise<boolean> {
  const limiter = new RateLimiterDO();
  return limiter.check(key, limit, windowMs);
}