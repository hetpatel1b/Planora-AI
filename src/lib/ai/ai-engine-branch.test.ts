import { describe, it, expect, vi } from "vitest";
import {
  SlidingWindowRateLimiter,
  checkDistributedRateLimit,
  type SupabaseRpcClient,
} from "./rate-limiter";
import {
  parseCopilotContent,
  sendGroqChatCompletion,
} from "./groq";

describe("AI Engine & Rate Limiter Branch Coverage", () => {
  describe("SlidingWindowRateLimiter branches", () => {
    it("triggers memory cleanup when hits.size exceeds 2000", () => {
      const limiter = new SlidingWindowRateLimiter({ maxRequests: 10, windowMs: 60000 });

      // Pre-fill 2005 keys with old timestamps
      const pastTime = Date.now() - 120000;
      for (let i = 0; i < 2005; i++) {
        (limiter as unknown as { hits: Map<string, number[]> }).hits.set(`user-${i}`, [pastTime]);
      }

      // Next check triggers cleanup because size > 2000
      const res = limiter.check("new-user");
      expect(res.allowed).toBe(true);

      // The 2005 stale keys should have been purged during cleanup
      const currentSize = (limiter as unknown as { hits: Map<string, number[]> }).hits.size;
      expect(currentSize).toBeLessThan(100);
    });
  });

  describe("checkDistributedRateLimit distributed RPC branches", () => {
    it("handles non-standard data types returned by RPC gracefully", async () => {
      const mockClient: SupabaseRpcClient = {
        rpc: vi.fn().mockResolvedValue({
          data: {
            allowed: "not-a-boolean",
            remaining: "not-a-number",
            reset_ms: null,
          },
          error: null,
        }),
      };

      const res = await checkDistributedRateLimit("test-user-1", "copilot", {
        supabaseClient: mockClient,
        maxRequests: 5,
        windowSeconds: 60,
      });

      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
      expect(res.resetMs).toBe(0);
    });

    it("falls back to local limiter when RPC error code is 42883 on plan_generation", async () => {
      const mockClient: SupabaseRpcClient = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "42883", message: "function check_ai_rate_limit does not exist" },
        }),
      };

      const res = await checkDistributedRateLimit("test-user-plan", "plan_generation", {
        supabaseClient: mockClient,
        maxRequests: 5,
        windowSeconds: 60,
      });

      expect(res.allowed).toBe(true);
      expect(res.remaining).toBeGreaterThan(0);
    });

    it("fails closed when RPC error code is 42501 (unauthorized)", async () => {
      const mockClient: SupabaseRpcClient = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "42501", message: "permission denied for function check_ai_rate_limit" },
        }),
      };

      const res = await checkDistributedRateLimit("test-user-unauth", "copilot", {
        supabaseClient: mockClient,
        maxRequests: 5,
        windowSeconds: 60,
      });

      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
    });

    it("fails closed when RPC returns generic database error", async () => {
      const mockClient: SupabaseRpcClient = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "57014", message: "statement timeout" },
        }),
      };

      const res = await checkDistributedRateLimit("test-user-timeout", "copilot", {
        supabaseClient: mockClient,
        maxRequests: 5,
        windowSeconds: 60,
      });

      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
    });

    it("fails closed when RPC client throws an unhandled exception", async () => {
      const mockClient: SupabaseRpcClient = {
        rpc: vi.fn().mockRejectedValue(new Error("Network connection killed")),
      };

      const res = await checkDistributedRateLimit("test-user-throw", "copilot", {
        supabaseClient: mockClient,
        maxRequests: 5,
        windowSeconds: 60,
      });

      expect(res.allowed).toBe(false);
      expect(res.remaining).toBe(0);
    });
  });

  describe("groq.ts response parsing and status branches", () => {
    it("handles parseCopilotContent code fence with JSON and null suggestions", () => {
      const raw = `
\`\`\`json
{
  "reply": "Here is advice on vendor negotiation.",
  "suggestions": null
}
\`\`\`
      `;
      const parsed = parseCopilotContent(raw);
      expect(parsed.reply).toBe("Here is advice on vendor negotiation.");
      expect(parsed.suggestions).toBeNull();
    });

    it("handles parseCopilotContent outermost bracket fallback with suggestions omitted", () => {
      const raw = `Sure! {"reply": "Book your caterer six months early."} Hope that helps!`;
      const parsed = parseCopilotContent(raw);
      expect(parsed.reply).toBe("Book your caterer six months early.");
      expect(parsed.suggestions).toBeNull();
    });

    it("handles parseCopilotContent plain unstructured reply without brackets", () => {
      const raw = `This is a raw conversational reply from the AI without any JSON formatting.`;
      const parsed = parseCopilotContent(raw);
      expect(parsed.reply).toBe(raw);
      expect(parsed.suggestions).toBeNull();
    });

    it("handles HTTP 400 unexpected status in sendGroqChatCompletion", async () => {
      const originalFetch = globalThis.fetch;
      const originalApiKey = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = "gsk_test_api_key_valid";

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue("Bad Request"),
      }) as unknown as typeof fetch;

      try {
        const res = await sendGroqChatCompletion({
          messages: [{ role: "user", content: "Test prompt" }],
        });

        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.code).toBe("PROVIDER_ERROR");
          expect(res.error).toContain("unexpected status (400)");
        }
      } finally {
        globalThis.fetch = originalFetch;
        process.env.GROQ_API_KEY = originalApiKey;
      }
    });

    it("handles non-string message content in completion choice in sendGroqChatCompletion", async () => {
      const originalFetch = globalThis.fetch;
      const originalApiKey = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = "gsk_test_api_key_valid";

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: null, // non-string content
              },
            },
          ],
        }),
      }) as unknown as typeof fetch;

      try {
        const res = await sendGroqChatCompletion({
          messages: [{ role: "user", content: "Test prompt" }],
        });

        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.code).toBe("RESPONSE_MALFORMED");
          expect(res.error).toContain("empty completion message");
        }
      } finally {
        globalThis.fetch = originalFetch;
        process.env.GROQ_API_KEY = originalApiKey;
      }
    });
  });
});
