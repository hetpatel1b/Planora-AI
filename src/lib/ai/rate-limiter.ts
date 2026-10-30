/**
 * Planora AI — Distributed & Server-Side Sliding-Window Rate Limiter
 *
 * Guards expensive AI endpoints (Groq AI completions, plan blueprint synthesis)
 * against denial-of-wallet attacks, accidental double-submits, and automated abuse.
 *
 * Architecture:
 * 1. Distributed Layer: Evaluates atomic sliding-window rate limits via PostgreSQL RPC
 *    (public.check_ai_rate_limit) using transaction-scoped advisory locking
 *    (pg_advisory_xact_lock) and caller identity enforcement (auth.uid() = p_user_id).
 * 2. High-Availability Fallback: If the database RPC is unprovisioned in the database
 *    schema (PostgreSQL error code 42883), logs an operational diagnostic and falls back
 *    to container-local in-memory sliding-window enforcement to maintain protection
 *    while database migration deployment is pending.
 * 3. Fail-Closed Security: Fails closed (rejects requests) on unauthorized access (42501),
 *    invalid parameters, or unexpected database infrastructure errors.
 */

import { isJsonObject } from "@/lib/json-utils";

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
  private lastCleanupTime: number = 0;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * Evaluates whether a request from the given identifier is permitted.
   * Fails closed if the identifier is missing, non-string, or empty whitespace.
   */
  public check(identifier: string, now: number = Date.now()): RateLimitResult {
    // Fail-closed guard: reject unauthenticated, missing, or whitespace-only keys
    if (!identifier || typeof identifier !== "string" || identifier.trim().length === 0) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: this.windowMs,
      };
    }

    const sanitizedId = identifier.trim();
    const windowStart = now - this.windowMs;
    const timestamps = this.hits.get(sanitizedId) || [];

    // Filter to retain only timestamps within the current sliding window
    const activeTimestamps = timestamps.filter((t) => t > windowStart);

    if (activeTimestamps.length >= this.maxRequests) {
      const oldestActive = activeTimestamps[0];
      const resetMs = Math.max(0, oldestActive + this.windowMs - now);

      this.hits.set(sanitizedId, activeTimestamps);

      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    activeTimestamps.push(now);
    this.hits.set(sanitizedId, activeTimestamps);

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
    this.lastCleanupTime = 0;
  }

  /**
   * Periodic garbage collection of expired entries.
   * Throttled to at most once per windowMs to prevent O(N) loop degradation.
   */
  private cleanup(now: number): void {
    if (now - this.lastCleanupTime < this.windowMs && this.hits.size <= 5000) {
      return;
    }
    this.lastCleanupTime = now;

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

// 1. In-Memory Fallback Instances
export const copilotRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000,
});

export const planGenerationRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000,
});

export interface SupabaseRpcClient {
  rpc: (
    fn: "check_ai_rate_limit",
    args: {
      p_user_id: string;
      p_action: string;
      p_max_requests: number;
      p_window_seconds: number;
    }
  ) => PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}

export interface DistributedRateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
  supabaseClient?: SupabaseRpcClient | null;
}

/**
 * Shared internal evaluator for distributed rate limits with atomic RPC execution.
 */
export async function checkDistributedRateLimit(
  userId: string,
  action: "copilot" | "plan_generation",
  options: DistributedRateLimitOptions
): Promise<RateLimitResult> {
  // Defensive check: fail closed on empty or invalid user identifiers
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: options.windowSeconds * 1000,
    };
  }

  const sanitizedUserId = userId.trim();
  let client = options.supabaseClient;

  if (!client) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      client = await createClient();
    } catch {
      // In non-server environments (e.g. isolated unit tests), fallback to local limiter
      client = null;
    }
  }

  if (client) {
    try {
      const { data, error } = await client.rpc("check_ai_rate_limit", {
        p_user_id: sanitizedUserId,
        p_action: action,
        p_max_requests: options.maxRequests,
        p_window_seconds: options.windowSeconds,
      });

      if (!error && isJsonObject(data)) {
        const allowed = typeof data.allowed === "boolean" ? data.allowed : false;
        const remaining =
          typeof data.remaining === "number" && Number.isFinite(data.remaining)
            ? data.remaining
            : 0;
        const resetMs =
          typeof data.reset_ms === "number" && Number.isFinite(data.reset_ms)
            ? data.reset_ms
            : 0;
        return {
          allowed,
          remaining,
          resetMs,
        };
      }

      // Handle unapplied migration: procedure does not exist yet (code 42883)
      if (error && error.code === "42883") {
        console.warn(
          `[rate-limiter] Distributed RPC 'check_ai_rate_limit' not provisioned in database schema (code 42883). Operating in process-local mode.`
        );
        const fallback = action === "copilot" ? copilotRateLimiter : planGenerationRateLimiter;
        return fallback.check(sanitizedUserId);
      }

      // Handle unauthorized user mismatch (code 42501) - fail closed
      if (error && error.code === "42501") {
        console.error(
          `[rate-limiter] Unauthorized rate-limit check for user ${sanitizedUserId}: ${error.message}`
        );
        return {
          allowed: false,
          remaining: 0,
          resetMs: options.windowSeconds * 1000,
        };
      }

      // Other database errors (timeouts, network dropped) - fail closed for wallet protection
      if (error) {
        console.error(`[rate-limiter] Database error during rate-limit check: ${error.message}`);
        return {
          allowed: false,
          remaining: 0,
          resetMs: options.windowSeconds * 1000,
        };
      }
    } catch (err) {
      console.error(
        "[rate-limiter] Unexpected exception during distributed rate-limit check:",
        err
      );
      return {
        allowed: false,
        remaining: 0,
        resetMs: options.windowSeconds * 1000,
      };
    }
  }

  // Local fallback when no client context exists (unit tests / CLI)
  const localLimiter = action === "copilot" ? copilotRateLimiter : planGenerationRateLimiter;
  return localLimiter.check(sanitizedUserId);
}

/**
 * Checks if the user is allowed to send another Copilot message (15 req/60s).
 */
export async function checkCopilotRateLimit(
  userId: string,
  client?: SupabaseRpcClient | null
): Promise<RateLimitResult> {
  return checkDistributedRateLimit(userId, "copilot", {
    maxRequests: 15,
    windowSeconds: 60,
    supabaseClient: client,
  });
}

/**
 * Checks if the user is allowed to generate another AI Plan blueprint (5 req/60s).
 */
export async function checkPlanGenerationRateLimit(
  userId: string,
  client?: SupabaseRpcClient | null
): Promise<RateLimitResult> {
  return checkDistributedRateLimit(userId, "plan_generation", {
    maxRequests: 5,
    windowSeconds: 60,
    supabaseClient: client,
  });
}

/**
 * Resets all rate limit tracking (primarily for testing and administration).
 */
export function resetAllRateLimits(): void {
  copilotRateLimiter.reset();
  planGenerationRateLimiter.reset();
}
