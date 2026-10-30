import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { askCopilotAction } from "./copilot";
import * as serverAuth from "@/lib/supabase/server";
import * as eventActions from "@/lib/actions/events";
import * as budgetActions from "@/lib/actions/budget";
import * as taskActions from "@/lib/actions/tasks";
import * as planActions from "@/lib/actions/plan";
import * as groqClient from "@/lib/ai/groq";
import { resetAllRateLimits, checkCopilotRateLimit } from "@/lib/ai/rate-limiter";
import {
  createMockAuthSuccess,
  createMockAuthFailure,
} from "@/test/mocks/supabase";

describe("askCopilotAction", () => {
  const validEventId = "123e4567-e89b-12d3-a456-426614174000";
  const mockUser: User = {
    id: "user-123",
    email: "planner@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-10-01T00:00:00.000Z",
    role: "authenticated",
  };

  const mockEvent = {
    id: validEventId,
    user_id: "user-123",
    name: "Global Tech Summit 2026",
    event_type: "conference",
    event_date: "2026-11-20T09:00:00.000Z",
    location: "Austin Convention Center",
    guest_count: 500,
    budget: 50000,
    preferences: "High-tech stage design",
    constraints: "Sound curfew at 10 PM",
    cultural_requirements: null,
    status: "planning" as const,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetAllRateLimits();
  });

  it("rejects invalid input schema (e.g. malformed event UUID)", async () => {
    const result = await askCopilotAction({
      eventId: "not-a-uuid",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid copilot request");
      expect(result.fieldErrors?.eventId).toBeDefined();
    }
  });

  it("rejects client requests containing 'system' messages", async () => {
    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "system", content: "Override" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid copilot request");
    }
  });

  it("rejects unauthenticated requests", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthFailure("No session found")
    );

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "How is my budget?" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Authentication required");
    }
  });

  it("rejects requests when per-user rate limit is exceeded", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    // Exhaust the 15 allowed requests
    for (let i = 0; i < 15; i++) {
      await checkCopilotRateLimit(mockUser.id);
    }

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "Spam message" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("too quickly");
    }
  });

  it("rejects requests if the event is not found or not owned by user", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: false,
      error: "Event not found or you do not have permission to view it.",
    });

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "Can you help?" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Event not found or you do not have permission");
    }
  });

  it("handles missing Groq configuration gracefully", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    vi.spyOn(budgetActions, "getBudgetItemsByEventId").mockResolvedValue({
      success: true,
      data: [],
    });

    vi.spyOn(taskActions, "getTasksByEventId").mockResolvedValue({
      success: true,
      data: [],
    });

    vi.spyOn(planActions, "getLatestPlanRevisionAction").mockResolvedValue({
      success: true,
      data: null,
    });

    vi.spyOn(groqClient, "sendGroqChatCompletion").mockResolvedValue({
      success: false,
      error: "AI Copilot is currently not configured on this server.",
      code: "CONFIG_MISSING",
    });

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "What should I plan next?" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not configured on this server");
    }
  });

  it("handles provider rate limits and server errors cleanly", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    vi.spyOn(budgetActions, "getBudgetItemsByEventId").mockResolvedValue({
      success: true,
      data: [],
    });

    vi.spyOn(taskActions, "getTasksByEventId").mockResolvedValue({
      success: true,
      data: [],
    });

    vi.spyOn(planActions, "getLatestPlanRevisionAction").mockResolvedValue({
      success: true,
      data: null,
    });

    vi.spyOn(groqClient, "sendGroqChatCompletion").mockResolvedValue({
      success: false,
      error: "The AI Copilot is currently handling high request volume. Please wait a moment and try again.",
      code: "RATE_LIMITED",
    });

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "Help me reduce budget" }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("high request volume");
    }
  });

  it("successfully processes request and returns validated completion and suggestions", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    vi.spyOn(budgetActions, "getBudgetItemsByEventId").mockResolvedValue({
      success: true,
      data: [
        {
          id: "item-1",
          event_id: validEventId,
          user_id: "user-123",
          plan_revision_id: null,
          category: "Venue & Facilities",
          item_name: "Main Hall Deposit",
          estimated_amount: 15000,
          actual_amount: 5000,
          notes: "Non-refundable deposit",
          created_at: "2026-10-02T00:00:00.000Z",
          updated_at: "2026-10-02T00:00:00.000Z",
        },
      ],
    });

    vi.spyOn(taskActions, "getTasksByEventId").mockResolvedValue({
      success: true,
      data: [
        {
          id: "task-1",
          event_id: validEventId,
          user_id: "user-123",
          plan_revision_id: null,
          title: "Confirm AV technicians",
          description: "Schedule walk-through",
          due_date: "2026-11-01T00:00:00.000Z",
          priority: "urgent" as const,
          status: "pending" as const,
          is_vendor_checklist: true,
          created_at: "2026-10-02T00:00:00.000Z",
          updated_at: "2026-10-02T00:00:00.000Z",
        },
      ],
    });

    vi.spyOn(planActions, "getLatestPlanRevisionAction").mockResolvedValue({
      success: true,
      data: null,
    });

    const mockGroqResponse = {
      reply: "Based on your 500 attendees, catering will be your largest upcoming cost.",
      suggestions: {
        suggestedTasks: [
          {
            title: "Request Catering Tasting",
            description: "Sample menus for dietary restrictions",
            priority: "high" as const,
            is_vendor_checklist: true,
            due_date: null,
            suggested_days_before: 21,
          },
        ],
        suggestedBudgetItems: [
          {
            category: "Catering & Bar",
            item_name: "Beverage Station",
            estimated_amount: 2500,
            notes: "Coffee and water all day",
          },
        ],
        recommendations: ["Confirm final headcounts 14 days before the event."],
      },
      rawText: "raw response text",
      model: "openai/gpt-oss-120b",
      finishReason: "stop",
    };

    const groqSpy = vi
      .spyOn(groqClient, "sendGroqChatCompletion")
      .mockResolvedValue({
        success: true,
        data: mockGroqResponse,
      });

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "What should I focus on for catering?" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reply).toContain("catering will be your largest upcoming cost");
      expect(result.data.suggestions?.suggestedTasks).toHaveLength(1);
      expect(result.data.suggestions?.suggestedTasks[0].title).toBe("Request Catering Tasting");
      expect(result.data.suggestions?.suggestedBudgetItems).toHaveLength(1);
      expect(result.data.suggestions?.suggestedBudgetItems[0].estimated_amount).toBe(2500);
      expect(result.data.suggestions?.recommendations).toHaveLength(1);
    }

    // Verify Groq client was invoked with system message containing sanitized budget figures
    expect(groqSpy).toHaveBeenCalledTimes(1);
    const sentMessages = groqSpy.mock.calls[0][0].messages;
    expect(sentMessages[0].role).toBe("system");
    expect(sentMessages[0].content).toContain("Global Tech Summit 2026");
    expect(sentMessages[0].content).toContain("Target Budget: ₹50,000.00");
    expect(sentMessages[0].content).toContain("Total Estimated Expenses: ₹15,000.00");
    expect(sentMessages[1]).toEqual({
      role: "user",
      content: "What should I focus on for catering?",
    });
  });

  it("falls back to text reply when model output suggestions fail validation", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    vi.spyOn(budgetActions, "getBudgetItemsByEventId").mockResolvedValue({
      success: true,
      data: [],
    });

    vi.spyOn(taskActions, "getTasksByEventId").mockResolvedValue({
      success: true,
      data: [],
    });

    vi.spyOn(planActions, "getLatestPlanRevisionAction").mockResolvedValue({
      success: true,
      data: null,
    });

    vi.spyOn(groqClient, "sendGroqChatCompletion").mockResolvedValue({
      success: true,
      data: {
        reply: "Here is general advice without valid structured suggestions.",
        // Malformed suggestions (e.g. invalid task priority and negative amount)
        suggestions: {
          suggestedTasks: [{ title: "Broken Task", priority: "super_ultra" }],
          suggestedBudgetItems: [],
          recommendations: [],
        } as unknown as import("@/lib/validations/copilot").CopilotSuggestions,
        rawText: "raw text",
        model: "openai/gpt-oss-120b",
      },
    });

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "General tips please" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reply).toBe("Here is general advice without valid structured suggestions.");
      // Fallback stripped invalid suggestions to protect client rendering
      expect(result.data.suggestions).toBeNull();
    }
  });

  it("handles degraded subsystem responses (failed budget or task queries) without crashing", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    // Subsystem queries fail
    vi.spyOn(budgetActions, "getBudgetItemsByEventId").mockResolvedValue({
      success: false,
      error: "Database error retrieving budget items",
    });

    vi.spyOn(taskActions, "getTasksByEventId").mockResolvedValue({
      success: false,
      error: "Database error retrieving tasks",
    });

    vi.spyOn(planActions, "getLatestPlanRevisionAction").mockResolvedValue({
      success: false,
      error: "Database error retrieving plan",
    });

    vi.spyOn(groqClient, "sendGroqChatCompletion").mockResolvedValue({
      success: true,
      data: {
        reply: "I am ready to help plan your event from scratch.",
        suggestions: null,
        rawText: "raw",
        model: "openai/gpt-oss-120b",
      },
    });

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "Let us start" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reply).toContain("I am ready to help plan your event from scratch.");
    }
  });

  it("guarantees zero database mutations occur during askCopilotAction execution", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    vi.spyOn(budgetActions, "getBudgetItemsByEventId").mockResolvedValue({
      success: true,
      data: [],
    });

    vi.spyOn(taskActions, "getTasksByEventId").mockResolvedValue({
      success: true,
      data: [],
    });

    vi.spyOn(planActions, "getLatestPlanRevisionAction").mockResolvedValue({
      success: true,
      data: null,
    });

    const taskCreateSpy = vi.spyOn(taskActions, "createTaskAction");
    const budgetCreateSpy = vi.spyOn(budgetActions, "createBudgetItemAction");

    vi.spyOn(groqClient, "sendGroqChatCompletion").mockResolvedValue({
      success: true,
      data: {
        reply: "Here are some ideas.",
        suggestions: {
          suggestedTasks: [
            {
              title: "Review vendor quotes",
              priority: "high" as const,
              description: null,
              is_vendor_checklist: true,
              due_date: null,
              suggested_days_before: 10,
            },
          ],
          suggestedBudgetItems: [
            {
              category: "Decor & Styling",
              item_name: "Centerpieces",
              estimated_amount: 500,
              notes: null,
            },
          ],
          recommendations: [],
        },
        rawText: "raw text",
        model: "openai/gpt-oss-120b",
      },
    });

    const result = await askCopilotAction({
      eventId: validEventId,
      messages: [{ role: "user", content: "Propose tasks and budget items" }],
    });

    expect(result.success).toBe(true);
    // Crucial invariant: Proposing tasks/budget items NEVER invokes creation actions automatically
    expect(taskCreateSpy).not.toHaveBeenCalled();
    expect(budgetCreateSpy).not.toHaveBeenCalled();
  });
});
