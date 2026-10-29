import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateEventPlanAction,
  acceptPlanBlueprintAction,
  getLatestPlanRevisionAction,
} from "./plan";
import * as serverAuth from "@/lib/supabase/server";
import * as eventActions from "@/lib/actions/events";
import * as groqClient from "@/lib/ai/groq";
import { revalidatePath } from "next/cache";
import { resetAllRateLimits, checkPlanGenerationRateLimit } from "@/lib/ai/rate-limiter";
import {
  createMockSupabaseClient,
  MOCK_USER,
  TEST_IDS,
} from "@/test/mocks/supabase";
import type { AIPlanBlueprint, PlanRevisionRow } from "@/lib/validations/plan";
import type { EventRow } from "@/lib/validations/event";
import type { Json } from "@/types/database.types";
import type { UserResponse, AuthError, SupabaseClient } from "@supabase/supabase-js";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

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
    resetAllRateLimits();
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
      error: null as unknown as AuthError,
    });

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Authentication required");
    }
  });

  it("rejects plan generation requests when rate limit threshold is exceeded", async () => {
    mockAuthSuccess();

    // Exhaust 5 permitted plan generation requests
    for (let i = 0; i < 5; i++) {
      checkPlanGenerationRateLimit(mockUser.id);
    }

    const result = await generateEventPlanAction(validEventId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("rate limit exceeded");
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

describe("acceptPlanBlueprintAction", () => {
  const validEventId = TEST_IDS.eventId;

  const mockEventRow: EventRow = {
    id: validEventId,
    user_id: MOCK_USER.id,
    name: "Tech Gala & Awards 2026",
    event_type: "gala",
    event_date: "2026-11-20T18:00:00.000Z",
    location: "Metropolitan Hall",
    guest_count: 250,
    budget: 45000,
    preferences: null,
    constraints: null,
    cultural_requirements: null,
    status: "planning",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };

  const sampleBlueprint: AIPlanBlueprint = {
    summary: "Comprehensive gala blueprint balancing stage awards, cocktail reception, and live orchestra.",
    themes: ["Starlight Elegance", "Midnight Blue and Gold"],
    scheduleMilestones: [
      {
        title: "Stage & Sound Setup",
        timeframe: "4 Hours Prior",
        description: "Complete mic checks and lighting run-through",
        suggested_date: "2026-11-20",
      },
    ],
    suggestedTasks: [
      {
        title: "Confirm stage sound engineer",
        description: "Review wireless lapel mic channels",
        priority: "urgent",
        category: "Entertainment & AV",
        is_vendor_checklist: true,
        suggested_days_before: 14,
      },
      {
        title: "Finalize award trophies engraving",
        description: "Inspect typography and logo placement",
        priority: "high",
        category: "Favors & Gifts",
        is_vendor_checklist: false,
        suggested_days_before: 21,
      },
    ],
    proposedBudgetItems: [
      {
        category: "Venue & Facilities",
        item_name: "Grand Ballroom Rental",
        estimated_amount: 15000,
        notes: "Full evening booking",
      },
      {
        category: "Entertainment & AV",
        item_name: "Live Orchestra Quartet",
        estimated_amount: 8000,
        notes: "3-hour performance",
      },
    ],
    keyRecommendations: [
      "Position registration desks inside the outer lobby to prevent queue congestion.",
    ],
    metadata: {
      source: "ai",
      model: "openai/gpt-oss-120b",
      generatedAt: "2026-10-01T00:00:00.000Z",
      promptSummary: "Tech Gala & Awards",
    },
  };

  const sampleRevisionRow: PlanRevisionRow = {
    id: TEST_IDS.planRevisionId,
    event_id: validEventId,
    user_id: MOCK_USER.id,
    revision_number: 1,
    structured_plan: sampleBlueprint as unknown as Json,
    summary: sampleBlueprint.summary,
    is_active: true,
    created_at: "2026-10-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const setupAuthSuccess = () => {
    return vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    } as unknown as UserResponse);
  };

  const setupAuthFailure = () => {
    return vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue({
      data: { user: null },
      error: { message: "No session", name: "AuthError", status: 401 } as unknown as AuthError,
    } as unknown as UserResponse);
  };

  it("rejects invalid input schema (missing eventId or malformed blueprint)", async () => {
    const result = await acceptPlanBlueprintAction({
      eventId: "not-a-valid-uuid",
      blueprint: { summary: "Too short" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid plan acceptance request");
      expect(result.fieldErrors).toBeDefined();
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    setupAuthFailure();

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Authentication required to accept plan blueprint");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("enforces event ownership check and rejects if event is not found or not owned by user", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: false,
      error: "Event not found or you do not have permission to view it.",
    });

    const mockSupabase = createMockSupabaseClient();
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Event not found or you do not have permission");
    }

    // Verify atomic RPC was never called
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects out-of-bounds selected task indexes", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient();
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [99], // out of bounds (max is 1)
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("out of bounds");
    }
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects duplicate task selections", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient();
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0, 0], // duplicate
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Duplicate task selections are not permitted");
    }
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects out-of-bounds selected budget item indexes", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient();
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [99], // out of bounds
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("out of bounds");
    }
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects duplicate budget item selections", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient();
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [1, 1], // duplicate
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Duplicate budget item selections are not permitted");
    }
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("successfully invokes atomic RPC with mapped tasks, due dates, budget items, and revalidates event route", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient({
      rpcData: sampleRevisionRow,
      rpcError: null,
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0, 1],
      selectedBudgetItemIndexes: [0, 1],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(sampleRevisionRow);
    }

    // Verify RPC invocation contract
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcPayload] = mockSupabase.rpc.mock.calls[0] as [string, { p_event_id: string; p_user_id: string; p_summary: string; p_tasks: unknown[]; p_budget_items: unknown[] }];
    expect(rpcName).toBe("accept_plan_blueprint");
    expect(rpcPayload.p_event_id).toBe(validEventId);
    expect(rpcPayload.p_user_id).toBe(MOCK_USER.id);
    expect(rpcPayload.p_summary).toBe(sampleBlueprint.summary);

    // Verify task payload was prepared and due_date calculated relative to event_date (2026-11-20 minus 14 days = 2026-11-06)
    const tasks = rpcPayload.p_tasks as Record<string, unknown>[];
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("Confirm stage sound engineer");
    expect(tasks[0].priority).toBe("urgent");
    expect(tasks[0].status).toBe("pending");
    expect(tasks[0].is_vendor_checklist).toBe(true);
    expect(tasks[0].due_date).toBeDefined();

    // Verify budget items payload was prepared
    const budgetItems = rpcPayload.p_budget_items as Record<string, unknown>[];
    expect(budgetItems).toHaveLength(2);
    expect(budgetItems[0].category).toBe("Venue & Facilities");
    expect(budgetItems[0].item_name).toBe("Grand Ballroom Rental");
    expect(budgetItems[0].estimated_amount).toBe(15000);
    expect(budgetItems[0].actual_amount).toBe(0);

    // Verify route revalidation occurred
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/events/${validEventId}`);
  });

  it("handles concurrency conflict (error code 23505) from atomic RPC cleanly", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient({
      rpcData: null,
      rpcError: { code: "23505", message: "unique constraint violation" },
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("conflict occurred due to concurrent updates");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("handles event not found / access denied (error code P0002) from RPC", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient({
      rpcData: null,
      rpcError: { code: "P0002", message: "Event not found" },
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Event not found or access denied");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("handles unauthorized error (code 42501) from RPC", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient({
      rpcData: null,
      rpcError: { code: "42501", message: "insufficient_privilege" },
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unauthorized to accept plan blueprint for this event");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("handles generic RPC database failure without partial changes or revalidation", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient({
      rpcData: null,
      rpcError: { code: "XX000", message: "Internal server transaction error" },
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Failed to apply plan revision");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns error when RPC returns no data", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient({
      rpcData: null,
      rpcError: null,
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await acceptPlanBlueprintAction({
      eventId: validEventId,
      blueprint: sampleBlueprint,
      selectedTaskIndexes: [0],
      selectedBudgetItemIndexes: [0],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No data returned from database transaction");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("getLatestPlanRevisionAction", () => {
  const validEventId = TEST_IDS.eventId;

  const mockEventRow: EventRow = {
    id: validEventId,
    user_id: MOCK_USER.id,
    name: "Tech Showcase",
    event_type: "conference",
    event_date: "2026-11-20T10:00:00.000Z",
    location: "Auditorium",
    guest_count: 100,
    budget: 15000,
    preferences: null,
    constraints: null,
    cultural_requirements: null,
    status: "planning",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };

  const sampleBlueprint: AIPlanBlueprint = {
    summary: "Standard technical conference schedule with keynote presentations and breakout rooms.",
    themes: ["Cloud Native Innovation"],
    scheduleMilestones: [
      {
        title: "Registration & Breakfast",
        timeframe: "8:00 AM",
        description: "Badge pickup in lobby",
        suggested_date: "2026-11-20",
      },
    ],
    suggestedTasks: [
      {
        title: "Print attendee badges",
        description: "Lanyards and QR codes",
        priority: "medium",
        category: "Marketing & Collateral",
        is_vendor_checklist: false,
        suggested_days_before: 5,
      },
    ],
    proposedBudgetItems: [
      {
        category: "Catering & Bar",
        item_name: "Coffee & Light Breakfast",
        estimated_amount: 1200,
        notes: "Coffee, tea, pastries",
      },
    ],
    keyRecommendations: ["Test WiFi with 100 simulated clients"],
    metadata: {
      source: "ai",
      model: "openai/gpt-oss-120b",
      generatedAt: "2026-10-01T00:00:00.000Z",
    },
  };

  const sampleRevisionRow: PlanRevisionRow = {
    id: TEST_IDS.planRevisionId,
    event_id: validEventId,
    user_id: MOCK_USER.id,
    revision_number: 1,
    structured_plan: sampleBlueprint as unknown as Json,
    summary: sampleBlueprint.summary,
    is_active: true,
    created_at: "2026-10-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const setupAuthSuccess = () => {
    return vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    } as unknown as UserResponse);
  };

  const setupAuthFailure = () => {
    return vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue({
      data: { user: null },
      error: { message: "No session", name: "AuthError", status: 401 } as unknown as AuthError,
    } as unknown as UserResponse);
  };

  it("rejects invalid event UUID format", async () => {
    const result = await getLatestPlanRevisionAction("not-a-uuid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid event ID format");
    }
  });

  it("rejects unauthenticated requests", async () => {
    setupAuthFailure();
    const result = await getLatestPlanRevisionAction(validEventId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Authentication required");
    }
  });

  it("enforces event ownership check and rejects if event is not owned by user", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: false,
      error: "Event not found or you do not have permission to view it.",
    });

    const mockSupabase = createMockSupabaseClient();
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await getLatestPlanRevisionAction(validEventId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Event not found or you do not have permission");
    }
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("successfully retrieves active plan revision", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient({
      tables: {
        plan_revisions: { data: [sampleRevisionRow], error: null },
      },
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await getLatestPlanRevisionAction(validEventId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(sampleRevisionRow);
    }

    const builder = mockSupabase.getBuilderForTable("plan_revisions");
    expect(builder?.select).toHaveBeenCalledWith("*");
    expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
    expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
  });

  it("returns null cleanly when no plan revision exists for this event", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const mockSupabase = createMockSupabaseClient({
      tables: {
        plan_revisions: { data: [], error: null },
      },
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await getLatestPlanRevisionAction(validEventId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("returns validation error if stored structured_plan in database fails schema constraints", async () => {
    setupAuthSuccess();
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEventRow,
    });

    const corruptedRevision = {
      ...sampleRevisionRow,
      structured_plan: { corrupted: true } as unknown as Json,
    };

    const mockSupabase = createMockSupabaseClient({
      tables: {
        plan_revisions: { data: [corruptedRevision], error: null },
      },
    });
    vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

    const result = await getLatestPlanRevisionAction(validEventId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("invalid structured data");
    }
  });
});
