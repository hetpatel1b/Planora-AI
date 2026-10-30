import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { applyBudgetScenarioAction } from "./simulator";
import * as serverAuth from "@/lib/supabase/server";
import * as eventActions from "@/lib/actions/events";
import {
  createMockSupabaseClient,
  createMockAuthSuccess,
  createMockAuthFailure,
} from "@/test/mocks/supabase";

describe("applyBudgetScenarioAction", () => {
  const validEventId = "11111111-2222-4333-8444-555555555555";
  const validItemId = "22222222-3333-4444-8555-666666666666";
  const mockUser: User = {
    id: "user-test-123",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-10-01T00:00:00.000Z",
    email: "planner@planora.ai",
    role: "authenticated",
  };

  const mockEvent = {
    id: validEventId,
    user_id: "user-test-123",
    name: "Tech Summit 2026",
    event_type: "conference",
    event_date: "2026-11-20T09:00:00.000Z",
    location: "Austin, TX",
    guest_count: 300,
    budget: 25000,
    preferences: null,
    constraints: null,
    cultural_requirements: null,
    status: "planning" as const,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthFailure("No session")
    );

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 500 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Authentication required");
    }
  });

  it("rejects invalid input schema (e.g. malformed event ID)", async () => {
    const result = await applyBudgetScenarioAction({
      eventId: "not-a-uuid",
      item_overrides: [{ id: validItemId, estimated_amount: 500 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Validation failed");
    }
  });

  it("rejects requests if the event is not found or not owned by user", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: false,
      error: "Event not found or access denied.",
    });

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 500 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Event not found or access denied");
    }
  });

  it("rejects when user_id mismatch occurs on event", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: { ...mockEvent, user_id: "other-user-999" },
    });

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 500 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unauthorized");
    }
  });

  it("rejects when an item override does not belong to this event or user (stale/cross-tenant)", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    const mockSupabase = createMockSupabaseClient({
      tables: {
        budget_items: { data: [], error: null },
      },
    });

    vi.spyOn(serverAuth, "createClient").mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    );

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 500 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("was not found in this event");
      expect(mockSupabase.rpc).not.toHaveBeenCalled(); // Atomicity: never called if verification fails
    }
  });

  it("safely handles database transaction failure without partial changes", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    const mockSupabase = createMockSupabaseClient({
      tables: {
        budget_items: { data: [{ id: validItemId }], error: null },
      },
      rpcError: { code: "40001", message: "Serialization failure during concurrent transaction" },
    });

    vi.spyOn(serverAuth, "createClient").mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    );

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 500 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No partial changes were saved");
    }
  });

  it("detects and reports unprovisioned RPC transaction procedure", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    const mockSupabase = createMockSupabaseClient({
      tables: {
        budget_items: { data: [{ id: validItemId }], error: null },
      },
      rpcError: { code: "42883", message: "function apply_budget_scenario does not exist" },
    });

    vi.spyOn(serverAuth, "createClient").mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    );

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 500 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Atomic scenario persistence is currently blocked");
      expect(result.error).toContain("Database transaction procedure 'apply_budget_scenario'");
    }
  });

  it("applies scenario cleanly when transaction succeeds", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    const mockSupabase = createMockSupabaseClient({
      tables: {
        budget_items: { data: [{ id: validItemId }], error: null },
      },
      rpcData: {
        applied: true,
        event_id: validEventId,
        overrides_applied: 1,
        items_inserted: 0,
      },
    });

    vi.spyOn(serverAuth, "createClient").mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    );

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 750 }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.applied).toBe(true);
      expect(result.data.updatedEventId).toBe(validEventId);
    }
  });

  it("safely handles malformed database RPC confirmation without unhandled exceptions", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    const mockSupabase = createMockSupabaseClient({
      tables: {
        budget_items: { data: [{ id: validItemId }], error: null },
      },
      rpcData: { corrupted: true, applied: "not-a-boolean" },
    });

    vi.spyOn(serverAuth, "createClient").mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    );

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 750 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Failed to apply budget scenario: Malformed confirmation returned from database transaction."
      );
    }
  });

  it("safely handles database transaction returning null data", async () => {
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );

    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });

    const mockSupabase = createMockSupabaseClient({
      tables: {
        budget_items: { data: [{ id: validItemId }], error: null },
      },
      rpcData: null,
    });

    vi.spyOn(serverAuth, "createClient").mockResolvedValue(
      mockSupabase as unknown as SupabaseClient
    );

    const result = await applyBudgetScenarioAction({
      eventId: validEventId,
      item_overrides: [{ id: validItemId, estimated_amount: 750 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Failed to apply budget scenario: No confirmation returned from database transaction."
      );
    }
  });
});
