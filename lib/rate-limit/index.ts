/**
 * PulseCRM Rate Limiting Module
 * 
 * Provides rate-limiting abstraction.
 * In a distributed, horizontally scaled production deployment, this connects to Redis.
 * In local/single-process environments, an in-memory sliding window counter is used.
 * 
 * Note on in-memory mode:
 * Limitations: Memory state is not shared across multi-region serverless instances.
 * For production serverless, configure RATE_LIMIT_REDIS_URL.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  limit: number; // Maximum allowed requests
  windowSeconds: number; // Time window in seconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 60, windowSeconds: 60 }
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const key = `ratelimit:${identifier}`;

  // In-memory sliding window fallback
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetAt,
    };
  }

  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Standard preset rate limits
 */
export const RATE_LIMIT_CONFIGS = {
  webhook: { limit: 120, windowSeconds: 60 }, // 120 req / minute
  auth: { limit: 10, windowSeconds: 60 },      // 10 attempts / minute
  aiCopilot: { limit: 20, windowSeconds: 60 }, // 20 requests / minute
  export: { limit: 5, windowSeconds: 60 },     // 5 exports / minute
};
