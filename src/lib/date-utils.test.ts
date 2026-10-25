import { describe, it, expect } from "vitest";
import {
  formatEventDate,
  toDateInputValue,
  dateInputToIsoString,
  getStatusBadgeVariant,
  formatStatusLabel,
} from "./date-utils";

describe("date-utils", () => {
  describe("formatEventDate", () => {
    it("formats ISO string cleanly in UTC without day shift", () => {
      // 2026-10-31T23:59:00Z should stay Oct 31, 2026 in UTC
      expect(formatEventDate("2026-10-31T23:59:00Z")).toBe("Oct 31, 2026");
      // 2026-01-01T00:01:00Z should stay Jan 1, 2026 in UTC
      expect(formatEventDate("2026-01-01T00:01:00Z")).toBe("Jan 1, 2026");
    });

    it("returns fallback for null, undefined, or empty values", () => {
      expect(formatEventDate(null)).toBe("Date to be determined");
      expect(formatEventDate(undefined)).toBe("Date to be determined");
      expect(formatEventDate("")).toBe("Date to be determined");
    });

    it("returns 'Invalid date' for non-parseable date strings", () => {
      expect(formatEventDate("not-a-date")).toBe("Invalid date");
    });
  });

  describe("toDateInputValue", () => {
    it("extracts YYYY-MM-DD string from an ISO date", () => {
      expect(toDateInputValue("2026-12-25T14:30:00Z")).toBe("2026-12-25");
      expect(toDateInputValue("2026-03-05T00:00:00.000Z")).toBe("2026-03-05");
    });

    it("returns empty string for null, undefined, or invalid dates", () => {
      expect(toDateInputValue(null)).toBe("");
      expect(toDateInputValue(undefined)).toBe("");
      expect(toDateInputValue("invalid")).toBe("");
    });
  });

  describe("dateInputToIsoString", () => {
    it("anchors YYYY-MM-DD input to noon UTC (12:00:00.000Z)", () => {
      expect(dateInputToIsoString("2026-07-04")).toBe("2026-07-04T12:00:00.000Z");
    });

    it("returns unchanged if string already contains ISO time component", () => {
      expect(dateInputToIsoString("2026-07-04T18:00:00Z")).toBe("2026-07-04T18:00:00Z");
    });

    it("returns null for null, undefined, or empty/whitespace string", () => {
      expect(dateInputToIsoString(null)).toBeNull();
      expect(dateInputToIsoString(undefined)).toBeNull();
      expect(dateInputToIsoString("")).toBeNull();
      expect(dateInputToIsoString("   ")).toBeNull();
    });
  });

  describe("getStatusBadgeVariant and formatStatusLabel", () => {
    it("maps event statuses to proper badge variants", () => {
      expect(getStatusBadgeVariant("confirmed")).toBe("success");
      expect(getStatusBadgeVariant("completed")).toBe("success");
      expect(getStatusBadgeVariant("in_progress")).toBe("warning");
      expect(getStatusBadgeVariant("cancelled")).toBe("destructive");
      expect(getStatusBadgeVariant("planning")).toBe("default");
      expect(getStatusBadgeVariant("draft")).toBe("secondary");
      expect(getStatusBadgeVariant("unknown")).toBe("secondary");
    });

    it("maps event statuses to readable labels", () => {
      expect(formatStatusLabel("draft")).toBe("Draft");
      expect(formatStatusLabel("planning")).toBe("In Planning");
      expect(formatStatusLabel("confirmed")).toBe("Confirmed");
      expect(formatStatusLabel("in_progress")).toBe("In Progress");
      expect(formatStatusLabel("completed")).toBe("Completed");
      expect(formatStatusLabel("cancelled")).toBe("Cancelled");
      expect(formatStatusLabel("other_status")).toBe("other_status");
    });
  });
});
