import { describe, it, expect, beforeEach } from "vitest";
import {
  SlidingWindowRateLimiter,
  checkCopilotRateLimit,
  checkPlanGenerationRateLimit,
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

  it("checkCopilotRateLimit enforces 15 requests per minute", () => {
    const user = "copilot-tester";
    for (let i = 0; i < 15; i++) {
      expect(checkCopilotRateLimit(user).allowed).toBe(true);
    }
    const blocked = checkCopilotRateLimit(user);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("checkPlanGenerationRateLimit enforces 5 requests per minute", () => {
    const user = "plan-tester";
    for (let i = 0; i < 5; i++) {
      expect(checkPlanGenerationRateLimit(user).allowed).toBe(true);
    }
    const blocked = checkPlanGenerationRateLimit(user);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
