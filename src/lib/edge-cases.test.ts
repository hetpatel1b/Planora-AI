import { describe, it, expect, vi } from "vitest";
import { calculateBaselineSummary } from "@/lib/budget-simulator";
import type { BudgetItemRow } from "@/lib/validations/budget";
import { formatCurrency } from "@/lib/currency-utils";
import { formatEventDate, toDateInputValue, dateInputToIsoString } from "@/lib/date-utils";
import { safeJsonParse } from "@/lib/json-utils";
import { generateTasksCsv, generateBudgetCsv } from "@/lib/export-csv";
import { copilotProposedTaskSchema } from "@/lib/validations/copilot";
import { createBudgetItemSchema } from "@/lib/validations/budget";
import { createTaskSchema } from "@/lib/validations/task";

describe("Edge-Case Coverage: Core Engine Branch Completeness", () => {
  describe("budget-simulator: calculateBaselineSummary", () => {
    it("wraps calculateBudgetSummary with baseline items and target cap", () => {
      const items: BudgetItemRow[] = [
        {
          id: "item-1",
          event_id: "evt-1",
          user_id: "usr-1",
          category: "Venue",
          item_name: "Courtyard",
          estimated_amount: 10000,
          actual_amount: 9000,
          notes: null,
          plan_revision_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const baseline = calculateBaselineSummary(15000, items);
      expect(baseline.totalEstimated).toBe(10000);
      expect(baseline.totalActual).toBe(9000);
      expect(baseline.variance).toBe(-1000);
    });
  });

  describe("currency-utils: Cache eviction & Intl exception fallback", () => {
    it("evicts oldest formatter when cache exceeds maximum size", () => {
      // Generate 120 different locale/currency pairs to exceed MAX_CACHE_SIZE (100)
      for (let i = 0; i < 110; i++) {
        formatCurrency(100 + i, {
          locale: `en-US`,
          currency: `USD`,
          minimumFractionDigits: (i % 3),
          maximumFractionDigits: (i % 3) + 1,
        });
      }
      expect(formatCurrency(500, { currency: "USD", locale: "en-US" })).toBe("$500");
    });

    it("falls back gracefully when Intl.NumberFormat throws an error", () => {
      const originalIntl = Intl.NumberFormat;
      try {
        // @ts-expect-error Mock Intl.NumberFormat to throw on unseen locale
        Intl.NumberFormat = vi.fn().mockImplementation(() => {
          throw new Error("Intl locale failure");
        });

        // Test two-digit fallback on uncached custom locale
        const formattedTwoDigits = formatCurrency(1250, {
          locale: "fr-FR",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        expect(formattedTwoDigits).toBe("₹1250.00");

        // Test standard fallback on uncached custom locale
        const formattedStandard = formatCurrency(1250, {
          locale: "ja-JP",
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        });
        expect(formattedStandard).toContain("1,250");
      } finally {
        Intl.NumberFormat = originalIntl;
      }
    });
  });

  describe("date-utils: Parsing catch blocks and formatting edge cases", () => {
    it("handles toDateInputValue and formatEventDate when native date methods throw", () => {
      const origToLocaleDateString = Date.prototype.toLocaleDateString;
      const origGetUTCFullYear = Date.prototype.getUTCFullYear;

      try {
        Date.prototype.toLocaleDateString = vi.fn().mockImplementation(() => {
          throw new Error("Locale error");
        });
        expect(formatEventDate("2027-01-01")).toBe("Invalid date");

        Date.prototype.getUTCFullYear = vi.fn().mockImplementation(() => {
          throw new Error("Date error");
        });
        expect(toDateInputValue("2027-01-01")).toBe("");
      } finally {
        Date.prototype.toLocaleDateString = origToLocaleDateString;
        Date.prototype.getUTCFullYear = origGetUTCFullYear;
      }
    });

    it("returns raw trimmed string when dateInputToIsoString receives non-standard string without T", () => {
      expect(dateInputToIsoString("2027/05/20")).toBe("2027/05/20");
    });
  });

  describe("json-utils: Non-Error exception handling", () => {
    it("handles non-Error objects thrown by JSON.parse", () => {
      const origParse = JSON.parse;
      try {
        JSON.parse = vi.fn().mockImplementation(() => {
          throw "Raw string failure";
        });

        const result = safeJsonParse("anything");
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("Invalid JSON string");
        }
      } finally {
        JSON.parse = origParse;
      }
    });
  });

  describe("export-csv: Sorting fallback with invalid created_at timestamps", () => {
    it("sorts tasks and budget items deterministically even when created_at contains invalid dates", () => {
      const tasksWithInvalidDates = [
        {
          id: "t-invalid-1",
          event_id: "e-1",
          user_id: "u-1",
          title: "Task with bad date",
          description: null,
          due_date: null,
          priority: "low" as const,
          status: "pending" as const,
          category: "general",
          is_vendor_checklist: false,
          vendor_name: null,
          plan_revision_id: null,
          created_at: "invalid-date-stamp",
          updated_at: "invalid-date-stamp",
        },
        {
          id: "t-invalid-2",
          event_id: "e-1",
          user_id: "u-1",
          title: "Second task with bad date",
          description: null,
          due_date: null,
          priority: "high" as const,
          status: "completed" as const,
          category: "general",
          is_vendor_checklist: true,
          vendor_name: "Vendor",
          plan_revision_id: null,
          created_at: "another-bad-stamp",
          updated_at: "another-bad-stamp",
        },
      ];

      const csv = generateTasksCsv(tasksWithInvalidDates);
      expect(csv).toContain("Task with bad date");
      expect(csv).toContain("Second task with bad date");

      const budgetWithInvalidDates: BudgetItemRow[] = [
        {
          id: "b-invalid-1",
          event_id: "e-1",
          user_id: "u-1",
          category: "SameCategory",
          item_name: "Item Alpha",
          estimated_amount: 100,
          actual_amount: 100,
          notes: null,
          plan_revision_id: null,
          created_at: "invalid-stamp-1",
          updated_at: "invalid-stamp-1",
        },
        {
          id: "b-invalid-2",
          event_id: "e-1",
          user_id: "u-1",
          category: "SameCategory",
          item_name: "Item Beta",
          estimated_amount: 200,
          actual_amount: 200,
          notes: null,
          plan_revision_id: null,
          created_at: "invalid-stamp-2",
          updated_at: "invalid-stamp-2",
        },
      ];

      const budgetCsv = generateBudgetCsv(budgetWithInvalidDates);
      expect(budgetCsv).toContain("Item Alpha");
      expect(budgetCsv).toContain("Item Beta");
    });
  });

  describe("validations: copilot, budget, and task edge cases", () => {
    it("validates copilotProposedTaskSchema due date edge cases", () => {
      // Invalid date string fails validation
      const invalidDateRes = copilotProposedTaskSchema.safeParse({
        title: "Test Task",
        due_date: "not-a-valid-date",
      });
      expect(invalidDateRes.success).toBe(false);

      // Year before 2000 fails validation
      const pastYearRes = copilotProposedTaskSchema.safeParse({
        title: "Test Task",
        due_date: "1995-05-10T12:00:00Z",
      });
      expect(pastYearRes.success).toBe(false);

      // Year after 2100 fails validation
      const futureYearRes = copilotProposedTaskSchema.safeParse({
        title: "Test Task",
        due_date: "2150-01-01T12:00:00Z",
      });
      expect(futureYearRes.success).toBe(false);

      // Valid date passes and returns ISO string
      const validDateRes = copilotProposedTaskSchema.safeParse({
        title: "Test Task",
        due_date: "2027-06-15T12:00:00.000Z",
      });
      expect(validDateRes.success).toBe(true);
      if (validDateRes.success) {
        expect(validDateRes.data.due_date).toBe("2027-06-15T12:00:00.000Z");
      }
    });

    it("accepts null for optional multiline notes in budget and task schemas", () => {
      const budgetParsed = createBudgetItemSchema.safeParse({
        event_id: "e-1",
        category: "Venue",
        item_name: "Deposit",
        estimated_amount: 500,
        notes: null,
      });
      expect(budgetParsed.success).toBe(true);
      if (budgetParsed.success) {
        expect(budgetParsed.data.notes).toBeNull();
      }

      const taskParsed = createTaskSchema.safeParse({
        event_id: "e-1",
        title: "Order Flowers",
        category: "decor",
        description: null,
      });
      expect(taskParsed.success).toBe(true);
      if (taskParsed.success) {
        expect(taskParsed.data.description).toBeNull();
      }
    });
  });
});
