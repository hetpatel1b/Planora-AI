import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEventPlanAction } from "./plan";
import * as serverAuth from "@/lib/supabase/server";
import * as eventActions from "@/lib/actions/events";
import * as groqClient from "@/lib/ai/groq";

describe("generateEventPlanAction", () => {
  const validEventId = "123e4567-e89b-12d3-a456-426614174000";
  const mockUser = { id: "user-123", email: "organizer@example.com" };

  const weddingEvent = {
    id: validEventId,
    user_id: "user-123",
    name: "Priya & Rohan's Wedding",
    event_type: "wedding",
    event_date: "2026-12-15T18:00:00.000Z",
    location: "Heritage Palace Gardens",
    guest_count: 300,
    budget: 1500000,
    preferences: "Traditional regal aesthetic with floral mandap",
    constraints: "Sound curfew at 10:30 PM",
    cultural_requirements: "Pure vegetarian banquet",
    status: "planning" as const,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };

  const birthdayEvent = {
    id: validEventId,
    user_id: "user-123",
    name: "Arjun's 10th Birthday Bash",
    event_type: "birthday",
    event_date: "2026-11-20T16:00:00.000Z",
    location: "Skyline Club Lounge",
    guest_count: 50,
    budget: 75000,
    preferences: "Superhero carnival with interactive games",
    constraints: "Outside decorators must complete load-in by 2 PM",
    cultural_requirements: "Eggless chocolate cake",
    status: "planning" as const,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };

  const communityEvent = {
    id: validEventId,
    user_id: "user-123",
    name: "Greenwood Community Diwali Mela",
    event_type: "community",
    event_date: "2026-11-05T17:00:00.000Z",
    location: "Greenwood Central Park",
    guest_count: 800,
    budget: 200000,
    preferences: "Eco-friendly clay diyas, folk dance stage, and local craft stalls",
    constraints: "Municipal public ground clearance needed",
    cultural_requirements: "Strictly vegetarian community street food",
    status: "planning" as const,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GROQ_API_KEY;
  });

  const mockAuthSuccess = () =>
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue({
      data: { user: mockUser as unknown as import("@supabase/supabase-js").User },
      error: null,
    });

  it("rejects invalid event UUID format", async () => {
    const result = await generateEventPlanAction("invalid-uuid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid event ID");
    }
  });

  it("rejects unauthenticated requests", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue({
      data: { user: null },
      error: null as unknown as import("@supabase/supabase-js").AuthError,
    });

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Authentication required");
    }
  });

  it("generates deterministic plan blueprint for wedding when Groq API key is absent", async () => {
    mockAuthSuccess();

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: weddingEvent,
    });

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.source).toBe("deterministic");
      expect(result.data.summary).toContain(weddingEvent.name);
      expect(result.data.themes.length).toBeGreaterThan(0);
      expect(result.data.suggestedTasks.length).toBeGreaterThan(0);
      expect(result.data.proposedBudgetItems.length).toBeGreaterThan(0);

      // Verify vendor checklist flags exist
      const vendorTasks = result.data.suggestedTasks.filter((t) => t.is_vendor_checklist);
      expect(vendorTasks.length).toBeGreaterThan(0);
    }
  });

  it("generates first-class birthday blueprint with cake and entertainment milestones", async () => {
    mockAuthSuccess();

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: birthdayEvent,
    });

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.source).toBe("deterministic");
      expect(result.data.metadata.promptSummary).toContain("Birthday Celebration");

      // Verify birthday tasks include custom cake and entertainment
      const taskTitles = result.data.suggestedTasks.map((t) => t.title.toLowerCase());
      expect(taskTitles.some((t) => t.includes("cake"))).toBe(true);
      expect(taskTitles.some((t) => t.includes("entertain") || t.includes("dj"))).toBe(true);

      // Verify theme incorporates user preferences
      expect(result.data.themes[0]).toContain("Superhero carnival");
    }
  });

  it("generates first-class community event blueprint with permits, staging, and sanitation", async () => {
    mockAuthSuccess();

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: communityEvent,
    });

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.source).toBe("deterministic");
      expect(result.data.metadata.promptSummary).toContain("Community Event");

      // Verify community tasks include municipal permits and staging/sound
      const taskTitles = result.data.suggestedTasks.map((t) => t.title.toLowerCase());
      expect(taskTitles.some((t) => t.includes("permit"))).toBe(true);
      expect(taskTitles.some((t) => t.includes("stage") || t.includes("sound") || t.includes("pa"))).toBe(true);
    }
  });

  it("uses Groq AI when configured and returns an AI-synthesized blueprint", async () => {
    process.env.GROQ_API_KEY = "gsk_test_mock_key";

    mockAuthSuccess();

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: weddingEvent,
    });

    const mockAiPlan = {
      summary: "AI-architected royal wedding plan balancing grand tradition and bespoke hospitality.",
      themes: [
        "Jodhpur Starlight Grandeur — Candlelit lanterns, raw silk drape, and royal marigold cascades",
      ],
      scheduleMilestones: [
        {
          title: "Palace Lawn & Vendor Lock",
          timeframe: "6 Months Prior",
          description: "Contract palace grounds and sound clearances.",
          suggested_date: "2026-06-15",
        },
      ],
      suggestedTasks: [
        {
          title: "Finalize palace lawn contract and sound permit",
          description: "Verify sound curfew at 10:30 PM.",
          priority: "urgent",
          category: "Venue & Facilities",
          is_vendor_checklist: true,
          suggested_days_before: 180,
        },
      ],
      proposedBudgetItems: [
        {
          category: "Venue & Facilities",
          item_name: "Palace Lawn Rental",
          estimated_amount: 600000,
          notes: "Full ground booking fee.",
        },
        {
          category: "Catering & Bar",
          item_name: "Royal Pure Vegetarian Banquet",
          estimated_amount: 900000,
          notes: "300 guests full service.",
        },
      ],
      keyRecommendations: [
        "Position welcome counters at palace gates with rosewater mist.",
      ],
    };

    vi.spyOn(groqClient, "sendGroqChatCompletion").mockResolvedValue({
      success: true,
      data: {
        reply: "Here is your plan.",
        suggestions: null,
        rawText: JSON.stringify(mockAiPlan),
        model: "openai/gpt-oss-120b",
      },
    });

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.source).toBe("ai");
      expect(result.data.metadata.model).toBe("openai/gpt-oss-120b");
      expect(result.data.summary).toContain("AI-architected royal wedding plan");
      expect(result.data.suggestedTasks[0].is_vendor_checklist).toBe(true);
    }
  });

  it("gracefully falls back to deterministic engine when Groq returns an error", async () => {
    process.env.GROQ_API_KEY = "gsk_test_mock_key";

    mockAuthSuccess();

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: birthdayEvent,
    });

    vi.spyOn(groqClient, "sendGroqChatCompletion").mockResolvedValue({
      success: false,
      error: "Rate limited by upstream provider",
      code: "RATE_LIMITED",
    });

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.source).toBe("deterministic");
      expect(result.data.summary).toContain(birthdayEvent.name);
    }
  });

  it("gracefully falls back to deterministic engine when Groq returns unparseable text", async () => {
    process.env.GROQ_API_KEY = "gsk_test_mock_key";

    mockAuthSuccess();

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: weddingEvent,
    });

    vi.spyOn(groqClient, "sendGroqChatCompletion").mockResolvedValue({
      success: true,
      data: {
        reply: "I am unable to format this in JSON right now.",
        suggestions: null,
        rawText: "Plain unparseable conversational prose without JSON",
        model: "openai/gpt-oss-120b",
      },
    });

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.source).toBe("deterministic");
      expect(result.data.summary).toContain(weddingEvent.name);
    }
  });
});
