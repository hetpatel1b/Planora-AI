import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  getItemVariance,
  isItemOverspent,
  calculateBudgetSummary,
  calculateCategoryBreakdown,
} from "./budget-math";

describe("budget-math", () => {
  describe("toCents", () => {
    it("converts standard dollar numbers to integer cents", () => {
      expect(toCents(10)).toBe(1000);
      expect(toCents(10.5)).toBe(1050);
      expect(toCents(10.99)).toBe(1099);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(0)).toBe(0);
    });

    it("handles floating-point inaccuracies safely via Math.round", () => {
      // 0.1 + 0.2 = 0.30000000000000004
      expect(toCents(0.1 + 0.2)).toBe(30);
      expect(toCents(19.99)).toBe(1999);
      expect(toCents(1234567.89)).toBe(123456789);
    });

    it("converts numeric strings to cents", () => {
      expect(toCents("150")).toBe(15000);
      expect(toCents("45.67")).toBe(4567);
      expect(toCents("0")).toBe(0);
    });

    it("handles null, undefined, empty string, and invalid inputs gracefully", () => {
      expect(toCents(null)).toBe(0);
      expect(toCents(undefined)).toBe(0);
      expect(toCents("")).toBe(0);
      expect(toCents("   ")).toBe(0);
      expect(toCents("invalid-number")).toBe(0);
      expect(toCents(NaN)).toBe(0);
      expect(toCents(Infinity)).toBe(0);
      expect(toCents(-Infinity)).toBe(0);
    });

    it("supports negative numbers according to contract", () => {
      expect(toCents(-50)).toBe(-5000);
      expect(toCents("-12.34")).toBe(-1234);
    });
  });

  describe("fromCents", () => {
    it("converts integer cents back to two-decimal dollar figures", () => {
      expect(fromCents(1000)).toBe(10);
      expect(fromCents(1099)).toBe(10.99);
      expect(fromCents(1)).toBe(0.01);
      expect(fromCents(0)).toBe(0);
      expect(fromCents(-1550)).toBe(-15.5);
    });
  });

  describe("getItemVariance", () => {
    it("calculates cost variance as actual - estimated", () => {
      // Over budget: actual > estimated -> positive variance
      expect(
        getItemVariance({ estimated_amount: 100, actual_amount: 150 })
      ).toBe(50);

      // Under budget: actual < estimated -> negative variance
      expect(
        getItemVariance({ estimated_amount: 200, actual_amount: 175.5 })
      ).toBe(-24.5);

      // On budget
      expect(
        getItemVariance({ estimated_amount: "300.00", actual_amount: "300.00" })
      ).toBe(0);
    });

    it("handles decimal precision without floating point drift", () => {
      expect(
        getItemVariance({ estimated_amount: 10.1, actual_amount: 10.3 })
      ).toBe(0.2);
    });
  });

  describe("isItemOverspent", () => {
    it("returns true only when actual strictly exceeds estimated and actual > 0", () => {
      expect(
        isItemOverspent({ estimated_amount: 100, actual_amount: 100.01 })
      ).toBe(true);

      // Equal amounts
      expect(
        isItemOverspent({ estimated_amount: 100, actual_amount: 100 })
      ).toBe(false);

      // Under estimate
      expect(
        isItemOverspent({ estimated_amount: 100, actual_amount: 90 })
      ).toBe(false);

      // Actual is 0 with 0 estimate (not overspent)
      expect(
        isItemOverspent({ estimated_amount: 0, actual_amount: 0 })
      ).toBe(false);

      // Actual is 0 with negative estimate (actual must be > 0)
      expect(
        isItemOverspent({ estimated_amount: -10, actual_amount: 0 })
      ).toBe(false);
    });
  });

  describe("calculateBudgetSummary", () => {
    it("handles empty budget items and zero target budget", () => {
      const summary = calculateBudgetSummary(0, []);
      expect(summary).toEqual({
        targetBudget: 0,
        totalEstimated: 0,
        totalActual: 0,
        variance: 0,
        remainingActualBudget: 0,
        remainingBudget: 0,
        unallocatedBudget: 0,
        utilizationPercent: 0,
        visualProgressPercent: 0,
        isOverBudget: false,
        isOverAllocated: false,
        hasOverspentItems: false,
        overspentCount: 0,
        itemCount: 0,
      });
    });

    it("handles null or undefined targetBudget without crashing", () => {
      const summary = calculateBudgetSummary(null, []);
      expect(summary.targetBudget).toBe(0);
      expect(summary.utilizationPercent).toBe(0);
      expect(summary.isOverBudget).toBe(false);
    });

    it("correctly computes metrics for a single item under budget", () => {
      const items = [{ estimated_amount: 500, actual_amount: 450 }];
      const summary = calculateBudgetSummary(1000, items);

      expect(summary.targetBudget).toBe(1000);
      expect(summary.totalEstimated).toBe(500);
      expect(summary.totalActual).toBe(450);
      expect(summary.variance).toBe(-50); // spent 50 less than estimated
      expect(summary.remainingActualBudget).toBe(550); // 1000 - 450
      expect(summary.remainingBudget).toBe(550);
      expect(summary.unallocatedBudget).toBe(500); // 1000 - 500
      expect(summary.utilizationPercent).toBe(45); // 450 / 1000 = 45%
      expect(summary.visualProgressPercent).toBe(45);
      expect(summary.isOverBudget).toBe(false);
      expect(summary.isOverAllocated).toBe(false);
      expect(summary.hasOverspentItems).toBe(false);
      expect(summary.overspentCount).toBe(0);
      expect(summary.itemCount).toBe(1);
    });

    it("correctly computes metrics for multiple items with overspending", () => {
      const items = [
        { estimated_amount: 400, actual_amount: 500 }, // overspent by 100
        { estimated_amount: 300, actual_amount: 250 }, // underspent by 50
        { estimated_amount: 500, actual_amount: 600 }, // overspent by 100
      ];
      // total estimated = 1200, total actual = 1350, target = 1000
      const summary = calculateBudgetSummary(1000, items);

      expect(summary.totalEstimated).toBe(1200);
      expect(summary.totalActual).toBe(1350);
      expect(summary.variance).toBe(150);
      expect(summary.remainingActualBudget).toBe(-350);
      expect(summary.unallocatedBudget).toBe(-200);
      expect(summary.utilizationPercent).toBe(135); // 1350 / 1000 = 135%
      // Clamped visual progress percent
      expect(summary.visualProgressPercent).toBe(100);
      expect(summary.isOverBudget).toBe(true);
      expect(summary.isOverAllocated).toBe(true);
      expect(summary.hasOverspentItems).toBe(true);
      expect(summary.overspentCount).toBe(2);
      expect(summary.itemCount).toBe(3);
    });

    it("handles zero actual expenditures when estimated amount is positive", () => {
      const items = [
        { estimated_amount: "250.75", actual_amount: 0 },
        { estimated_amount: "149.25", actual_amount: "0.00" },
      ];
      const summary = calculateBudgetSummary("500", items);

      expect(summary.totalEstimated).toBe(400);
      expect(summary.totalActual).toBe(0);
      expect(summary.variance).toBe(-400);
      expect(summary.remainingActualBudget).toBe(500);
      expect(summary.unallocatedBudget).toBe(100);
      expect(summary.utilizationPercent).toBe(0);
      expect(summary.visualProgressPercent).toBe(0);
      expect(summary.hasOverspentItems).toBe(false);
      expect(summary.overspentCount).toBe(0);
    });

    it("prevents division-by-zero when targetBudget is 0 but expenses exist", () => {
      const items = [{ estimated_amount: 100, actual_amount: 120 }];
      const summary = calculateBudgetSummary(0, items);

      expect(summary.utilizationPercent).toBe(0);
      expect(summary.visualProgressPercent).toBe(0);
      expect(summary.isOverBudget).toBe(false); // targetCents > 0 condition
      expect(summary.remainingActualBudget).toBe(-120);
      expect(summary.hasOverspentItems).toBe(true);
      expect(summary.overspentCount).toBe(1);
    });

    it("handles large amounts within supported limits (up to $9,999,999,999.99)", () => {
      const largeTarget = 10_000_000; // 10 million
      const items = [
        { estimated_amount: 5_000_000.5, actual_amount: 4_999_999.99 },
        { estimated_amount: 4_500_000, actual_amount: 4_600_000.01 },
      ];
      const summary = calculateBudgetSummary(largeTarget, items);

      expect(summary.targetBudget).toBe(10_000_000);
      expect(summary.totalEstimated).toBe(9_500_000.5);
      expect(summary.totalActual).toBe(9_600_000);
      expect(summary.variance).toBe(99_999.5);
      expect(summary.remainingActualBudget).toBe(400_000);
      expect(summary.utilizationPercent).toBe(96);
      expect(summary.isOverBudget).toBe(false);
    });
  });

  describe("calculateCategoryBreakdown", () => {
    it("handles empty items collection", () => {
      const breakdown = calculateCategoryBreakdown(1000, []);
      expect(breakdown).toEqual([]);
    });

    it("aggregates multiple items within categories and sorts descending by totalEstimated", () => {
      const items = [
        { category: "Catering", estimated_amount: 500, actual_amount: 550 },
        { category: "Venue", estimated_amount: 1200, actual_amount: 1200 },
        { category: "Catering", estimated_amount: 300, actual_amount: 250 },
        { category: "Music", estimated_amount: 400, actual_amount: 450 },
      ];

      // Venue total: est 1200, act 1200
      // Catering total: est 800, act 800
      // Music total: est 400, act 450
      const targetBudget = 3000;
      const breakdown = calculateCategoryBreakdown(targetBudget, items);

      expect(breakdown.length).toBe(3);

      // Venue (1st)
      expect(breakdown[0]).toEqual({
        category: "Venue",
        totalEstimated: 1200,
        totalActual: 1200,
        variance: 0,
        itemCount: 1,
        percentageOfTargetBudget: 40, // 1200 / 3000 = 40%
        percentOfTargetBudget: 40,
        percentageOfTotalEstimated: 50, // 1200 / 2400 = 50%
        isOverspent: false,
      });

      // Catering (2nd)
      expect(breakdown[1]).toEqual({
        category: "Catering",
        totalEstimated: 800,
        totalActual: 800,
        variance: 0,
        itemCount: 2,
        percentageOfTargetBudget: 26.67, // 800 / 3000 = 26.67%
        percentOfTargetBudget: 26.67,
        percentageOfTotalEstimated: 33.33, // 800 / 2400 = 33.33%
        isOverspent: false,
      });

      // Music (3rd)
      expect(breakdown[2]).toEqual({
        category: "Music",
        totalEstimated: 400,
        totalActual: 450,
        variance: 50,
        itemCount: 1,
        percentageOfTargetBudget: 13.33,
        percentOfTargetBudget: 13.33,
        percentageOfTotalEstimated: 16.67,
        isOverspent: true,
      });
    });

    it("falls back to 'Uncategorized' for items with empty or whitespace-only category", () => {
      const items = [
        { category: "", estimated_amount: 100, actual_amount: 80 },
        { category: "   ", estimated_amount: 200, actual_amount: 250 },
      ];
      const breakdown = calculateCategoryBreakdown(500, items);

      expect(breakdown.length).toBe(1);
      expect(breakdown[0].category).toBe("Uncategorized");
      expect(breakdown[0].totalEstimated).toBe(300);
      expect(breakdown[0].totalActual).toBe(330);
      expect(breakdown[0].itemCount).toBe(2);
      expect(breakdown[0].isOverspent).toBe(true);
    });

    it("handles zero target budget safely without division-by-zero errors", () => {
      const items = [
        { category: "Decor", estimated_amount: 100, actual_amount: 100 },
      ];
      const breakdown = calculateCategoryBreakdown(0, items);

      expect(breakdown[0].percentageOfTargetBudget).toBe(0);
      expect(breakdown[0].percentOfTargetBudget).toBe(0);
      expect(breakdown[0].percentageOfTotalEstimated).toBe(100);
    });

    it("sorts alphabetically when estimated amounts are identical", () => {
      const items = [
        { category: "Zebra", estimated_amount: 100, actual_amount: 50 },
        { category: "Apple", estimated_amount: 100, actual_amount: 50 },
      ];
      const breakdown = calculateCategoryBreakdown(500, items);

      expect(breakdown[0].category).toBe("Apple");
      expect(breakdown[1].category).toBe("Zebra");
    });
  });
});
