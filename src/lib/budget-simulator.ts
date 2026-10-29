import {
  toCents,
  fromCents,
  calculateBudgetSummary,
  calculateCategoryBreakdown,
  type BudgetSummary,
} from "@/lib/budget-math";
import type { BudgetItemRow } from "@/lib/validations/budget";
import { MAX_SIMULATION_SCENARIOS } from "@/lib/validations/simulator";

import {
  MIN_CURRENCY_AMOUNT,
  MAX_CURRENCY_AMOUNT,
  MAX_CURRENCY_DECIMALS,
  validateCurrencyValue,
} from "@/lib/validations/currency";

/**
 * Bounds consistent with PostgreSQL NUMERIC(12, 2) and Planora AI currency conventions.
 */
export const MIN_SIMULATOR_AMOUNT = MIN_CURRENCY_AMOUNT;
export const MAX_SIMULATOR_AMOUNT = MAX_CURRENCY_AMOUNT;
export const MAX_SIMULATOR_DECIMALS = MAX_CURRENCY_DECIMALS;

/**
 * Validates monetary numbers or numeric strings for what-if scenarios.
 * Throws a descriptive Error if the value violates currency bounds or precision.
 */
export function validateScenarioAmount(
  val: unknown,
  fieldLabel = "Amount"
): number {
  const result = validateCurrencyValue(val, fieldLabel);
  if (!result.valid) {
    let msg = result.error!;
    if (msg.includes("must be a valid number")) {
      msg = `Invalid ${fieldLabel}: Must be a valid numeric value.`;
    } else {
      msg = `Invalid ${fieldLabel}: ${msg.replace(new RegExp(`^${fieldLabel} `, "i"), "")}`;
    }
    throw new Error(msg);
  }

  return result.amount!;
}

/**
 * In-memory override for an existing saved budget item.
 */
export interface ScenarioItemOverride {
  id: string;
  estimated_amount?: number;
  actual_amount?: number;
  is_deleted?: boolean;
}

/**
 * In-memory newly proposed candidate expense item.
 */
export interface ScenarioNewItem {
  tempId: string;
  category: string;
  item_name: string;
  estimated_amount: number;
  actual_amount?: number;
  notes?: string | null;
}

/**
 * Complete in-memory scenario definition input.
 */
export interface BudgetScenarioInput {
  id: string;
  name: string;
  target_budget?: number | null;
  item_overrides?: Record<string, ScenarioItemOverride> | ScenarioItemOverride[];
  new_items?: ScenarioNewItem[];
}

/**
 * Computed item within a simulated scenario.
 */
export interface ComputedScenarioItem {
  id: string;
  category: string;
  item_name: string;
  estimated_amount: number;
  actual_amount: number;
  notes: string | null;
  isHypotheticalNew?: boolean;
  isModified?: boolean;
}

/**
 * Per-category delta breakdown between baseline and hypothetical scenario.
 */
export interface CategoryDelta {
  category: string;
  baselineEstimated: number;
  scenarioEstimated: number;
  /** Difference in estimated allocations: scenarioEstimated - baselineEstimated */
  deltaEstimated: number;
  baselineActual: number;
  scenarioActual: number;
  /** Difference in actual spending: scenarioActual - baselineActual */
  deltaActual: number;
  isOverspent: boolean;
}

/**
 * Complete result of evaluating a hypothetical budget scenario against baseline.
 */
export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  effectiveTargetBudget: number;
  baselineSummary: BudgetSummary;
  scenarioSummary: BudgetSummary;
  /** Difference in estimated totals: scenarioEstimated - baselineEstimated */
  deltaEstimatedTotal: number;
  /** Difference in actual totals: scenarioActual - baselineActual */
  deltaActualTotal: number;
  /** Projected savings if scenario costs less than baseline: max(0, baselineEstimated - scenarioEstimated) */
  projectedSavings: number;
  /** Projected overspending beyond effective target budget: max(0, scenarioEstimated - effectiveTargetBudget) */
  projectedOverspending: number;
  /** Difference in remaining budget cushion: scenarioRemaining - baselineRemaining */
  deltaRemainingBudget: number;
  /** Per-category comparison breakdown */
  categoryDeltas: CategoryDelta[];
  /** Computed items in the scenario (unmodified baseline + edited + new - deleted) */
  computedItems: ComputedScenarioItem[];
}

/**
 * Side-by-side comparison result across multiple named scenarios.
 */
export interface MultiScenarioComparison {
  baselineSummary: BudgetSummary;
  scenarios: ScenarioResult[];
}

/**
 * Calculates standard baseline financial metrics from saved event records.
 * Pure wrapper over calculateBudgetSummary.
 */
export function calculateBaselineSummary(
  targetBudget: number | string | null | undefined,
  items: BudgetItemRow[]
): BudgetSummary {
  return calculateBudgetSummary(targetBudget, items);
}

/**
 * Pure calculation engine evaluating an in-memory hypothetical scenario against baseline.
 * 
 * Guarantees:
 * - 100% side-effect free: zero database writes, zero network calls.
 * - Does not mutate the supplied baseline items or scenario input.
 * - All calculations computed using integer cents via toCents / fromCents.
 * - Distinct handling of estimated vs. actual figures.
 * - Preserves existing baseline calculations if no scenario modifications exist.
 */
export function simulateBudgetScenario(
  baselineTargetBudget: number | string | null | undefined,
  baselineItems: BudgetItemRow[],
  scenarioInput?: BudgetScenarioInput | null
): ScenarioResult {
  const scenarioId = scenarioInput?.id ?? "scenario-current";
  const scenarioName = scenarioInput?.name ?? "Simulated Scenario";

  // 1. Calculate baseline summary
  const baselineSummary = calculateBudgetSummary(baselineTargetBudget, baselineItems);

  // 2. Determine effective target budget
  let effectiveTargetBudget: number;
  if (
    scenarioInput?.target_budget !== undefined &&
    scenarioInput?.target_budget !== null
  ) {
    effectiveTargetBudget = validateScenarioAmount(
      scenarioInput.target_budget,
      "Target budget"
    );
  } else {
    effectiveTargetBudget = baselineSummary.targetBudget;
  }

  // 3. Normalize item overrides into a lookup map
  const overridesMap = new Map<string, ScenarioItemOverride>();
  if (scenarioInput?.item_overrides) {
    if (Array.isArray(scenarioInput.item_overrides)) {
      for (const override of scenarioInput.item_overrides) {
        if (override && override.id) {
          overridesMap.set(override.id, override);
        }
      }
    } else {
      for (const [id, override] of Object.entries(scenarioInput.item_overrides)) {
        if (override) {
          overridesMap.set(id, override);
        }
      }
    }
  }

  // 4. Construct computed items list without mutating inputs
  const computedItems: ComputedScenarioItem[] = [];

  for (const item of baselineItems) {
    const override = overridesMap.get(item.id);

    if (override?.is_deleted) {
      // Excluded from scenario
      continue;
    }

    let estAmount = Number(item.estimated_amount);
    let actAmount = Number(item.actual_amount);
    let isModified = false;

    if (override?.estimated_amount !== undefined) {
      estAmount = validateScenarioAmount(
        override.estimated_amount,
        `Estimated amount for ${item.item_name}`
      );
      isModified = true;
    }

    if (override?.actual_amount !== undefined) {
      actAmount = validateScenarioAmount(
        override.actual_amount,
        `Actual amount for ${item.item_name}`
      );
      isModified = true;
    }

    computedItems.push({
      id: item.id,
      category: item.category,
      item_name: item.item_name,
      estimated_amount: estAmount,
      actual_amount: actAmount,
      notes: item.notes,
      isModified,
      isHypotheticalNew: false,
    });
  }

  // 5. Append candidate new items
  if (scenarioInput?.new_items && Array.isArray(scenarioInput.new_items)) {
    for (const newItem of scenarioInput.new_items) {
      const validEst = validateScenarioAmount(
        newItem.estimated_amount,
        `Estimated amount for new item ${newItem.item_name}`
      );
      const validAct =
        newItem.actual_amount !== undefined
          ? validateScenarioAmount(
              newItem.actual_amount,
              `Actual amount for new item ${newItem.item_name}`
            )
          : 0;

      computedItems.push({
        id: newItem.tempId,
        category: newItem.category.trim() || "Other",
        item_name: newItem.item_name.trim(),
        estimated_amount: validEst,
        actual_amount: validAct,
        notes: newItem.notes ?? null,
        isHypotheticalNew: true,
        isModified: false,
      });
    }
  }

  // 6. Calculate scenario budget summary
  const scenarioSummary = calculateBudgetSummary(effectiveTargetBudget, computedItems);

  // 7. Calculate integer-cent financial deltas
  const baselineEstCents = toCents(baselineSummary.totalEstimated);
  const scenarioEstCents = toCents(scenarioSummary.totalEstimated);

  const baselineActCents = toCents(baselineSummary.totalActual);
  const scenarioActCents = toCents(scenarioSummary.totalActual);

  const targetCents = toCents(effectiveTargetBudget);

  // Delta = scenario - baseline (negative indicates spending reduction)
  const deltaEstCents = scenarioEstCents - baselineEstCents;
  const deltaActCents = scenarioActCents - baselineActCents;

  // Projected savings = amount by which scenario is lower than baseline
  const projectedSavingsCents = Math.max(0, baselineEstCents - scenarioEstCents);

  // Projected overspending = amount by which scenario exceeds effective target budget
  const projectedOverspendingCents =
    targetCents > 0 ? Math.max(0, scenarioEstCents - targetCents) : scenarioEstCents;

  // Remaining budget delta = scenarioRemaining - baselineRemaining
  const baselineRemCents = toCents(baselineSummary.unallocatedBudget);
  const scenarioRemCents = toCents(scenarioSummary.unallocatedBudget);
  const deltaRemCents = scenarioRemCents - baselineRemCents;

  // 8. Calculate per-category deltas
  const baselineCategories = calculateCategoryBreakdown(
    baselineSummary.targetBudget,
    baselineItems
  );
  const scenarioCategories = calculateCategoryBreakdown(
    effectiveTargetBudget,
    computedItems
  );

  const baselineCatMap = new Map(baselineCategories.map((c) => [c.category, c]));
  const scenarioCatMap = new Map(scenarioCategories.map((c) => [c.category, c]));

  const allCategories = Array.from(
    new Set([...baselineCatMap.keys(), ...scenarioCatMap.keys()])
  ).sort();

  const categoryDeltas: CategoryDelta[] = allCategories.map((cat) => {
    const bCat = baselineCatMap.get(cat);
    const sCat = scenarioCatMap.get(cat);

    const bEst = bCat ? bCat.totalEstimated : 0;
    const sEst = sCat ? sCat.totalEstimated : 0;
    const bAct = bCat ? bCat.totalActual : 0;
    const sAct = sCat ? sCat.totalActual : 0;

    const deltaEst = fromCents(toCents(sEst) - toCents(bEst));
    const deltaAct = fromCents(toCents(sAct) - toCents(bAct));

    return {
      category: cat,
      baselineEstimated: bEst,
      scenarioEstimated: sEst,
      deltaEstimated: deltaEst,
      baselineActual: bAct,
      scenarioActual: sAct,
      deltaActual: deltaAct,
      isOverspent: sCat?.isOverspent ?? false,
    };
  });

  return {
    scenarioId,
    scenarioName,
    effectiveTargetBudget,
    baselineSummary,
    scenarioSummary,
    deltaEstimatedTotal: fromCents(deltaEstCents),
    deltaActualTotal: fromCents(deltaActCents),
    projectedSavings: fromCents(projectedSavingsCents),
    projectedOverspending: fromCents(projectedOverspendingCents),
    deltaRemainingBudget: fromCents(deltaRemCents),
    categoryDeltas,
    computedItems,
  };
}

/**
 * Compares the baseline budget against multiple named scenarios simultaneously.
 * Supports up to MAX_SIMULATION_SCENARIOS (3) named scenarios.
 */
export function compareBudgetScenarios(
  baselineTargetBudget: number | string | null | undefined,
  baselineItems: BudgetItemRow[],
  scenarios: BudgetScenarioInput[]
): MultiScenarioComparison {
  if (scenarios.length > MAX_SIMULATION_SCENARIOS) {
    throw new Error(
      `Cannot compare more than ${MAX_SIMULATION_SCENARIOS} scenarios simultaneously.`
    );
  }

  const baselineSummary = calculateBudgetSummary(baselineTargetBudget, baselineItems);

  const scenarioResults = scenarios.map((scenario) =>
    simulateBudgetScenario(baselineTargetBudget, baselineItems, scenario)
  );

  return {
    baselineSummary,
    scenarios: scenarioResults,
  };
}

/**
 * Pure data transformation returning an empty, clean scenario definition.
 * Used to reset in-memory scenario workbench back to the baseline saved state.
 */
export function resetScenario(
  scenarioId = "scenario-default",
  scenarioName = "New Scenario"
): BudgetScenarioInput {
  return {
    id: scenarioId,
    name: scenarioName,
    target_budget: null,
    item_overrides: [],
    new_items: [],
  };
}
