import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import * as serverAuth from "@/lib/supabase/server";
import * as eventActions from "@/lib/actions/events";
import { createMockAuthSuccess } from "@/test/mocks/supabase";
import { applyBudgetScenarioAction } from "./simulator";
import {
  getBudgetItemsByEventId,
  createBudgetItemAction,
  updateBudgetItemAction,
  deleteBudgetItemAction,
} from "./budget";
import {
  getTasksByEventId,
  createTaskAction,
  updateTaskAction,
  toggleTaskStatusAction,
  deleteTaskAction,
} from "./tasks";
import {
  listEvents,
  getEventById,
  updateEventAction,
  deleteEventAction,
} from "./events";
import { askCopilotAction } from "./copilot";
import {
  copilotProposedBudgetItemSchema,
  copilotProposedTaskSchema,
} from "@/lib/validations/copilot";

describe("Server Actions & Copilot Validation Edge Branch Coverage", () => {
  const validEventId = "11111111-2222-4333-8444-555555555555";
  const validItemId = "22222222-3333-4444-8555-666666666666";

  const mockUser: User = {
    id: "user-123",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-10-01T00:00:00.000Z",
    email: "planner@planora.ai",
    role: "authenticated",
  };

  const mockEvent = {
    id: validEventId,
    user_id: "user-123",
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
    vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthSuccess(mockUser)
    );
    vi.spyOn(eventActions, "getEventById").mockResolvedValue({
      success: true,
      data: mockEvent,
    });
  });

  describe("simulator.ts edge branches", () => {
    it("handles selectError during budget item ownership check", async () => {
      vi.spyOn(serverAuth, "createClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Item lookup timeout" },
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>);

      const res = await applyBudgetScenarioAction({
        eventId: validEventId,
        item_overrides: [{ id: validItemId, estimated_amount: 500 }],
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("Failed to verify budget items. Please try again.");
      }
    });

    it("handles RPC error codes P0002 and 42501", async () => {
      // 1. P0002
      vi.spyOn(serverAuth, "createClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: validItemId }],
              error: null,
            }),
          }),
        }),
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "P0002", message: "Event not found" },
        }),
      } as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>);

      const res1 = await applyBudgetScenarioAction({
        eventId: validEventId,
        item_overrides: [{ id: validItemId, estimated_amount: 500 }],
      });
      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.error).toBe("Event not found or access denied.");
      }

      // 2. 42501
      vi.spyOn(serverAuth, "createClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: validItemId }],
              error: null,
            }),
          }),
        }),
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "42501", message: "Permission denied" },
        }),
      } as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>);

      const res2 = await applyBudgetScenarioAction({
        eventId: validEventId,
        item_overrides: [{ id: validItemId, estimated_amount: 500 }],
      });
      expect(res2.success).toBe(false);
      if (!res2.success) {
        expect(res2.error).toBe("Unauthorized to apply scenario to this event.");
      }
    });

    it("handles RPC returning applied: false", async () => {
      vi.spyOn(serverAuth, "createClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: validItemId }],
              error: null,
            }),
          }),
        }),
        rpc: vi.fn().mockResolvedValue({
          data: { applied: false, updated_count: 0 },
          error: null,
        }),
      } as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>);

      const res = await applyBudgetScenarioAction({
        eventId: validEventId,
        item_overrides: [{ id: validItemId, estimated_amount: 500 }],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain("Malformed confirmation returned");
      }
    });

    it("catches unexpected exceptions thrown inside applyBudgetScenarioAction", async () => {
      vi.spyOn(serverAuth, "createClient").mockRejectedValue(
        new Error("Unexpected crash inside client factory")
      );

      const res = await applyBudgetScenarioAction({
        eventId: validEventId,
        item_overrides: [{ id: validItemId, estimated_amount: 500 }],
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("An unexpected error occurred while applying the budget scenario.");
      }
    });
  });

  describe("budget.ts catch blocks and ID validations", () => {
    it("handles invalid eventId in deleteBudgetItemAction", async () => {
      const res = await deleteBudgetItemAction(validItemId, "not-a-valid-uuid");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("Invalid event ID format.");
      }
    });

    it("catches unexpected exceptions across budget actions", async () => {
      vi.spyOn(serverAuth, "createClient").mockRejectedValue(new Error("Supabase pool dead"));

      const res1 = await getBudgetItemsByEventId(validEventId);
      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.error).toContain("unexpected error");
      }

      const res2 = await createBudgetItemAction(validEventId, {
        category: "Venue",
        item_name: "Deposit",
        estimated_amount: 500,
      });
      expect(res2.success).toBe(false);
      if (!res2.success) {
        expect(res2.error).toContain("unexpected error");
      }

      const res3 = await updateBudgetItemAction(validItemId, validEventId, {
        item_name: "Updated Name",
      });
      expect(res3.success).toBe(false);
      if (!res3.success) {
        expect(res3.error).toContain("unexpected error");
      }

      const res4 = await deleteBudgetItemAction(validItemId, validEventId);
      expect(res4.success).toBe(false);
      if (!res4.success) {
        expect(res4.error).toContain("unexpected error");
      }
    });
  });

  describe("tasks.ts catch blocks and ID validations", () => {
    it("handles invalid eventId in deleteTaskAction", async () => {
      const res = await deleteTaskAction(validItemId, "invalid-event-id");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("Invalid event ID format.");
      }
    });

    it("catches unexpected exceptions across task actions", async () => {
      vi.spyOn(serverAuth, "createClient").mockRejectedValue(new Error("Supabase client failed"));

      const res1 = await getTasksByEventId(validEventId);
      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.error).toContain("unexpected error");
      }

      const res2 = await createTaskAction(validEventId, {
        title: "Test Task",
        priority: "high",
        status: "pending",
        is_vendor_checklist: false,
      });
      expect(res2.success).toBe(false);
      if (!res2.success) {
        expect(res2.error).toContain("unexpected error");
      }

      const res3 = await updateTaskAction(validItemId, validEventId, {
        title: "Updated Task",
      });
      expect(res3.success).toBe(false);
      if (!res3.success) {
        expect(res3.error).toContain("unexpected error");
      }

      const res4 = await toggleTaskStatusAction(validItemId, validEventId, "completed");
      expect(res4.success).toBe(false);
      if (!res4.success) {
        expect(res4.error).toContain("unexpected error");
      }

      const res5 = await deleteTaskAction(validItemId, validEventId);
      expect(res5.success).toBe(false);
      if (!res5.success) {
        expect(res5.error).toContain("unexpected error");
      }
    });
  });

  describe("events.ts catch blocks", () => {
    it("catches unexpected exceptions across events actions", async () => {
      vi.restoreAllMocks();
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );
      vi.spyOn(serverAuth, "createClient").mockRejectedValue(new Error("Supabase down"));

      const res1 = await listEvents();
      expect(res1.success).toBe(false);

      const res2 = await getEventById(validEventId);
      expect(res2.success).toBe(false);

      const res3 = await updateEventAction(validEventId, { name: "New Name" });
      expect(res3.success).toBe(false);

      const res4 = await deleteEventAction(validEventId);
      expect(res4.success).toBe(false);
    });
  });

  describe("copilot.ts and validation branches", () => {
    it("catches unexpected exception in askCopilotAction", async () => {
      vi.spyOn(serverAuth, "createClient").mockRejectedValue(new Error("Auth failure"));

      const res = await askCopilotAction({
        eventId: validEventId,
        messages: [{ role: "user", content: "Advice needed" }],
      });
      expect(res.success).toBe(false);
    });

    it("covers copilotProposedBudgetItemSchema and copilotProposedTaskSchema edge branches", () => {
      // Missing item_name in copilotProposedBudgetItemSchema
      const invalidBudgetItem = copilotProposedBudgetItemSchema.safeParse({
        category: "Venue",
        // item_name missing
        estimated_amount: 500,
      });
      expect(invalidBudgetItem.success).toBe(false);

      // Missing title in copilotProposedTaskSchema
      const invalidTask = copilotProposedTaskSchema.safeParse({
        // title missing
        priority: "medium",
      });
      expect(invalidTask.success).toBe(false);
    });
  });
});
