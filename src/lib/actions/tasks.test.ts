import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTasksByEventId,
  createTaskAction,
  updateTaskAction,
  toggleTaskStatusAction,
  deleteTaskAction,
} from "./tasks";
import * as serverAuth from "@/lib/supabase/server";
import * as eventActions from "@/lib/actions/events";
import { revalidatePath } from "next/cache";
import {
  MOCK_USER,
  TEST_IDS,
  createMockSupabaseClient,
  createMockAuthSuccess,
  createMockAuthFailure,
} from "@/test/mocks/supabase";
import type { TaskRow, TaskStatus } from "@/lib/validations/task";
import type { EventRow } from "@/lib/validations/event";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("tasks server actions", () => {
  const validEventId = TEST_IDS.eventId;
  const validTaskId = TEST_IDS.taskId;

  const mockEventRow: EventRow = {
    id: validEventId,
    user_id: MOCK_USER.id,
    name: "Tech Showcase 2026",
    event_type: "conference",
    event_date: "2026-11-20T10:00:00.000Z",
    location: "Center Stage",
    guest_count: 150,
    budget: 20000,
    preferences: null,
    constraints: null,
    cultural_requirements: null,
    status: "planning",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };

  const mockTaskRow: TaskRow = {
    id: validTaskId,
    event_id: validEventId,
    user_id: MOCK_USER.id,
    plan_revision_id: null,
    title: "Confirm AV sound technician",
    description: "Verify PA speakers and wireless lapel mics",
    due_date: "2026-11-10T12:00:00.000Z",
    priority: "high",
    status: "pending",
    is_vendor_checklist: true,
    created_at: "2026-10-02T00:00:00.000Z",
    updated_at: "2026-10-02T00:00:00.000Z",
  };

  const validCreateInput = {
    title: "Confirm AV sound technician",
    description: "Verify PA speakers and wireless lapel mics",
    due_date: "2026-11-10T12:00:00.000Z",
    priority: "high" as const,
    status: "pending" as const,
    is_vendor_checklist: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const setupAuthSuccess = () => {
    return vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(createMockAuthSuccess());
  };

  const setupAuthFailure = () => {
    return vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
      createMockAuthFailure("No active session")
    );
  };

  describe("getTasksByEventId", () => {
    it("rejects invalid event UUID format", async () => {
      const result = await getTasksByEventId("not-a-uuid");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid event ID format");
      }
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await getTasksByEventId(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
    });

    it("enforces event ownership check and blocks task retrieval if event not owned", async () => {
      setupAuthSuccess();
      vi.spyOn(eventActions, "getEventById").mockResolvedValue({
        success: false,
        error: "Event not found or you do not have permission to view it.",
      });

      const mockSupabase = createMockSupabaseClient();
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getTasksByEventId(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Event not found or you do not have permission");
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("successfully retrieves checklist tasks scoped by event and user", async () => {
      setupAuthSuccess();
      vi.spyOn(eventActions, "getEventById").mockResolvedValue({
        success: true,
        data: mockEventRow,
      });

      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: [mockTaskRow], error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getTasksByEventId(validEventId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([mockTaskRow]);
      }

      const builder = mockSupabase.getBuilderForTable("tasks");
      expect(builder?.select).toHaveBeenCalledWith("*");
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(builder?.order).toHaveBeenCalledWith("due_date", { ascending: true, nullsFirst: false });
      expect(builder?.order).toHaveBeenCalledWith("created_at", { ascending: true });
    });

    it("returns empty array cleanly when no tasks exist for this event", async () => {
      setupAuthSuccess();
      vi.spyOn(eventActions, "getEventById").mockResolvedValue({
        success: true,
        data: mockEventRow,
      });

      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: [], error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getTasksByEventId(validEventId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns error when database query fails", async () => {
      setupAuthSuccess();
      vi.spyOn(eventActions, "getEventById").mockResolvedValue({
        success: true,
        data: mockEventRow,
      });

      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: null, error: { message: "connection timeout" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getTasksByEventId(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to retrieve checklist tasks");
      }
    });
  });

  describe("createTaskAction", () => {
    it("rejects invalid event UUID format", async () => {
      const result = await createTaskAction("invalid-event-id", validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid event ID format");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await createTaskAction(validEventId, validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("blocks task creation if event is not owned by authenticated user", async () => {
      setupAuthSuccess();
      vi.spyOn(eventActions, "getEventById").mockResolvedValue({
        success: false,
        error: "Event not found or you do not have permission to view it.",
      });

      const mockSupabase = createMockSupabaseClient();
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createTaskAction(validEventId, validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Event not found or you do not have permission");
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects invalid task input schema (empty title, invalid priority, bad due date)", async () => {
      setupAuthSuccess();
      vi.spyOn(eventActions, "getEventById").mockResolvedValue({
        success: true,
        data: mockEventRow,
      });

      const mockSupabase = createMockSupabaseClient();
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createTaskAction(validEventId, {
        title: "", // empty
        priority: "super_critical", // invalid enum
        due_date: "invalid-date", // unparseable
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Validation failed");
        expect(result.fieldErrors?.title).toBeDefined();
        expect(result.fieldErrors?.priority).toBeDefined();
        expect(result.fieldErrors?.due_date).toBeDefined();
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully creates task with schema defaults and verified user identity", async () => {
      setupAuthSuccess();
      vi.spyOn(eventActions, "getEventById").mockResolvedValue({
        success: true,
        data: mockEventRow,
      });

      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: mockTaskRow, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createTaskAction(validEventId, {
        title: "Confirm AV sound technician",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTaskRow);
      }

      const builder = mockSupabase.getBuilderForTable("tasks");
      expect(builder?.insert).toHaveBeenCalledTimes(1);
      const inserted = builder?.insert.mock.calls[0][0] as Record<string, unknown>;

      expect(inserted.event_id).toBe(validEventId);
      expect(inserted.user_id).toBe(MOCK_USER.id);
      expect(inserted.title).toBe("Confirm AV sound technician");
      expect(inserted.priority).toBe("medium");
      expect(inserted.status).toBe("pending");
      expect(inserted.is_vendor_checklist).toBe(false);
      expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/events/${validEventId}`);
    });

    it("handles database insert error gracefully", async () => {
      setupAuthSuccess();
      vi.spyOn(eventActions, "getEventById").mockResolvedValue({
        success: true,
        data: mockEventRow,
      });

      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: null, error: { message: "Database insert error" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createTaskAction(validEventId, validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to save the task");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("updateTaskAction", () => {
    it("rejects invalid task ID or event ID format", async () => {
      const result1 = await updateTaskAction("invalid-id", validEventId, { title: "New Title" });
      expect(result1.success).toBe(false);
      if (!result1.success) {
        expect(result1.error).toContain("Invalid task ID format");
      }

      const result2 = await updateTaskAction(validTaskId, "invalid-event-id", { title: "New Title" });
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toContain("Invalid event ID format");
      }
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await updateTaskAction(validTaskId, validEventId, { title: "New Title" });

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

      const result = await updateTaskAction(validTaskId, validEventId, {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Validation failed");
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects cross-tenant task update when task is not owned by user", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: null, error: { message: "Row not found" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await updateTaskAction(validTaskId, validEventId, { priority: "urgent" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to update task. It may have been deleted or access was denied");
      }

      const builder = mockSupabase.getBuilderForTable("tasks");
      expect(builder?.update).toHaveBeenCalledWith({ priority: "urgent" });
      expect(builder?.eq).toHaveBeenCalledWith("id", validTaskId);
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully updates task and revalidates event route", async () => {
      setupAuthSuccess();
      const updatedRow = { ...mockTaskRow, priority: "urgent" as const };
      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: updatedRow, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await updateTaskAction(validTaskId, validEventId, { priority: "urgent" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("urgent");
      }

      const builder = mockSupabase.getBuilderForTable("tasks");
      expect(builder?.eq).toHaveBeenCalledWith("id", validTaskId);
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/events/${validEventId}`);
    });
  });

  describe("toggleTaskStatusAction", () => {
    it("rejects invalid task ID or event ID format", async () => {
      const result = await toggleTaskStatusAction("bad-task", validEventId, "completed");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid task ID format");
      }
    });

    it("rejects invalid task status enum", async () => {
      const result = await toggleTaskStatusAction(
        validTaskId,
        validEventId,
        "not_a_status" as unknown as TaskStatus
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid task status");
      }
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await toggleTaskStatusAction(validTaskId, validEventId, "completed");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
    });

    it("rejects unauthorized toggle when task is not owned by user", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: null, error: { message: "Task not found" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await toggleTaskStatusAction(validTaskId, validEventId, "completed");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to update task status");
      }

      const builder = mockSupabase.getBuilderForTable("tasks");
      expect(builder?.update).toHaveBeenCalledWith({ status: "completed" });
      expect(builder?.eq).toHaveBeenCalledWith("id", validTaskId);
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
    });

    it("successfully toggles status and intentionally omits revalidatePath for optimistic UI", async () => {
      setupAuthSuccess();
      const toggledRow = { ...mockTaskRow, status: "completed" as const };
      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: toggledRow, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await toggleTaskStatusAction(validTaskId, validEventId, "completed");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("completed");
      }

      const builder = mockSupabase.getBuilderForTable("tasks");
      expect(builder?.update).toHaveBeenCalledWith({ status: "completed" });
      expect(builder?.eq).toHaveBeenCalledWith("id", validTaskId);
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);

      // Verifies revalidatePath was NOT called (per design for optimistic UI)
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("deleteTaskAction", () => {
    it("rejects invalid task ID or event ID format", async () => {
      const result = await deleteTaskAction("not-uuid", validEventId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid task ID format");
      }
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await deleteTaskAction(validTaskId, validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects cross-user deletion when task is not owned by user", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: null, error: { message: "Permission denied" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await deleteTaskAction(validTaskId, validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to delete task. Access denied or task not found");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully deletes task with composite ownership scoping and revalidates event route", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          tasks: { data: null, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await deleteTaskAction(validTaskId, validEventId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validTaskId);
      }

      const builder = mockSupabase.getBuilderForTable("tasks");
      expect(builder?.delete).toHaveBeenCalledTimes(1);
      expect(builder?.eq).toHaveBeenCalledWith("id", validTaskId);
      expect(builder?.eq).toHaveBeenCalledWith("event_id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/events/${validEventId}`);
    });
  });
});
