type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

/**
 * In-memory sliding-window rate limiter.
 * Suitable for single-instance / hobby deployments; swap for a shared store
 * (e.g. Upstash Redis) when running multiple instances.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  const hits = (bucket?.hits ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, { hits });
    return false;
  }

  hits.push(now);
  buckets.set(key, { hits });

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}
