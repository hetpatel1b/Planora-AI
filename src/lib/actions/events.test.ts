import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
  getEventById,
  listEvents,
} from "./events";
import * as serverAuth from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  MOCK_USER,
  TEST_IDS,
  createMockSupabaseClient,
  createMockAuthSuccess,
  createMockAuthFailure,
} from "@/test/mocks/supabase";
import type { EventRow } from "@/lib/validations/event";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("events server actions", () => {
  const validEventId = TEST_IDS.eventId;

  const mockEventRow: EventRow = {
    id: validEventId,
    user_id: MOCK_USER.id,
    name: "Planora AI Product Launch",
    event_type: "conference",
    event_date: "2026-11-20T10:00:00.000Z",
    location: "Auditorium Hall A",
    guest_count: 200,
    budget: 35000,
    preferences: "Keynote presentation with live streaming",
    constraints: "Strict schedule adherence",
    cultural_requirements: null,
    status: "planning",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  };

  const validCreateInput = {
    name: "Planora AI Product Launch",
    event_type: "conference",
    event_date: "2026-11-20T10:00:00.000Z",
    location: "Auditorium Hall A",
    guest_count: 200,
    budget: 35000,
    preferences: "Keynote presentation with live streaming",
    constraints: "Strict schedule adherence",
    status: "planning" as const,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const setupAuthSuccess = () => {
    return vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(createMockAuthSuccess());
  };

  const setupAuthFailure = () => {
    return vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(createMockAuthFailure());
  };

  describe("createEventAction", () => {
    it("rejects unauthenticated requests without modifying database", async () => {
      setupAuthFailure();
      const mockSupabase = createMockSupabaseClient();
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createEventAction(validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects invalid input schema with structured field errors", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient();
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createEventAction({
        name: "A", // too short (min 2 chars)
        event_type: "", // empty
        budget: -500, // negative
        guest_count: -10, // negative
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Validation failed");
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.name).toBeDefined();
        expect(result.fieldErrors?.event_type).toBeDefined();
        expect(result.fieldErrors?.budget).toBeDefined();
        expect(result.fieldErrors?.guest_count).toBeDefined();
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully creates event and strictly injects server verified user_id", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEventRow, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      // Attempt to pass spoofed user_id in input to verify server session isolation
      const result = await createEventAction({
        ...validCreateInput,
        user_id: "attacker-spoofed-id",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockEventRow);
      }

      const builder = mockSupabase.getBuilderForTable("events");
      expect(builder?.insert).toHaveBeenCalledTimes(1);
      const insertPayload = builder?.insert.mock.calls[0][0] as Record<string, unknown>;

      // Verify that user_id came strictly from MOCK_USER.id, not attacker-spoofed-id
      expect(insertPayload.user_id).toBe(MOCK_USER.id);
      expect(insertPayload.name).toBe(validCreateInput.name);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("handles database insert failure gracefully without crashing", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: null, error: { message: "duplicate key value violates unique constraint" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await createEventAction(validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to create event");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("catches unexpected exceptions and returns structured failure", async () => {
      setupAuthSuccess();
      vi.spyOn(serverAuth, "createClient").mockRejectedValue(new Error("Network connection dropped"));

      const result = await createEventAction(validCreateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("unexpected error occurred");
      }
    });
  });

  describe("updateEventAction", () => {
    it("rejects invalid event UUID format", async () => {
      const result = await updateEventAction("invalid-not-uuid", { name: "Updated Name" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid event ID format");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await updateEventAction(validEventId, { name: "Updated Name" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects empty update payload (must provide at least one field)", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient();
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await updateEventAction(validEventId, {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Validation failed");
      }
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects update when event is not found or not owned by user", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: null, error: { message: "No rows returned" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await updateEventAction(validEventId, { name: "New Name" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Event not found or you do not have permission");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully updates event with scoped query and revalidates dashboard and event page", async () => {
      setupAuthSuccess();
      const updatedRow = { ...mockEventRow, name: "Updated Name" };
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: updatedRow, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await updateEventAction(validEventId, { name: "Updated Name" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
      }

      const builder = mockSupabase.getBuilderForTable("events");
      expect(builder?.update).toHaveBeenCalledWith({ name: "Updated Name" });
      expect(builder?.eq).toHaveBeenCalledWith("id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
      expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/events/${validEventId}`);
    });
  });

  describe("deleteEventAction", () => {
    it("rejects invalid event UUID format", async () => {
      const result = await deleteEventAction("non-uuid");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid event ID format");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await deleteEventAction(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("returns error when event to delete is not found or not owned by user", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: null, error: { message: "Row not found" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await deleteEventAction(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Event not found or you do not have permission");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("successfully deletes event with defense-in-depth tenant scoping and revalidates dashboard", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: { id: validEventId }, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await deleteEventAction(validEventId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validEventId);
      }

      const builder = mockSupabase.getBuilderForTable("events");
      expect(builder?.delete).toHaveBeenCalledTimes(1);
      expect(builder?.eq).toHaveBeenCalledWith("id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("getEventById", () => {
    it("rejects invalid event UUID format", async () => {
      const result = await getEventById("bad-uuid");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid event ID format");
      }
    });

    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await getEventById(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
    });

    it("returns error when event is not found or user is not owner", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: null, error: { message: "Not found" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getEventById(validEventId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Event not found or you do not have permission");
      }
    });

    it("successfully retrieves event for authenticated owner", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEventRow, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await getEventById(validEventId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockEventRow);
      }

      const builder = mockSupabase.getBuilderForTable("events");
      expect(builder?.select).toHaveBeenCalledWith("*");
      expect(builder?.eq).toHaveBeenCalledWith("id", validEventId);
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
    });
  });

  describe("listEvents", () => {
    it("rejects unauthenticated requests", async () => {
      setupAuthFailure();

      const result = await listEvents();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Authentication required");
      }
    });

    it("returns error when database query fails", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: null, error: { message: "database offline" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await listEvents();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to retrieve events");
      }
    });

    it("returns events array scoped by user_id and ordered by created_at descending", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: [mockEventRow], error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await listEvents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([mockEventRow]);
      }

      const builder = mockSupabase.getBuilderForTable("events");
      expect(builder?.select).toHaveBeenCalledWith("*");
      expect(builder?.eq).toHaveBeenCalledWith("user_id", MOCK_USER.id);
      expect(builder?.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("returns empty array when user has no events", async () => {
      setupAuthSuccess();
      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: [], error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(mockSupabase as unknown as SupabaseClient);

      const result = await listEvents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });
});
