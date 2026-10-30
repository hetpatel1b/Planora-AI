import { describe, it, expect } from "vitest";
import { getStatusBadgeVariant, formatStatusLabel } from "./status-utils";

describe("status-utils", () => {
  describe("getStatusBadgeVariant", () => {
    it("maps recognized event and task statuses to expected shadcn badge variants", () => {
      expect(getStatusBadgeVariant("confirmed")).toBe("success");
      expect(getStatusBadgeVariant("completed")).toBe("success");
      expect(getStatusBadgeVariant("in_progress")).toBe("warning");
      expect(getStatusBadgeVariant("cancelled")).toBe("destructive");
      expect(getStatusBadgeVariant("planning")).toBe("default");
      expect(getStatusBadgeVariant("draft")).toBe("secondary");
    });

    it("handles case-insensitivity and whitespace trimming cleanly", () => {
      expect(getStatusBadgeVariant("  CONFIRMED  ")).toBe("success");
      expect(getStatusBadgeVariant("In_Progress")).toBe("warning");
      expect(getStatusBadgeVariant("CANCELLED")).toBe("destructive");
    });

    it("defaults to 'secondary' variant for undefined, null, empty string, or unmapped statuses", () => {
      expect(getStatusBadgeVariant(undefined)).toBe("secondary");
      expect(getStatusBadgeVariant(null)).toBe("secondary");
      expect(getStatusBadgeVariant("")).toBe("secondary");
      expect(getStatusBadgeVariant("unknown_status")).toBe("secondary");
    });
  });

  describe("formatStatusLabel", () => {
    it("formats raw status keys into user-facing human-readable labels", () => {
      expect(formatStatusLabel("draft")).toBe("Draft");
      expect(formatStatusLabel("planning")).toBe("In Planning");
      expect(formatStatusLabel("confirmed")).toBe("Confirmed");
      expect(formatStatusLabel("in_progress")).toBe("In Progress");
      expect(formatStatusLabel("completed")).toBe("Completed");
      expect(formatStatusLabel("cancelled")).toBe("Cancelled");
    });

    it("handles whitespace and case-insensitivity", () => {
      expect(formatStatusLabel("  in_progress  ")).toBe("In Progress");
      expect(formatStatusLabel("PLANNING")).toBe("In Planning");
    });

    it("returns empty string for undefined, null, or empty string", () => {
      expect(formatStatusLabel(undefined)).toBe("");
      expect(formatStatusLabel(null)).toBe("");
      expect(formatStatusLabel("")).toBe("");
    });

    it("returns the raw trimmed status as fallback for unrecognized statuses", () => {
      expect(formatStatusLabel("archived")).toBe("archived");
    });
  });
});

