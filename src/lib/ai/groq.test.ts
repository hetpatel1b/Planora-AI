import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sendGroqChatCompletion,
  parseCopilotContent,
  GROQ_DEFAULT_MODEL,
} from "./groq";

describe("parseCopilotContent", () => {
  it("parses direct JSON with reply and suggestions", () => {
    const raw = JSON.stringify({
      reply: "Here is your plan recommendation.",
      suggestions: {
        suggestedTasks: [{ title: "Order Cake", priority: "medium" }],
        suggestedBudgetItems: [
          { category: "Catering", item_name: "Cake", estimated_amount: 300 },
        ],
        recommendations: ["Ensure delivery 2 hours prior."],
      },
    });

    const parsed = parseCopilotContent(raw);
    expect(parsed.reply).toBe("Here is your plan recommendation.");
    expect(parsed.suggestions?.suggestedTasks).toHaveLength(1);
    expect(parsed.suggestions?.suggestedBudgetItems).toHaveLength(1);
    expect(parsed.suggestions?.recommendations).toHaveLength(1);
  });

  it("extracts JSON embedded inside markdown code fence", () => {
    const raw = `Here is my thought:
\`\`\`json
{
  "reply": "We should adjust the catering allocation.",
  "suggestions": {
    "suggestedBudgetItems": [
      { "category": "Catering & Bar", "item_name": "Buffet", "estimated_amount": 1500 }
    ]
  }
}
\`\`\`
Let me know if this looks good.`;

    const parsed = parseCopilotContent(raw);
    expect(parsed.reply).toBe("We should adjust the catering allocation.");
    expect(parsed.suggestions?.suggestedBudgetItems).toHaveLength(1);
    expect(parsed.suggestions?.suggestedBudgetItems[0].estimated_amount).toBe(1500);
  });

  it("safely falls back to raw text as reply when no JSON is present", () => {
    const raw = "I recommend considering outdoor lighting and tent rentals for an evening gala.";
    const parsed = parseCopilotContent(raw);
    expect(parsed.reply).toBe(raw);
    expect(parsed.suggestions).toBeNull();
  });

  it("safely falls back when JSON is malformed or invalid", () => {
    const raw = "{ invalid json content ... ";
    const parsed = parseCopilotContent(raw);
    expect(parsed.reply).toBe(raw.trim());
    expect(parsed.suggestions).toBeNull();
  });

  it("handles empty or whitespace-only input gracefully", () => {
    const parsed = parseCopilotContent("   ");
    expect(parsed.reply).toContain("no content was generated");
    expect(parsed.suggestions).toBeNull();
  });
});

describe("sendGroqChatCompletion", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns CONFIG_MISSING when GROQ_API_KEY is not set", async () => {
    delete process.env.GROQ_API_KEY;

    const result = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("CONFIG_MISSING");
      expect(result.error).toContain("not configured on this server");
    }
  });

  it("handles successful 200 response with completion data", async () => {
    process.env.GROQ_API_KEY = "gsk_test_mock_key";

    const mockResponsePayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              reply: "Here is your suggested task.",
              suggestions: {
                suggestedTasks: [{ title: "Reserve AV equipment" }],
              },
            }),
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 80,
        total_tokens: 200,
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponsePayload,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Help me with AV" }],
      model: "openai/gpt-oss-120b",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reply).toBe("Here is your suggested task.");
      expect(result.data.suggestions?.suggestedTasks).toHaveLength(1);
      expect(result.data.model).toBe("openai/gpt-oss-120b");
      expect(result.data.usage?.totalTokens).toBe(200);
    }

    // Verify fetch was called with Authorization header and correct body
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(requestInit.headers.Authorization).toBe("Bearer gsk_test_mock_key");
  });

  it("categorizes HTTP 401 as AUTHENTICATION_FAILED without leaking secrets", async () => {
    process.env.GROQ_API_KEY = "gsk_invalid_secret_key_123";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Invalid API Key" } }),
      })
    );

    const result = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("AUTHENTICATION_FAILED");
      expect(result.error).toContain("authentication failed");
      expect(result.error).not.toContain("gsk_invalid_secret_key_123");
    }
  });

  it("categorizes HTTP 429 as RATE_LIMITED", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Rate limit reached" } }),
      })
    );

    const result = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("RATE_LIMITED");
      expect(result.error).toContain("high request volume");
    }
  });

  it("categorizes HTTP 500/503 as PROVIDER_ERROR", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: "Service Unavailable" } }),
      })
    );

    const result = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PROVIDER_ERROR");
      expect(result.error).toContain("temporarily unavailable");
    }
  });

  it("categorizes network abort / timeout as NETWORK_TIMEOUT", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key";

    const timeoutError = new Error("The operation was aborted");
    timeoutError.name = "AbortError";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(timeoutError)
    );

    const result = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
      timeoutMs: 1000,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("NETWORK_TIMEOUT");
      expect(result.error).toContain("timed out");
    }
  });

  it("categorizes general fetch network error as NETWORK_ERROR", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Failed to fetch (DNS resolution failed)"))
    );

    const result = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("NETWORK_ERROR");
      expect(result.error).toContain("Unable to reach the AI provider network");
    }
  });

  it("categorizes malformed responses as RESPONSE_MALFORMED", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key";

    // 1. Invalid JSON body
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Unexpected token < in JSON");
        },
      })
    );

    const result1 = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
    });
    expect(result1.success).toBe(false);
    if (!result1.success) {
      expect(result1.code).toBe("RESPONSE_MALFORMED");
    }

    // 2. Missing choices array
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ unexpected: true }),
      })
    );

    const result2 = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hi" }],
    });
    expect(result2.success).toBe(false);
    if (!result2.success) {
      expect(result2.code).toBe("RESPONSE_MALFORMED");
    }
  });

  it("falls back to default model if not provided", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key";
    delete process.env.GROQ_MODEL;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "I am ready." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendGroqChatCompletion({
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe(GROQ_DEFAULT_MODEL);
    }
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe(GROQ_DEFAULT_MODEL);
  });
});
