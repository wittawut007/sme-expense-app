interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Clean up stale records periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((record, key) => {
      if (record.resetAt <= now) {
        memoryStore.delete(key);
      }
    });
  }, 60000);
}

/**
 * In-memory sliding window rate limiter
 * @param identifier Unique key (e.g. user_id or IP)
 * @param limit Maximum number of allowed requests in the window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || record.resetAt <= now) {
    memoryStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSec: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    const resetInSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSec,
    };
  }

  record.count += 1;
  const resetInSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return {
    allowed: true,
    remaining: limit - record.count,
    resetInSec,
  };
}
