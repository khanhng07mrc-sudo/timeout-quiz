interface RateLimitRecord {
  timestamps: number[];
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale records every 2 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.blockedUntil && record.blockedUntil > now) continue;
      // Filter out timestamps older than 10 minutes
      record.timestamps = record.timestamps.filter((t) => now - t < 600000);
      if (record.timestamps.length === 0 && (!record.blockedUntil || record.blockedUntil <= now)) {
        rateLimitStore.delete(key);
      }
    }
  }, 120000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks sliding-window rate limit for a given key.
 * If exceeded, temporarily blocks for blockDurationMs (defaults to windowMs).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  blockDurationMs = windowMs
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Check if actively blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    record.blockedUntil = now + blockDurationMs;
    const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);

  return {
    allowed: true,
    remaining,
    retryAfterSeconds: 0,
  };
}

/**
 * Extracts client IP from HTTP Request headers (supporting reverse proxies)
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",");
    if (ips[0]) return ips[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Room PIN validation rate limit (Anti brute-force):
 * Max 15 attempts per 60s. Block for 3 minutes if exceeded.
 */
export function checkPinValidationLimit(ip: string): RateLimitResult {
  return checkRateLimit(`pin_check:${ip}`, 15, 60000, 180000);
}

/**
 * Player join rate limit (Anti bot flooding):
 * Max 6 joins per 10s per IP/Socket.
 */
export function checkPlayerJoinLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`join:${identifier}`, 6, 10000, 30000);
}

/**
 * Action Debounce check (Anti button / event spam):
 * Allows 1 event per cooldownMs.
 */
export function checkActionDebounce(key: string, cooldownMs = 500): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(`debounce:${key}`);
  if (record && record.timestamps.length > 0) {
    const last = record.timestamps[record.timestamps.length - 1];
    if (now - last < cooldownMs) {
      return false; // too fast
    }
  }
  rateLimitStore.set(`debounce:${key}`, { timestamps: [now] });
  return true;
}

/**
 * Maximum active players allowed per room to protect against memory exhaustion
 */
export const MAX_PLAYERS_PER_ROOM = 100;
