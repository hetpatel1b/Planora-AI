import { describe, it, expect } from "vitest";
import {
  simulateBudgetScenario,
  compareBudgetScenarios,
  resetScenario,
  validateScenarioAmount,
} from "@/lib/budget-simulator";
import type { BudgetItemRow } from "@/lib/validations/budget";

describe("What-If Budget Simulator Engine", () => {
  const sampleItems: BudgetItemRow[] = [
    {
      id: "item-venue-1",
      event_id: "event-1",
      user_id: "user-1",
      plan_revision_id: null,
      category: "Venue & Facilities",
      item_name: "Grand Ballroom",
      estimated_amount: 5000.0,
      actual_amount: 5200.0,
      notes: "Deposit paid",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "item-catering-1",
      event_id: "event-1",
      user_id: "user-1",
      plan_revision_id: null,
      category: "Catering & Bar",
      item_name: "Plated Dinner",
      estimated_amount: 3000.0,
      actual_amount: 2800.0,
      notes: "100 guests",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "item-decor-1",
      event_id: "event-1",
      user_id: "user-1",
      plan_revision_id: null,
      category: "Decor & Styling",
      item_name: "Centerpieces",
      estimated_amount: 1000.0,
      actual_amount: 0.0,
      notes: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  const targetBudget = 10000.0;

  it("returns identical summary to baseline when scenario has no overrides", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, null);

    expect(result.baselineSummary.totalEstimated).toBe(9000.0);
    expect(result.baselineSummary.totalActual).toBe(8000.0);
    expect(result.scenarioSummary.totalEstimated).toBe(9000.0);
    expect(result.scenarioSummary.totalActual).toBe(8000.0);
    expect(result.deltaEstimatedTotal).toBe(0.0);
    expect(result.deltaActualTotal).toBe(0.0);
    expect(result.projectedSavings).toBe(0.0);
    expect(result.projectedOverspending).toBe(0.0);
  });

  it("calculates cost increase when estimated cost is raised", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, {
      id: "scenario-higher-venue",
      name: "Expanded Ballroom",
      item_overrides: [
        {
          id: "item-venue-1",
          estimated_amount: 6500.0, // +$1500
        },
      ],
    });

    expect(result.scenarioSummary.totalEstimated).toBe(10500.0);
    expect(result.deltaEstimatedTotal).toBe(1500.0);
    expect(result.projectedSavings).toBe(0.0);
    expect(result.projectedOverspending).toBe(500.0); // 10500 - 10000
    expect(result.scenarioSummary.isOverAllocated).toBe(true);
    // Baseline items must remain untouched
    expect(result.baselineSummary.totalEstimated).toBe(9000.0);
  });

  it("calculates projected savings when estimated cost is reduced", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, {
      id: "scenario-negotiation",
      name: "15% Vendor Discount",
      item_overrides: [
        {
          id: "item-catering-1",
          estimated_amount: 2200.0, // -$800
        },
      ],
    });

    expect(result.scenarioSummary.totalEstimated).toBe(8200.0);
    expect(result.deltaEstimatedTotal).toBe(-800.0);
    expect(result.projectedSavings).toBe(800.0);
    expect(result.projectedOverspending).toBe(0.0);
    expect(result.deltaRemainingBudget).toBe(800.0);
  });

  it("correctly incorporates newly added candidate items into projected total", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, {
      id: "scenario-add-dj",
      name: "Add DJ and Lighting",
      new_items: [
        {
          tempId: "temp-dj-1",
          category: "Entertainment & AV",
          item_name: "DJ Package",
          estimated_amount: 750.0,
          actual_amount: 0,
        },
      ],
    });

    expect(result.scenarioSummary.totalEstimated).toBe(9750.0);
    expect(result.deltaEstimatedTotal).toBe(750.0);
    expect(result.computedItems.length).toBe(4);
    expect(result.computedItems.some((i) => i.id === "temp-dj-1")).toBe(true);
  });

  it("excludes deleted items from the scenario total", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, {
      id: "scenario-cut-decor",
      name: "Omit Centerpieces",
      item_overrides: [
        {
          id: "item-decor-1",
          is_deleted: true, // removes $1000 estimate
        },
      ],
    });

    expect(result.scenarioSummary.totalEstimated).toBe(8000.0);
    expect(result.deltaEstimatedTotal).toBe(-1000.0);
    expect(result.projectedSavings).toBe(1000.0);
    expect(result.computedItems.length).toBe(2);
    expect(result.computedItems.some((i) => i.id === "item-decor-1")).toBe(false);
  });

  it("respects hypothetical target-budget override", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, {
      id: "scenario-budget-drop",
      name: "Budget Slashed to $8,000",
      target_budget: 8000.0,
    });

    expect(result.effectiveTargetBudget).toBe(8000.0);
    expect(result.scenarioSummary.targetBudget).toBe(8000.0);
    // Baseline target remains 10000
    expect(result.baselineSummary.targetBudget).toBe(10000.0);
    // Scenario total is 9000, which now exceeds 8000 by 1000
    expect(result.projectedOverspending).toBe(1000.0);
    expect(result.scenarioSummary.isOverAllocated).toBe(true);
  });

  it("calculates per-category deltas accurately", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, {
      id: "scenario-cat-test",
      name: "Category Shift",
      item_overrides: [
        { id: "item-venue-1", estimated_amount: 4500.0 }, // -500
        { id: "item-catering-1", estimated_amount: 3500.0 }, // +500
      ],
    });

    const venueDelta = result.categoryDeltas.find((c) => c.category === "Venue & Facilities");
    const cateringDelta = result.categoryDeltas.find((c) => c.category === "Catering & Bar");

    expect(venueDelta?.deltaEstimated).toBe(-500.0);
    expect(cateringDelta?.deltaEstimated).toBe(500.0);
    expect(result.deltaEstimatedTotal).toBe(0.0);
  });

  it("supports multi-scenario comparison matrix up to 3 scenarios", () => {
    const scenarioA = {
      id: "sc-a",
      name: "Scenario A: 10% Cut",
      item_overrides: [{ id: "item-venue-1", estimated_amount: 4500.0 }],
    };
    const scenarioB = {
      id: "sc-b",
      name: "Scenario B: Premium Catering",
      item_overrides: [{ id: "item-catering-1", estimated_amount: 4000.0 }],
    };

    const comparison = compareBudgetScenarios(targetBudget, sampleItems, [scenarioA, scenarioB]);

    expect(comparison.scenarios.length).toBe(2);
    expect(comparison.scenarios[0].scenarioName).toBe("Scenario A: 10% Cut");
    expect(comparison.scenarios[0].deltaEstimatedTotal).toBe(-500.0);
    expect(comparison.scenarios[1].scenarioName).toBe("Scenario B: Premium Catering");
    expect(comparison.scenarios[1].deltaEstimatedTotal).toBe(1000.0);
  });

  it("rejects comparing more than 3 scenarios", () => {
    const s = { id: "s", name: "s" };
    expect(() =>
      compareBudgetScenarios(targetBudget, sampleItems, [s, s, s, s])
    ).toThrow("Cannot compare more than 3 scenarios simultaneously.");
  });

  it("handles empty budgets gracefully without NaN or Infinity", () => {
    const result = simulateBudgetScenario(0, [], null);

    expect(result.baselineSummary.totalEstimated).toBe(0);
    expect(result.baselineSummary.totalActual).toBe(0);
    expect(result.scenarioSummary.totalEstimated).toBe(0);
    expect(result.deltaEstimatedTotal).toBe(0);
    expect(result.projectedSavings).toBe(0);
    expect(result.projectedOverspending).toBe(0);
    expect(result.categoryDeltas.length).toBe(0);
  });

  it("handles zero target budget without division by zero", () => {
    const result = simulateBudgetScenario(0, sampleItems, null);

    expect(result.effectiveTargetBudget).toBe(0);
    expect(result.scenarioSummary.utilizationPercent).toBe(0);
    expect(result.projectedOverspending).toBe(9000.0);
  });

  it("preserves exact integer cent arithmetic (0.10 + 0.20 = 0.30)", () => {
    const floatingItems: BudgetItemRow[] = [
      {
        id: "item-1",
        event_id: "event-1",
        user_id: "user-1",
        plan_revision_id: null,
        category: "Other",
        item_name: "Item 1",
        estimated_amount: 0.1,
        actual_amount: 0,
        notes: null,
        created_at: "",
        updated_at: "",
      },
      {
        id: "item-2",
        event_id: "event-1",
        user_id: "user-1",
        plan_revision_id: null,
        category: "Other",
        item_name: "Item 2",
        estimated_amount: 0.2,
        actual_amount: 0,
        notes: null,
        created_at: "",
        updated_at: "",
      },
    ];

    const result = simulateBudgetScenario(1.0, floatingItems, null);
    expect(result.scenarioSummary.totalEstimated).toBe(0.3);
    expect(result.scenarioSummary.totalEstimated).not.toBe(0.30000000000000004);
  });

  it("supports maximum allowed amount of 9,999,999,999.99", () => {
    const val = validateScenarioAmount(9_999_999_999.99);
    expect(val).toBe(9_999_999_999.99);
  });

  it("rejects negative, scientific notation, and out-of-range amounts", () => {
    expect(() => validateScenarioAmount(-1)).toThrow("Cannot be negative.");
    expect(() => validateScenarioAmount("1e5")).toThrow("Scientific notation is not supported");
    expect(() => validateScenarioAmount(10_000_000_000)).toThrow("Cannot exceed 9,999,999,999.99.");
    expect(() => validateScenarioAmount(10.555)).toThrow("Cannot have more than 2 decimal places.");
    expect(() => validateScenarioAmount("invalid")).toThrow("Must be a valid numeric value.");
  });

  it("does not modify actual amounts when only estimated amounts change", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, {
      id: "sc-est-only",
      name: "Estimated Only",
      item_overrides: [{ id: "item-venue-1", estimated_amount: 4000.0 }],
    });

    const venue = result.computedItems.find((i) => i.id === "item-venue-1");
    expect(venue?.estimated_amount).toBe(4000.0);
    expect(venue?.actual_amount).toBe(5200.0); // Exactly original actual spend
    expect(result.deltaActualTotal).toBe(0.0);
  });

  it("does not mutate original baseline items array or objects", () => {
    const originalVenueEst = sampleItems[0].estimated_amount;

    simulateBudgetScenario(targetBudget, sampleItems, {
      id: "sc-mutation-check",
      name: "Mutation Check",
      item_overrides: [{ id: "item-venue-1", estimated_amount: 9999.0 }],
    });

    expect(sampleItems[0].estimated_amount).toBe(originalVenueEst);
    expect(sampleItems.length).toBe(3);
  });

  it("resetScenario returns a clean baseline reset definition", () => {
    const reset = resetScenario("sc-reset", "Reset State");
    expect(reset.id).toBe("sc-reset");
    expect(reset.name).toBe("Reset State");
    expect(reset.target_budget).toBeNull();
    expect(reset.item_overrides).toEqual([]);
    expect(reset.new_items).toEqual([]);

    // Simulating with reset returns exact baseline
    const result = simulateBudgetScenario(targetBudget, sampleItems, reset);
    expect(result.deltaEstimatedTotal).toBe(0.0);
    expect(result.projectedSavings).toBe(0.0);
  });

  it("repeated calculations on identical inputs yield equivalent results", () => {
    const input = {
      id: "repeat-check",
      name: "Repeat",
      item_overrides: [{ id: "item-venue-1", estimated_amount: 4200.0 }],
    };

    const res1 = simulateBudgetScenario(targetBudget, sampleItems, input);
    const res2 = simulateBudgetScenario(targetBudget, sampleItems, input);

    expect(res1).toEqual(res2);
  });

  it("calculates baseline summary via calculateBaselineSummary helper", () => {
    const baseline = simulateBudgetScenario(targetBudget, sampleItems, null).baselineSummary;
    expect(baseline.totalEstimated).toBe(9000.0);
    expect(baseline.targetBudget).toBe(10000.0);
  });

  it("supports item_overrides passed as a Record map and modifying actual_amount", () => {
    const result = simulateBudgetScenario(targetBudget, sampleItems, {
      id: "sc-record",
      name: "Record Overrides",
      item_overrides: {
        "item-venue-1": {
          id: "item-venue-1",
          estimated_amount: 4800.0,
          actual_amount: 4900.0,
        },
      },
      new_items: [
        {
          tempId: "new-1",
          category: "Other",
          item_name: "Extra",
          estimated_amount: 100,
          actual_amount: 50,
        },
      ],
    });

    const venue = result.computedItems.find((i) => i.id === "item-venue-1");
    expect(venue?.estimated_amount).toBe(4800.0);
    expect(venue?.actual_amount).toBe(4900.0);
    expect(venue?.isModified).toBe(true);

    const newItem = result.computedItems.find((i) => i.id === "new-1");
    expect(newItem?.actual_amount).toBe(50);
  });

  it("rejects string amount with more than 2 decimal places", () => {
    expect(() => validateScenarioAmount("12.345")).toThrow(
      "Cannot have more than 2 decimal places."
    );
  });
});
