import { describe, it, expect } from "vitest";
import { calculateTaskSummary, type TaskSummaryInput } from "./task-math";

describe("task-math", () => {
  describe("calculateTaskSummary", () => {
    it("handles null, undefined, or empty task collections safely", () => {
      const emptyResult = {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        cancelled: 0,
        activeNonCompleted: 0,
        overdue: 0,
        vendorCount: 0,
        completedVendorCount: 0,
        completionRate: 0,
        vendorCompletionRate: 0,
      };

      expect(calculateTaskSummary(null)).toEqual(emptyResult);
      expect(calculateTaskSummary(undefined)).toEqual(emptyResult);
      expect(calculateTaskSummary([])).toEqual(emptyResult);
    });

    it("correctly aggregates tasks across all statuses", () => {
      const tasks: TaskSummaryInput[] = [
        { status: "completed", due_date: null, is_vendor_checklist: false },
        { status: "completed", due_date: null, is_vendor_checklist: true },
        { status: "in_progress", due_date: null, is_vendor_checklist: false },
        { status: "pending", due_date: null, is_vendor_checklist: true },
        { status: "cancelled", due_date: null, is_vendor_checklist: false },
      ];

      const summary = calculateTaskSummary(tasks);

      expect(summary.total).toBe(5);
      expect(summary.completed).toBe(2);
      expect(summary.inProgress).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.cancelled).toBe(1);
      expect(summary.activeNonCompleted).toBe(2); // inProgress + pending
      expect(summary.completionRate).toBe(40); // 2 / 5 = 40%
    });

    it("calculates vendor checklist counts and percentages correctly", () => {
      const tasks: TaskSummaryInput[] = [
        { status: "completed", due_date: null, is_vendor_checklist: true },
        { status: "completed", due_date: null, is_vendor_checklist: true },
        { status: "pending", due_date: null, is_vendor_checklist: true },
        { status: "completed", due_date: null, is_vendor_checklist: false },
      ];

      const summary = calculateTaskSummary(tasks);

      expect(summary.total).toBe(4);
      expect(summary.vendorCount).toBe(3);
      expect(summary.completedVendorCount).toBe(2);
      expect(summary.vendorCompletionRate).toBe(67); // Math.round(2 / 3 * 100) = 67%
      expect(summary.completionRate).toBe(75); // 3 / 4 = 75%
    });

    it("prevents division by zero when vendor tasks are absent", () => {
      const tasks: TaskSummaryInput[] = [
        { status: "completed", due_date: null, is_vendor_checklist: false },
        { status: "pending", due_date: null, is_vendor_checklist: false },
      ];

      const summary = calculateTaskSummary(tasks);

      expect(summary.vendorCount).toBe(0);
      expect(summary.completedVendorCount).toBe(0);
      expect(summary.vendorCompletionRate).toBe(0);
      expect(Number.isFinite(summary.vendorCompletionRate)).toBe(true);
    });

    it("identifies overdue tasks based on reference timestamp", () => {
      const now = new Date("2026-10-30T12:00:00.000Z").getTime();
      const pastDate = "2026-10-29T12:00:00.000Z";
      const futureDate = "2026-10-31T12:00:00.000Z";

      const tasks: TaskSummaryInput[] = [
        // Past & pending -> overdue
        { status: "pending", due_date: pastDate, is_vendor_checklist: false },
        // Past & in_progress -> overdue
        { status: "in_progress", due_date: pastDate, is_vendor_checklist: false },
        // Past & completed -> NOT overdue
        { status: "completed", due_date: pastDate, is_vendor_checklist: false },
        // Past & cancelled -> NOT overdue
        { status: "cancelled", due_date: pastDate, is_vendor_checklist: false },
        // Future & pending -> NOT overdue
        { status: "pending", due_date: futureDate, is_vendor_checklist: false },
        // No due date -> NOT overdue
        { status: "pending", due_date: null, is_vendor_checklist: false },
      ];

      const summary = calculateTaskSummary(tasks, now);

      expect(summary.total).toBe(6);
      expect(summary.overdue).toBe(2);
    });

    it("does not mutate the input array", () => {
      const tasks: readonly TaskSummaryInput[] = Object.freeze([
        Object.freeze({ status: "completed", due_date: null, is_vendor_checklist: true }),
        Object.freeze({ status: "pending", due_date: null, is_vendor_checklist: false }),
      ]);

      expect(() => calculateTaskSummary(tasks)).not.toThrow();
    });
  });
});

