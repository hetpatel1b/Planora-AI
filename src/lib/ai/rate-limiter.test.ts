import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SlidingWindowRateLimiter,
  checkCopilotRateLimit,
  checkPlanGenerationRateLimit,
  checkDistributedRateLimit,
  resetAllRateLimits,
} from "./rate-limiter";

describe("SlidingWindowRateLimiter", () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      maxRequests: 3,
      windowMs: 1000,
    });
    resetAllRateLimits();
  });

  it("permits requests within the defined threshold", () => {
    const res1 = limiter.check("user-1", 100);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check("user-1", 200);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check("user-1", 300);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit within the sliding window", () => {
    limiter.check("user-1", 100);
    limiter.check("user-1", 200);
    limiter.check("user-1", 300);

    const blocked = limiter.check("user-1", 400);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBe(700); // 100 + 1000 - 400 = 700
  });

  it("permits new requests once previous timestamps slide out of the window", () => {
    limiter.check("user-1", 100);
    limiter.check("user-1", 200);
    limiter.check("user-1", 300);

    // At t=1150, the first request at t=100 has expired (window is 1000ms, windowStart=150)
    // Active timestamps become [200, 300, 1150], total 3, so remaining is 0
    const res = limiter.check("user-1", 1150);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(0);

    // At t=1250, t=200 has also expired (windowStart=250), active [300, 1150, 1250]
    const res2 = limiter.check("user-1", 1250);
    expect(res2.allowed).toBe(true);
  });

  it("isolates rate limit counters across distinct user IDs", () => {
    limiter.check("user-a", 100);
    limiter.check("user-a", 200);
    limiter.check("user-a", 300);

    expect(limiter.check("user-a", 400).allowed).toBe(false);

    // user-b should still be allowed
    expect(limiter.check("user-b", 400).allowed).toBe(true);
  });

  it("checkCopilotRateLimit enforces 15 requests per minute", async () => {
    const user = "copilot-tester";
    for (let i = 0; i < 15; i++) {
      const res = await checkCopilotRateLimit(user);
      expect(res.allowed).toBe(true);
    }
    const blocked = await checkCopilotRateLimit(user);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("checkPlanGenerationRateLimit enforces 5 requests per minute", async () => {
    const user = "plan-tester";
    for (let i = 0; i < 5; i++) {
      const res = await checkPlanGenerationRateLimit(user);
      expect(res.allowed).toBe(true);
    }
    const blocked = await checkPlanGenerationRateLimit(user);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("fails closed when given an empty, whitespace, or invalid identifier", () => {
    expect(limiter.check("").allowed).toBe(false);
    expect(limiter.check("").remaining).toBe(0);
    expect(limiter.check("   ").allowed).toBe(false);
    expect(limiter.check("   ").remaining).toBe(0);
    // @ts-expect-error testing runtime defense-in-depth against null
    expect(limiter.check(null).allowed).toBe(false);
    // @ts-expect-error testing runtime defense-in-depth against undefined
    expect(limiter.check(undefined).allowed).toBe(false);
    // @ts-expect-error testing runtime defense-in-depth against non-string
    expect(limiter.check(12345).allowed).toBe(false);
  });

  it("trims whitespace from valid identifiers to prevent key spoofing", () => {
    const res1 = limiter.check("  user-padded  ", 100);
    expect(res1.allowed).toBe(true);

    const res2 = limiter.check("user-padded", 200);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1); // Shares the same bucket as 'user-padded'
  });
});

describe("Distributed Rate Limiting (Supabase RPC Integration)", () => {
  beforeEach(() => {
    resetAllRateLimits();
  });

  it("permits request when check_ai_rate_limit RPC returns allowed: true", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: { allowed: true, remaining: 14, reset_ms: 60000 },
        error: null,
      }),
    };

    const result = await checkDistributedRateLimit("user-valid", "copilot", {
      maxRequests: 15,
      windowSeconds: 60,
      supabaseClient: mockSupabase,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(14);
    expect(result.resetMs).toBe(60000);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("check_ai_rate_limit", {
      p_user_id: "user-valid",
      p_action: "copilot",
      p_max_requests: 15,
      p_window_seconds: 60,
    });
  });

  it("rejects request when check_ai_rate_limit RPC returns allowed: false", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: { allowed: false, remaining: 0, reset_ms: 45000 },
        error: null,
      }),
    };

    const result = await checkDistributedRateLimit("user-valid", "copilot", {
      maxRequests: 15,
      windowSeconds: 60,
      supabaseClient: mockSupabase,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetMs).toBe(45000);
  });

  it("falls back to process-local rate limiter when RPC procedure is unprovisioned (error 42883)", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42883", message: "function check_ai_rate_limit does not exist" },
      }),
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkDistributedRateLimit("fallback-user", "copilot", {
      maxRequests: 15,
      windowSeconds: 60,
      supabaseClient: mockSupabase,
    });

    expect(result.allowed).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("fails closed when RPC returns unauthorized error 42501", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "Unauthorized: Caller identity does not match p_user_id." },
      }),
    };

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await checkDistributedRateLimit("spoofed-user", "copilot", {
      maxRequests: 15,
      windowSeconds: 60,
      supabaseClient: mockSupabase,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    errorSpy.mockRestore();
  });

  it("fails closed when RPC encounters generic database or network error", async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "08006", message: "connection failure" },
      }),
    };

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await checkDistributedRateLimit("user-db-down", "plan_generation", {
      maxRequests: 5,
      windowSeconds: 60,
      supabaseClient: mockSupabase,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    errorSpy.mockRestore();
  });

  it("fails closed when passed an invalid, empty, or whitespace identifier", async () => {
    const result1 = await checkDistributedRateLimit("", "copilot", {
      maxRequests: 15,
      windowSeconds: 60,
    });
    expect(result1.allowed).toBe(false);

    const result2 = await checkDistributedRateLimit("   ", "copilot", {
      maxRequests: 15,
      windowSeconds: 60,
    });
    expect(result2.allowed).toBe(false);
  });
});
