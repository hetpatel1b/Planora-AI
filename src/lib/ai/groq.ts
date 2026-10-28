import {
  copilotResponseEnvelopeSchema,
  type CopilotSuggestions,
} from "@/lib/validations/copilot";

/**
 * Planora AI — Server-Only Groq AI Client (Phase 5)
 *
 * Provides a resilient, secure client for Groq's OpenAI-compatible completions API.
 * Uses native fetch with finite timeout, structured error categorization, and safe
 * response parsing.
 *
 * Security Invariants:
 * - Strictly server-side execution.
 * - API keys and headers are NEVER logged or returned to callers.
 * - Raw provider dumps and internal traces are sanitized into user-safe errors.
 * - Finite request timeout (~30s) prevents hung worker threads.
 * - Model suggestions remain advisory data (zero database write operations).
 */

// Guard against browser execution
if (typeof window !== "undefined") {
  throw new Error("Groq client can only be executed in a server environment.");
}

export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
export const GROQ_API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_DEFAULT_TIMEOUT_MS = 30000;

export type GroqErrorCode =
  | "CONFIG_MISSING"
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "NETWORK_TIMEOUT"
  | "NETWORK_ERROR"
  | "RESPONSE_MALFORMED"
  | "VALIDATION_ERROR";

export interface GroqCompletionResult {
  reply: string;
  suggestions: CopilotSuggestions | null;
  rawText: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export type GroqChatCompletionResponse =
  | {
      success: true;
      data: GroqCompletionResult;
    }
  | {
      success: false;
      error: string;
      code: GroqErrorCode;
    };

export interface GroqChatMessageInput {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatCompletionOptions {
  messages: GroqChatMessageInput[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Robustly parses and validates completion content from the model.
 *
 * Parsing Strategy:
 * 1. Checks if the raw text is a valid JSON envelope directly.
 * 2. If not, inspects text for markdown code fence (```json ... ``` or ``` ... ```).
 * 3. Validates structured JSON against copilotResponseEnvelopeSchema.
 * 4. Fallback: If no valid JSON envelope exists, returns the raw text as `reply`
 *    with `suggestions: null` so the user still receives helpful assistance.
 */
export function parseCopilotContent(rawContent: string): {
  reply: string;
  suggestions: CopilotSuggestions | null;
} {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return { reply: "I received your message, but no content was generated.", suggestions: null };
  }

  // 1. Direct JSON parse attempt
  try {
    const directObj = JSON.parse(trimmed);
    const parsed = copilotResponseEnvelopeSchema.safeParse(directObj);
    if (parsed.success) {
      return {
        reply: parsed.data.reply,
        suggestions: parsed.data.suggestions ?? null,
      };
    }
  } catch {
    // Continue to markdown extraction
  }

  // 2. Extract from markdown code fences: ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const extractedObj = JSON.parse(codeBlockMatch[1].trim());
      const parsed = copilotResponseEnvelopeSchema.safeParse(extractedObj);
      if (parsed.success) {
        return {
          reply: parsed.data.reply,
          suggestions: parsed.data.suggestions ?? null,
        };
      }
    } catch {
      // Continue to bracket search
    }
  }

  // 3. Search for outermost JSON object brackets { ... }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const candidateStr = trimmed.slice(firstBrace, lastBrace + 1);
      const candidateObj = JSON.parse(candidateStr);
      const parsed = copilotResponseEnvelopeSchema.safeParse(candidateObj);
      if (parsed.success) {
        return {
          reply: parsed.data.reply,
          suggestions: parsed.data.suggestions ?? null,
        };
      }
    } catch {
      // Continue to fallback
    }
  }

  // 4. Safe fallback: pure markdown/plain text response without structured suggestions
  return {
    reply: trimmed,
    suggestions: null,
  };
}

/**
 * Sends a chat completion request to Groq's API endpoint.
 *
 * Guarantees:
 * - Server-only execution.
 * - Never throws uncaught exceptions: returns typed GroqChatCompletionResponse.
 * - Never leaks API keys, headers, or internal tracebacks.
 * - Handles missing env configuration without crashing callers.
 */
export async function sendGroqChatCompletion(
  options: GroqChatCompletionOptions
): Promise<GroqChatCompletionResponse> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      error: "AI Copilot is currently not configured on this server. Please contact your administrator.",
      code: "CONFIG_MISSING",
    };
  }

  const model =
    options.model?.trim() ||
    process.env.GROQ_MODEL?.trim() ||
    GROQ_DEFAULT_MODEL;

  const timeoutMs = options.timeoutMs ?? GROQ_DEFAULT_TIMEOUT_MS;

  // Configure timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1500,
    };

    const response = await fetch(GROQ_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Categorize HTTP status codes
    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "AI service authentication failed. Please verify API configuration.",
          code: "AUTHENTICATION_FAILED",
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "The AI Copilot is currently handling high request volume. Please wait a moment and try again.",
          code: "RATE_LIMITED",
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          error: "The AI service is temporarily unavailable. Please try again shortly.",
          code: "PROVIDER_ERROR",
        };
      }

      return {
        success: false,
        error: `AI provider returned an unexpected status (${response.status}). Please try again later.`,
        code: "PROVIDER_ERROR",
      };
    }

    // Parse JSON payload
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return {
        success: false,
        error: "The AI provider returned an unreadable response format.",
        code: "RESPONSE_MALFORMED",
      };
    }

    // Inspect provider structure
    if (
      typeof json !== "object" ||
      json === null ||
      !("choices" in json) ||
      !Array.isArray((json as { choices: unknown }).choices) ||
      (json as { choices: unknown[] }).choices.length === 0
    ) {
      return {
        success: false,
        error: "The AI provider response was missing expected completion choices.",
        code: "RESPONSE_MALFORMED",
      };
    }

    const firstChoice = (
      json as {
        choices: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      }
    ).choices[0];

    const rawContent = firstChoice.message?.content;
    if (typeof rawContent !== "string") {
      return {
        success: false,
        error: "The AI provider returned an empty completion message.",
        code: "RESPONSE_MALFORMED",
      };
    }

    const { reply, suggestions } = parseCopilotContent(rawContent);

    return {
      success: true,
      data: {
        reply,
        suggestions,
        rawText: rawContent,
        model,
        finishReason: firstChoice.finish_reason,
        usage: json && "usage" in json && typeof (json as { usage: unknown }).usage === "object"
          ? {
              promptTokens: (json as { usage?: { prompt_tokens?: number } }).usage?.prompt_tokens,
              completionTokens: (json as { usage?: { completion_tokens?: number } }).usage?.completion_tokens,
              totalTokens: (json as { usage?: { total_tokens?: number } }).usage?.total_tokens,
            }
          : undefined,
      },
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const isAbort =
      (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) ||
      controller.signal.aborted;

    if (isAbort) {
      return {
        success: false,
        error: `The AI Copilot request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please try a shorter query.`,
        code: "NETWORK_TIMEOUT",
      };
    }

    return {
      success: false,
      error: "Unable to reach the AI provider network. Please check connectivity and try again.",
      code: "NETWORK_ERROR",
    };
  }
}
