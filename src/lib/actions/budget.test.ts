import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getBudgetItemsByEventId,
  createBudgetItemAction,
  updateBudgetItemAction,
  deleteBudgetItemAction,
} from "./budget";
import * as serverAuth from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  MOCK_USER,
  TEST_IDS,
  createMockSupabaseClient,
} from "@/test/mocks/supabase";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { UserResponse, AuthError, SupabaseClient } from "@supabase/supabase-js";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("budget server actions", () => {
  const validEventId = TEST_IDS.eventId;
  const validItemId = TEST_IDS.budgetItemId;

  const mockBudgetItemRow: BudgetItemRow = {
    id: validItemId,
    event_id: validEventId,
    user_id: MOCK_USER.id,
    plan_revision_id: null,
    category: "Venue & Facilities",
    item_name: "Grand Ballroom Deposit",
    estimated_amount: 15000,
    actual_amount: 5000,
    notes: "Initial 50% deposit payable upon signing",
    created_at: "2026-10-02T00:00:00.000Z",
    updated_at: "2026-10-02T00:00:00.000Z",
  };

  const validCreateInput = {
    category: "Venue & Facilities",
    item_name: "Grand Ballroom Deposit",
    estimated_amount: 15000,
    actual_amount: 5000,
    notes: "Initial 50% deposit payable upon signing",
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
      error: { message: "Session expired", name: "AuthError", status: 401 } as unknown as AuthError,
    } as unknown as UserResponse);
  };

  describe("getBudgetItemsByEventId", () => {
    it("rejects invalid event UUID format", async () => {
      const result = await getBudgetItemsByEventId("invalid-uuid");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid event ID format");
      }
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await getBudgetItemsByEventId(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
    });

    it("returns error when database query fails", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          budget_items: { data: null, error: { message: "relation does not exist" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getBudgetItemsByEventId(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to retrieve budget items");
      }
    });

    it("successfully retrieves budget items scoped to event and user, ordered by creation date", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          budget_items: { data: [mockBudgetItemRow], error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getBudgetItemsByEventId(validEventId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([mockBudgetItemRow]);
      }

      const builder = mockSupabase.getBuilderForTable("budget_items");
      expect(builder?.select).toHaveBeenCalledWith("*");
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(builder?.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("returns empty array cleanly when no budget items exist", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          budget_items: { data: [], error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getBudgetItemsByEventId(validEventId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("createBudgetItemAction", () => {
    it("rejects invalid event UUID format", async () => {
      const result = await createBudgetItemAction("bad-id", validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid event ID format");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await createBudgetItemAction(validEventId, validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects invalid input schema (empty category, negative amounts, precision violations)", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient();
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createBudgetItemAction(validEventId, {
        category: "", // empty
        item_name: "", // empty
        estimated_amount: -100, // negative
        actual_amount: 10.999, // more than 2 decimal places
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Validation failed");
        expect(result.fieldErrors?.category).toBeDefined();
        expect(result.fieldErrors?.item_name).toBeDefined();
        expect(result.fieldErrors?.estimated_amount).toBeDefined();
        expect(result.fieldErrors?.actual_amount).toBeDefined();
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("enforces event ownership check and blocks insertion if event belongs to another user", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          // Event check query returns not found / unauthorized
          events: { data: null, error: { message: "No matching row" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createBudgetItemAction(validEventId, validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Event workspace not found or you do not have permission");
      }

      // Verify the event ownership query was executed
      const eventBuilder = mockSupabase.getBuilderForTable("events");
      expect(eventBuilder?.select).toHaveBeenCalledWith("id");
      expect(eventBuilder?.eq).toHaveBeenCalledWith("id", validEventId);
      expect(eventBuilder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);

      // CRITICAL: Insertion into budget_items MUST NEVER be attempted
      const budgetBuilder = mockSupabase.getBuilderForTable("budget_items");
      expect(budgetBuilder).toBeUndefined();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully creates budget item when event ownership is verified", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: { id: validEventId }, error: null },
          budget_items: { data: mockBudgetItemRow, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createBudgetItemAction(validEventId, validCreateInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockBudgetItemRow);
      }

      const budgetBuilder = mockSupabase.getBuilderForTable("budget_items");
      expect(budgetBuilder?.insert).toHaveBeenCalledTimes(1);
      const inserted = budgetBuilder?.insert.mock.calls[0][0] as Record<string, unknown>;

      // Verify server-side injected foreign keys
      expect(inserted.event_id).toBe(validEventId);
      expect(inserted.user_id).toBe(MOCK_USER.id);
      expect(inserted.category).toBe(validCreateInput.category);
      expect(inserted.item_name).toBe(validCreateInput.item_name);
      expect(inserted.estimated_amount).toBe(validCreateInput.estimated_amount);
      expect(inserted.actual_amount).toBe(validCreateInput.actual_amount);
      expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/events/${validEventId}`);
    });

    it("handles database insert failure gracefully", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: { id: validEventId }, error: null },
          budget_items: { data: null, error: { message: "numeric field overflow" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createBudgetItemAction(validEventId, validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to add budget item");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("updateBudgetItemAction", () => {
    it("rejects invalid item ID or event ID format", async () => {
      const result1 = await updateBudgetItemAction("bad-item-id", validEventId, { estimated_amount: 2000 });
      expect(result1.success).toBe(false);
      if (!result1.success) {
        expect(result1.error).toContain("Invalid budget item ID format");
      }

      const result2 = await updateBudgetItemAction(validItemId, "bad-event-id", { estimated_amount: 2000 });
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toContain("Invalid event ID format");
      }
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await updateBudgetItemAction(validItemId, validEventId, { estimated_amount: 2000 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects empty update payload", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient();
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await updateBudgetItemAction(validItemId, validEventId, {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Validation failed");
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects cross-tenant modification when item does not belong to user or event", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          budget_items: { data: null, error: { message: "No rows updated" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await updateBudgetItemAction(validItemId, validEventId, { actual_amount: 6000 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Budget item not found or you do not have permission");
      }

      const builder = mockSupabase.getBuilderForTable("budget_items");
      expect(builder?.update).toHaveBeenCalledWith({ actual_amount: 6000 });
      expect(builder?.eq).toHaveBeenCalledWith("id", validItemId);
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully updates budget item and revalidates event workspace", async () => {
      setupAuthSuccess();
      const updatedRow = { ...mockBudgetItemRow, actual_amount: 7500 };
      const mockSupabase = createMockSupabaseClient({
        tables: {
          budget_items: { data: updatedRow, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await updateBudgetItemAction(validItemId, validEventId, { actual_amount: 7500 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actual_amount).toBe(7500);
      }

      const builder = mockSupabase.getBuilderForTable("budget_items");
      expect(builder?.eq).toHaveBeenCalledWith("id", validItemId);
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/events/${validEventId}`);
    });
  });

  describe("deleteBudgetItemAction", () => {
    it("rejects invalid item ID or event ID format", async () => {
      const result = await deleteBudgetItemAction("not-uuid", validEventId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid budget item ID format");
      }
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await deleteBudgetItemAction(validItemId, validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects cross-user deletion when item is not owned by user", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          budget_items: { data: null, error: { message: "Item not found" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await deleteBudgetItemAction(validItemId, validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Budget item not found or you do not have permission");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully deletes budget item with composite tenant match and revalidates event route", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          budget_items: { data: { id: validItemId }, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await deleteBudgetItemAction(validItemId, validEventId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validItemId);
      }

      const builder = mockSupabase.getBuilderForTable("budget_items");
      expect(builder?.delete).toHaveBeenCalledTimes(1);
      expect(builder?.eq).toHaveBeenCalledWith("id", validItemId);
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/events/${validEventId}`);
    });
  });
});
