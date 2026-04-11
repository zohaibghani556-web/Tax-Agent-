/**
 * TaxAgent.ai — Redis-ready rate limiter with in-memory fallback.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 * the async variant uses Upstash Redis sliding window via their REST API
 * (no extra package — plain fetch). This works across all Vercel instances.
 *
 * When those env vars are absent (local dev / most deployments), falls back
 * to the in-memory token bucket. The sync variant always uses the in-memory
 * fallback regardless.
 *
 * PRODUCTION NOTE: Replace with @upstash/ratelimit package for production.
 * See SECURITY-NOTES.md for setup instructions. The in-memory fallback is
 * per-instance only — a determined attacker can bypass it on multi-instance
 * Vercel deployments by routing requests to different instances.
 */

// ── In-memory token bucket (per-instance fallback) ──────────────────────────

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Synchronous rate limit check using in-memory token bucket.
 * Always uses in-memory storage — safe for single-instance deployments.
 *
 * @param key       Unique key (e.g. `chat:userId` or `ocr:userId`)
 * @param maxTokens Max requests allowed per window
 * @param windowMs  Window duration in milliseconds
 * @returns false if the caller has exceeded their rate limit
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

// ── Upstash Redis sliding window (multi-instance safe) ───────────────────────

const UPSTASH_URL    = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN  = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis       = !!(UPSTASH_URL && UPSTASH_TOKEN);

/**
 * Increments a key in Upstash Redis and checks the count against maxTokens.
 * Uses the INCR + EXPIRE pattern for sliding window rate limiting.
 * Returns true if the request is allowed, false if rate limited.
 */
async function checkUpstashLimit(
  key: string,
  maxTokens: number,
  windowMs: number,
): Promise<boolean> {
  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey  = `ratelimit:${key}`;

  // Use Upstash pipeline to INCR + EXPIRE atomically
  const pipelineBody = [
    ['INCR', redisKey],
    ['EXPIRE', redisKey, windowSec],
  ];

  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(pipelineBody),
  });

  if (!res.ok) {
    // On Redis error, fail open (allow the request)
    return true;
  }

  const data = await res.json() as Array<{ result: number }>;
  const count = data[0]?.result ?? 0;
  return count <= maxTokens;
}

/**
 * Async rate limit check. Uses Redis when configured; falls back to in-memory.
 * Prefer this in API routes when Redis is configured for true multi-instance safety.
 *
 * @param key       Unique key (e.g. `chat:userId`)
 * @param maxTokens Max requests allowed per window
 * @param windowMs  Window duration in milliseconds
 * @returns false if the caller has exceeded their rate limit
 */
export async function checkRateLimitAsync(
  key: string,
  maxTokens: number,
  windowMs: number,
): Promise<boolean> {
  if (useRedis) {
    return checkUpstashLimit(key, maxTokens, windowMs);
  }
  // Fall back to synchronous in-memory bucket
  return checkRateLimit(key, maxTokens, windowMs);
}
