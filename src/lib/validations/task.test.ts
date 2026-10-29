import { describe, it, expect } from "vitest";
import {
  taskIdSchema,
  eventIdSchema,
  taskDueDateSchema,
  createTaskSchema,
  updateTaskSchema,
  toggleTaskStatusSchema,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./task";

describe("task validations", () => {
  describe("constants", () => {
    it("exports all valid database check-constraint priority values", () => {
      expect(TASK_PRIORITIES).toEqual(["low", "medium", "high", "urgent"]);
    });

    it("exports all valid database check-constraint status values", () => {
      expect(TASK_STATUSES).toEqual([
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ]);
    });
  });

  describe("ID schemas", () => {
    it("validates well-formed UUIDs for taskIdSchema", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      expect(taskIdSchema.parse(validUuid)).toBe(validUuid);
    });

    it("rejects invalid UUIDs for taskIdSchema", () => {
      expect(taskIdSchema.safeParse("not-a-uuid").success).toBe(false);
      expect(taskIdSchema.safeParse("").success).toBe(false);
    });

    it("validates well-formed UUIDs for eventIdSchema", () => {
      const validUuid = "223e4567-e89b-12d3-a456-426614174001";
      expect(eventIdSchema.parse(validUuid)).toBe(validUuid);
    });

    it("rejects invalid UUIDs for eventIdSchema", () => {
      expect(eventIdSchema.safeParse("invalid-id").success).toBe(false);
    });
  });

  describe("taskDueDateSchema", () => {
    it("transforms null and empty string to null", () => {
      expect(taskDueDateSchema.parse(null)).toBeNull();
      expect(taskDueDateSchema.parse("")).toBeNull();
    });

    it("preserves undefined when omitted", () => {
      expect(taskDueDateSchema.parse(undefined)).toBeUndefined();
    });

    it("transforms valid ISO strings and Dates into ISO string", () => {
      const iso = "2026-11-15T12:00:00.000Z";
      expect(taskDueDateSchema.parse(iso)).toBe(iso);

      const dateObj = new Date("2026-11-15T12:00:00.000Z");
      expect(taskDueDateSchema.parse(dateObj)).toBe(iso);
    });

    it("rejects unparseable dates", () => {
      const res = taskDueDateSchema.safeParse("unparseable-date");
      expect(res.success).toBe(false);
    });

    it("rejects dates outside 2000-2100 boundary", () => {
      expect(taskDueDateSchema.safeParse("1998-05-15T12:00:00.000Z").success).toBe(false);
      expect(taskDueDateSchema.safeParse("2102-05-15T12:00:00.000Z").success).toBe(false);
    });

    it("accepts dates within valid boundary years", () => {
      expect(taskDueDateSchema.safeParse("2000-06-15T12:00:00.000Z").success).toBe(true);
      expect(taskDueDateSchema.safeParse("2100-06-15T12:00:00.000Z").success).toBe(true);
    });
  });

  describe("createTaskSchema", () => {
    const validTaskPayload = {
      title: "Schedule Lighting & Sound Walkthrough",
      description: "Review circuit breakers, dimmer racks, and wireless channels.",
      due_date: "2026-11-10T14:00:00.000Z",
      priority: "high" as const,
      status: "pending" as const,
      is_vendor_checklist: true,
    };

    it("successfully parses valid task creation payload", () => {
      const parsed = createTaskSchema.parse(validTaskPayload);
      expect(parsed.title).toBe("Schedule Lighting & Sound Walkthrough");
      expect(parsed.description).toBe("Review circuit breakers, dimmer racks, and wireless channels.");
      expect(parsed.due_date).toBe("2026-11-10T14:00:00.000Z");
      expect(parsed.priority).toBe("high");
      expect(parsed.status).toBe("pending");
      expect(parsed.is_vendor_checklist).toBe(true);
    });

    it("applies default values when optional fields are omitted", () => {
      const parsed = createTaskSchema.parse({
        title: "Send Vendor Agreements",
      });
      expect(parsed.title).toBe("Send Vendor Agreements");
      expect(parsed.description).toBeNull();
      expect(parsed.due_date).toBeNull();
      expect(parsed.priority).toBe("medium");
      expect(parsed.status).toBe("pending");
      expect(parsed.is_vendor_checklist).toBe(false);
    });

    it("trims whitespace from title and description, converting empty string description to null", () => {
      const parsed = createTaskSchema.parse({
        title: "   Trimmed Task Title   ",
        description: "   ",
      });
      expect(parsed.title).toBe("Trimmed Task Title");
      expect(parsed.description).toBeNull();
    });

    it("rejects missing or empty title", () => {
      const resMissing = createTaskSchema.safeParse({});
      expect(resMissing.success).toBe(false);

      const resEmpty = createTaskSchema.safeParse({ title: "" });
      expect(resEmpty.success).toBe(false);
      if (!resEmpty.success) {
        expect(resEmpty.error.issues[0].message).toContain("Task title is required");
      }

      const resWhitespace = createTaskSchema.safeParse({ title: "   " });
      expect(resWhitespace.success).toBe(false);
    });

    it("rejects title exceeding 200 characters", () => {
      const resLong = createTaskSchema.safeParse({
        title: "T".repeat(201),
      });
      expect(resLong.success).toBe(false);
      if (!resLong.success) {
        expect(resLong.error.issues[0].message).toContain("must not exceed 200 characters");
      }
    });

    it("accepts title at boundaries (1 and 200 chars)", () => {
      expect(createTaskSchema.safeParse({ title: "T" }).success).toBe(true);
      expect(createTaskSchema.safeParse({ title: "T".repeat(200) }).success).toBe(true);
    });

    it("rejects description exceeding 2000 characters", () => {
      const resLong = createTaskSchema.safeParse({
        title: "Valid Task",
        description: "D".repeat(2001),
      });
      expect(resLong.success).toBe(false);
      if (!resLong.success) {
        expect(resLong.error.issues[0].message).toContain("Description must not exceed 2000 characters");
      }
    });

    it("accepts description at exact 2000 character boundary", () => {
      expect(
        createTaskSchema.safeParse({
          title: "Valid Task",
          description: "D".repeat(2000),
        }).success
      ).toBe(true);
    });

    it("rejects invalid priority enum value", () => {
      const res = createTaskSchema.safeParse({
        title: "Valid Task",
        priority: "super_critical",
      });
      expect(res.success).toBe(false);
    });

    it("rejects invalid status enum value", () => {
      const res = createTaskSchema.safeParse({
        title: "Valid Task",
        status: "in_limbo",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("updateTaskSchema", () => {
    it("accepts partial updates for single fields without injecting defaults", () => {
      const updateStatus = updateTaskSchema.parse({ status: "completed" });
      expect(updateStatus).toEqual({ status: "completed" });
      expect((updateStatus as Record<string, unknown>).title).toBeUndefined();
      expect((updateStatus as Record<string, unknown>).priority).toBeUndefined();

      const updatePriority = updateTaskSchema.parse({ priority: "urgent" });
      expect(updatePriority).toEqual({ priority: "urgent" });

      const updateVendor = updateTaskSchema.parse({ is_vendor_checklist: true });
      expect(updateVendor).toEqual({ is_vendor_checklist: true });
    });

    it("accepts multi-field updates", () => {
      const multi = updateTaskSchema.parse({
        title: "Updated Title",
        priority: "urgent",
        status: "in_progress",
      });
      expect(multi).toEqual({
        title: "Updated Title",
        priority: "urgent",
        status: "in_progress",
      });
    });

    it("rejects empty update object ({})", () => {
      const res = updateTaskSchema.safeParse({});
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("At least one field must be provided");
      }
    });

    it("rejects invalid partial field values", () => {
      expect(updateTaskSchema.safeParse({ title: "" }).success).toBe(false);
      expect(updateTaskSchema.safeParse({ priority: "invalid_priority" }).success).toBe(false);
      expect(updateTaskSchema.safeParse({ status: "invalid_status" }).success).toBe(false);
      expect(updateTaskSchema.safeParse({ description: "D".repeat(2001) }).success).toBe(false);
    });
  });

  describe("toggleTaskStatusSchema", () => {
    it("accepts all four valid task statuses", () => {
      expect(toggleTaskStatusSchema.parse({ status: "pending" })).toEqual({ status: "pending" });
      expect(toggleTaskStatusSchema.parse({ status: "in_progress" })).toEqual({ status: "in_progress" });
      expect(toggleTaskStatusSchema.parse({ status: "completed" })).toEqual({ status: "completed" });
      expect(toggleTaskStatusSchema.parse({ status: "cancelled" })).toEqual({ status: "cancelled" });
    });

    it("rejects invalid status values", () => {
      expect(toggleTaskStatusSchema.safeParse({ status: "done" }).success).toBe(false);
      expect(toggleTaskStatusSchema.safeParse({ status: "" }).success).toBe(false);
      expect(toggleTaskStatusSchema.safeParse({}).success).toBe(false);
    });
  });
});

