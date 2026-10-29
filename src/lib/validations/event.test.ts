import { describe, it, expect } from "vitest";
import {
  eventIdSchema,
  eventDateSchema,
  guestCountSchema,
  budgetSchema,
  createEventSchema,
  updateEventSchema,
  EVENT_STATUSES,
  EVENT_TYPE_PRESETS,
} from "./event";

describe("event validations", () => {
  describe("constants", () => {
    it("exports the required check-constraint status values", () => {
      expect(EVENT_STATUSES).toEqual([
        "draft",
        "planning",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ]);
    });

    it("exports non-empty event type presets list", () => {
      expect(EVENT_TYPE_PRESETS.length).toBeGreaterThan(0);
      expect(EVENT_TYPE_PRESETS.some((p) => p.value === "wedding")).toBe(true);
      expect(EVENT_TYPE_PRESETS.some((p) => p.value === "conference")).toBe(true);
    });
  });

  describe("eventIdSchema", () => {
    it("accepts valid UUID strings", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      expect(eventIdSchema.parse(validUuid)).toBe(validUuid);
    });

    it("rejects malformed UUID strings", () => {
      expect(eventIdSchema.safeParse("not-a-uuid").success).toBe(false);
      expect(eventIdSchema.safeParse("12345").success).toBe(false);
      expect(eventIdSchema.safeParse("").success).toBe(false);
    });

    it("rejects non-string inputs", () => {
      expect(eventIdSchema.safeParse(null).success).toBe(false);
      expect(eventIdSchema.safeParse(undefined).success).toBe(false);
      expect(eventIdSchema.safeParse(12345).success).toBe(false);
    });
  });

  describe("eventDateSchema", () => {
    it("transforms null, undefined, and empty string to null", () => {
      expect(eventDateSchema.parse(null)).toBeNull();
      expect(eventDateSchema.parse(undefined)).toBeNull();
      expect(eventDateSchema.parse("")).toBeNull();
    });

    it("parses and transforms valid ISO date strings to ISO string", () => {
      const iso = "2026-11-20T10:00:00.000Z";
      expect(eventDateSchema.parse(iso)).toBe(iso);
    });

    it("parses Date objects into ISO string", () => {
      const date = new Date("2026-06-15T09:30:00.000Z");
      expect(eventDateSchema.parse(date)).toBe(date.toISOString());
    });

    it("parses valid date format strings (YYYY-MM-DD)", () => {
      const parsed = eventDateSchema.parse("2026-12-25");
      expect(typeof parsed).toBe("string");
      expect(parsed).toContain("2026-12-25");
    });

    it("rejects unparseable date strings", () => {
      const res = eventDateSchema.safeParse("not-a-valid-date");
      expect(res.success).toBe(false);
    });

    it("rejects dates outside the 2000-2100 boundary", () => {
      const resOld = eventDateSchema.safeParse("1998-05-15T12:00:00.000Z");
      expect(resOld.success).toBe(false);

      const resFarFuture = eventDateSchema.safeParse("2102-05-15T12:00:00.000Z");
      expect(resFarFuture.success).toBe(false);
    });

    it("accepts dates at boundary years 2000 and 2100", () => {
      expect(eventDateSchema.safeParse("2000-06-15T12:00:00.000Z").success).toBe(true);
      expect(eventDateSchema.safeParse("2100-06-15T12:00:00.000Z").success).toBe(true);
    });
  });

  describe("guestCountSchema", () => {
    it("defaults empty string, null, and undefined to 0", () => {
      expect(guestCountSchema.parse("")).toBe(0);
      expect(guestCountSchema.parse(null)).toBe(0);
      expect(guestCountSchema.parse(undefined)).toBe(0);
    });

    it("coerces numeric strings and numbers", () => {
      expect(guestCountSchema.parse(150)).toBe(150);
      expect(guestCountSchema.parse("250")).toBe(250);
      expect(guestCountSchema.parse(0)).toBe(0);
    });

    it("rejects negative numbers", () => {
      const res = guestCountSchema.safeParse(-1);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot be negative");
      }
    });

    it("rejects fractional guest counts", () => {
      const res = guestCountSchema.safeParse(50.5);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("whole number");
      }
    });

    it("rejects attendees exceeding 10,000,000 maximum boundary", () => {
      const res = guestCountSchema.safeParse(10_000_001);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 10,000,000");
      }
    });

    it("accepts maximum allowed guest count of 10,000,000", () => {
      expect(guestCountSchema.parse(10_000_000)).toBe(10_000_000);
    });

    it("rejects non-numeric strings and NaN", () => {
      expect(guestCountSchema.safeParse("abc").success).toBe(false);
      expect(guestCountSchema.safeParse(NaN).success).toBe(false);
      expect(guestCountSchema.safeParse(Infinity).success).toBe(false);
    });
  });

  describe("budgetSchema", () => {
    it("defaults empty string, null, and undefined to 0", () => {
      expect(budgetSchema.parse("")).toBe(0);
      expect(budgetSchema.parse(null)).toBe(0);
      expect(budgetSchema.parse(undefined)).toBe(0);
    });

    it("coerces numeric strings and numbers", () => {
      expect(budgetSchema.parse(50000)).toBe(50000);
      expect(budgetSchema.parse("12500.5")).toBe(12500.5);
    });

    it("rounds decimal amounts to 2 decimal places", () => {
      expect(budgetSchema.parse(99.994)).toBe(99.99);
      expect(budgetSchema.parse(99.996)).toBe(100);
      expect(budgetSchema.parse(10.555)).toBe(10.56);
    });

    it("rejects negative budgets", () => {
      const res = budgetSchema.safeParse(-100);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot be negative");
      }
    });

    it("rejects budgets exceeding 999,999,999.99 ceiling", () => {
      const res = budgetSchema.safeParse(1_000_000_000);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 999,999,999.99");
      }
    });

    it("accepts maximum boundary amount 999,999,999.99", () => {
      expect(budgetSchema.parse(999_999_999.99)).toBe(999_999_999.99);
    });

    it("rejects non-numeric strings and Infinity", () => {
      expect(budgetSchema.safeParse("expensive").success).toBe(false);
      expect(budgetSchema.safeParse(Infinity).success).toBe(false);
      expect(budgetSchema.safeParse(NaN).success).toBe(false);
    });
  });

  describe("createEventSchema", () => {
    const validEventPayload = {
      name: "Global Technology Expo 2026",
      event_type: "conference",
      event_date: "2026-11-20T10:00:00.000Z",
      location: "San Jose Convention Center",
      guest_count: 500,
      budget: 75000,
      preferences: "High-speed WiFi in all halls",
      constraints: "Keynote finishes before 12 PM",
      cultural_requirements: "Vegetarian breakfast buffet",
    };

    it("successfully parses valid event creation payload", () => {
      const parsed = createEventSchema.parse(validEventPayload);
      expect(parsed.name).toBe("Global Technology Expo 2026");
      expect(parsed.event_type).toBe("conference");
      expect(parsed.status).toBe("draft"); // Default status applied
      expect(parsed.guest_count).toBe(500);
      expect(parsed.budget).toBe(75000);
    });

    it("applies default status 'draft' when status is omitted", () => {
      const parsed = createEventSchema.parse({
        name: "Community Fundraiser",
        event_type: "community",
      });
      expect(parsed.status).toBe("draft");
      expect(parsed.guest_count).toBe(0);
      expect(parsed.budget).toBe(0);
    });

    it("allows explicit status override on creation", () => {
      const parsed = createEventSchema.parse({
        name: "Community Fundraiser",
        event_type: "community",
        status: "planning",
      });
      expect(parsed.status).toBe("planning");
    });

    it("trims whitespace from text fields and converts empty strings to null", () => {
      const parsed = createEventSchema.parse({
        name: "  Trimmed Event Name  ",
        event_type: "  wedding  ",
        location: "   ",
        preferences: "  Preferred colors: Blue & Gold  ",
        constraints: "",
        cultural_requirements: null,
      });

      expect(parsed.name).toBe("Trimmed Event Name");
      expect(parsed.event_type).toBe("wedding");
      expect(parsed.location).toBeNull();
      expect(parsed.preferences).toBe("Preferred colors: Blue & Gold");
      expect(parsed.constraints).toBeNull();
      expect(parsed.cultural_requirements).toBeNull();
    });

    it("rejects missing or too short name (< 2 chars)", () => {
      const resMissing = createEventSchema.safeParse({ event_type: "wedding" });
      expect(resMissing.success).toBe(false);

      const resShort = createEventSchema.safeParse({ name: "A", event_type: "wedding" });
      expect(resShort.success).toBe(false);
      if (!resShort.success) {
        expect(resShort.error.issues[0].message).toContain("at least 2 characters");
      }
    });

    it("rejects name exceeding 150 characters", () => {
      const resLong = createEventSchema.safeParse({
        name: "A".repeat(151),
        event_type: "wedding",
      });
      expect(resLong.success).toBe(false);
      if (!resLong.success) {
        expect(resLong.error.issues[0].message).toContain("must not exceed 150 characters");
      }
    });

    it("accepts names at exact length boundaries (2 and 150 chars)", () => {
      expect(createEventSchema.safeParse({ name: "AB", event_type: "wedding" }).success).toBe(true);
      expect(createEventSchema.safeParse({ name: "A".repeat(150), event_type: "wedding" }).success).toBe(true);
    });

    it("rejects missing or invalid event_type", () => {
      expect(createEventSchema.safeParse({ name: "Valid Name" }).success).toBe(false);
      expect(createEventSchema.safeParse({ name: "Valid Name", event_type: "A" }).success).toBe(false);
      expect(createEventSchema.safeParse({ name: "Valid Name", event_type: "A".repeat(51) }).success).toBe(false);
    });

    it("rejects invalid status enum value", () => {
      const res = createEventSchema.safeParse({
        name: "Valid Name",
        event_type: "wedding",
        status: "non_existent_status",
      });
      expect(res.success).toBe(false);
    });

    it("rejects location exceeding 300 characters", () => {
      const res = createEventSchema.safeParse({
        name: "Valid Name",
        event_type: "wedding",
        location: "L".repeat(301),
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Location must not exceed 300 characters");
      }
    });

    it("rejects preferences exceeding 2000 characters", () => {
      const res = createEventSchema.safeParse({
        name: "Valid Name",
        event_type: "wedding",
        preferences: "P".repeat(2001),
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Preferences must not exceed 2000 characters");
      }
    });
  });

  describe("updateEventSchema", () => {
    it("accepts valid partial updates for single fields without injecting defaults", () => {
      const updateName = updateEventSchema.parse({ name: "Updated Name" });
      expect(updateName).toEqual({ name: "Updated Name" });
      expect((updateName as Record<string, unknown>).status).toBeUndefined();
      expect((updateName as Record<string, unknown>).budget).toBeUndefined();

      const updateBudget = updateEventSchema.parse({ budget: 85000 });
      expect(updateBudget).toEqual({ budget: 85000 });

      const updateStatus = updateEventSchema.parse({ status: "confirmed" });
      expect(updateStatus).toEqual({ status: "confirmed" });
    });

    it("accepts multi-field updates", () => {
      const multi = updateEventSchema.parse({
        name: "Updated Name",
        budget: 95000,
        guest_count: 350,
      });
      expect(multi).toEqual({
        name: "Updated Name",
        budget: 95000,
        guest_count: 350,
      });
    });

    it("rejects empty update object ({})", () => {
      const res = updateEventSchema.safeParse({});
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("At least one field must be provided");
      }
    });

    it("rejects invalid partial field values", () => {
      expect(updateEventSchema.safeParse({ name: "A" }).success).toBe(false);
      expect(updateEventSchema.safeParse({ budget: -500 }).success).toBe(false);
      expect(updateEventSchema.safeParse({ guest_count: -10 }).success).toBe(false);
      expect(updateEventSchema.safeParse({ status: "invalid_status" }).success).toBe(false);
    });
  });
});
