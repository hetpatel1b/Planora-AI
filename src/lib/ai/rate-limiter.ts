/**
 * Planora AI — Server-Side In-Memory Sliding-Window Rate Limiter
 *
 * Lightweight, zero-dependency rate limiter designed to guard expensive AI endpoints
 * (Groq AI completions, plan blueprint synthesis) against denial-of-wallet,
 * accidental double-submits, and abusive request loops.
 *
 * Design Invariants:
 * - 100% self-contained in Node.js server memory (no external Redis or paid tier needed).
 * - Per-user tracking keyed strictly to verified session user.id.
 * - Sliding window calculation prevents boundary-burst attacks.
 * - Automatic eviction of expired timestamps prevents server memory leaks.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly hits = new Map<string, number[]>();

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * Evaluates whether a request from the given identifier is permitted.
   */
  public check(identifier: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;
    const timestamps = this.hits.get(identifier) || [];

    // Filter to retain only timestamps within the current sliding window
    const activeTimestamps = timestamps.filter((t) => t > windowStart);

    if (activeTimestamps.length >= this.maxRequests) {
      const oldestActive = activeTimestamps[0];
      const resetMs = Math.max(0, oldestActive + this.windowMs - now);

      this.hits.set(identifier, activeTimestamps);

      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    activeTimestamps.push(now);
    this.hits.set(identifier, activeTimestamps);

    // Housekeeping: Prevent unbound memory growth by purging empty/stale keys
    if (this.hits.size > 2000) {
      this.cleanup(now);
    }

    return {
      allowed: true,
      remaining: this.maxRequests - activeTimestamps.length,
      resetMs: this.windowMs,
    };
  }

  /**
   * Resets all tracked records (primarily for testing and administration).
   */
  public reset(): void {
    this.hits.clear();
  }

  /**
   * Periodic garbage collection of expired entries.
   */
  private cleanup(now: number): void {
    const windowStart = now - this.windowMs;
    for (const [key, timestamps] of this.hits.entries()) {
      const active = timestamps.filter((t) => t > windowStart);
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, active);
      }
    }
  }
}

// 1. AI Copilot Chat Rate Limiter: 15 requests per 60 seconds per user
export const copilotRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000,
});

// 2. AI Plan Blueprint Generation Rate Limiter: 5 generations per 60 seconds per user
export const planGenerationRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000,
});

/**
 * Checks if the user is allowed to send another Copilot message.
 */
export function checkCopilotRateLimit(userId: string): RateLimitResult {
  return copilotRateLimiter.check(userId);
}

/**
 * Checks if the user is allowed to generate another AI Plan blueprint.
 */
export function checkPlanGenerationRateLimit(userId: string): RateLimitResult {
  return planGenerationRateLimiter.check(userId);
}

/**
 * Resets all rate limit tracking (useful in unit tests).
 */
export function resetAllRateLimits(): void {
  copilotRateLimiter.reset();
  planGenerationRateLimiter.reset();
}

