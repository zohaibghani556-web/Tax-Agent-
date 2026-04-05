/**
 * TaxAgent.ai — In-process rate limiter (token bucket).
 *
 * PRODUCTION NOTE: This works per-instance only. On Vercel (multi-instance),
 * replace with Upstash Redis using @upstash/ratelimit for true global limits.
 *
 * buckets Map is never compacted — acceptable for dev. In prod replace entirely.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Returns false if the caller has exceeded their rate limit.
 *
 * @param key       Unique key (e.g. `chat:userId` or `ocr:userId`)
 * @param maxTokens Max requests allowed per window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxTokens: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.lastRefill > windowMs) {
    bucket = { tokens: maxTokens, lastRefill: now };
  }

  if (bucket.tokens <= 0) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}
