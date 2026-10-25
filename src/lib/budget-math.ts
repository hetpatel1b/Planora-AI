/**
 * Planora AI — Deterministic Budget Calculation Engine
 * 
 * Provides decimal-safe monetary arithmetic for F03 Smart Budget Manager.
 * All internal additions and subtractions are computed in integer cents
 * to eliminate floating-point inaccuracies (e.g., 0.1 + 0.2 !== 0.3).
 */

/**
 * Converts a dollar amount into integer cents safely.
 */
export function toCents(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === "") return 0;
  const num = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer cents back into a standard two-decimal dollar figure.
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

export interface BudgetSummary {
  /** Target budget ceiling from the parent event record */
  targetBudget: number;
  /** Sum of all projected line-item expenses */
  totalEstimated: number;
  /** Sum of all actual recorded expenditures */
  totalActual: number;
  /** Total expenditure variance: totalActual - totalEstimated */
  variance: number;
  /** Remaining cash balance: targetBudget - totalActual (preserves negative values if overspent) */
  remainingActualBudget: number;
  /** Direct alias for remainingActualBudget */
  remainingBudget: number;
  /** Planning cushion: targetBudget - totalEstimated (preserves negative values if overallocated) */
  unallocatedBudget: number;
  /** Real, uncapped expenditure utilization percentage against target budget (e.g., 125.5%) */
  utilizationPercent: number;
  /** Clamped percentage (0 - 100) strictly for rendering visual progress bar widths */
  visualProgressPercent: number;
  /** True when total actual spending strictly exceeds target budget */
  isOverBudget: boolean;
  /** True when total estimated allocations strictly exceed target budget */
  isOverAllocated: boolean;
  /** True if any individual line item has spent more than its estimate */
  hasOverspentItems: boolean;
  /** Total count of individual line items that exceed their estimate */
  overspentCount: number;
  /** Total count of budget items */
  itemCount: number;
}

export interface CategorySummary {
  category: string;
  totalEstimated: number;
  totalActual: number;
  variance: number;
  itemCount: number;
  /** Percentage of target budget allocated to this category (0 if targetBudget === 0) */
  percentageOfTargetBudget: number;
  /** Direct alias for percentageOfTargetBudget */
  percentOfTargetBudget: number;
  /** Percentage of total estimated expenses allocated to this category */
  percentageOfTotalEstimated: number;
  /** True if category actual spending exceeds estimated allocation */
  isOverspent: boolean;
}

/**
 * Calculates line-item cost variance: actual_amount - estimated_amount.
 * Positive variance indicates spending over estimate.
 */
export function getItemVariance(item: {
  estimated_amount: number | string;
  actual_amount: number | string;
}): number {
  return fromCents(toCents(item.actual_amount) - toCents(item.estimated_amount));
}

/**
 * Checks if a specific line item is overspent.
 * Returns true if actual_amount strictly exceeds estimated_amount and actual > 0.
 */
export function isItemOverspent(item: {
  estimated_amount: number | string;
  actual_amount: number | string;
}): boolean {
  const actualCents = toCents(item.actual_amount);
  const estimatedCents = toCents(item.estimated_amount);
  return actualCents > estimatedCents && actualCents > 0;
}

/**
 * Computes high-level financial KPIs for an event and its budget items.
 * Guaranteed to never produce NaN, Infinity, or division by zero.
 */
export function calculateBudgetSummary(
  targetBudget: number | string | null | undefined,
  items: Array<{
    estimated_amount: number | string;
    actual_amount: number | string;
  }>
): BudgetSummary {
  const targetCents = toCents(targetBudget);
  
  let totalEstimatedCents = 0;
  let totalActualCents = 0;
  let hasOverspentItems = false;
  let overspentCount = 0;

  for (const item of items) {
    const estCents = toCents(item.estimated_amount);
    const actCents = toCents(item.actual_amount);

    totalEstimatedCents += estCents;
    totalActualCents += actCents;

    if (actCents > estCents && actCents > 0) {
      hasOverspentItems = true;
      overspentCount += 1;
    }
  }

  const varianceCents = totalActualCents - totalEstimatedCents;
  const remainingActualCents = targetCents - totalActualCents;
  const unallocatedCents = targetCents - totalEstimatedCents;

  // Compute uncapped utilization percentage (e.g. 110.25%)
  let utilizationPercent = 0;
  if (targetCents > 0) {
    utilizationPercent = Math.round((totalActualCents / targetCents) * 10000) / 100;
  }

  // Clamped strictly for UI progress bar width styling
  const visualProgressPercent = Math.min(100, Math.max(0, utilizationPercent));

  return {
    targetBudget: fromCents(targetCents),
    totalEstimated: fromCents(totalEstimatedCents),
    totalActual: fromCents(totalActualCents),
    variance: fromCents(varianceCents),
    remainingActualBudget: fromCents(remainingActualCents),
    remainingBudget: fromCents(remainingActualCents),
    unallocatedBudget: fromCents(unallocatedCents),
    utilizationPercent,
    visualProgressPercent,
    isOverBudget: targetCents > 0 && totalActualCents > targetCents,
    isOverAllocated: targetCents > 0 && totalEstimatedCents > targetCents,
    hasOverspentItems,
    overspentCount,
    itemCount: items.length,
  };
}

/**
 * Groups budget items by category and aggregates cost breakdowns.
 * Categories are sorted descending by total estimated amount.
 */
export function calculateCategoryBreakdown(
  targetBudget: number | string | null | undefined,
  items: Array<{
    category: string;
    estimated_amount: number | string;
    actual_amount: number | string;
  }>
): CategorySummary[] {
  const targetCents = toCents(targetBudget);
  const categoryMap = new Map<
    string,
    { estimatedCents: number; actualCents: number; count: number }
  >();

  let totalEstimatedCentsAll = 0;

  for (const item of items) {
    const category = item.category?.trim() || "Uncategorized";
    const estCents = toCents(item.estimated_amount);
    const actCents = toCents(item.actual_amount);

    totalEstimatedCentsAll += estCents;

    const existing = categoryMap.get(category) || {
      estimatedCents: 0,
      actualCents: 0,
      count: 0,
    };

    existing.estimatedCents += estCents;
    existing.actualCents += actCents;
    existing.count += 1;

    categoryMap.set(category, existing);
  }

  const summaries: CategorySummary[] = [];

  for (const [category, data] of categoryMap.entries()) {
    const varianceCents = data.actualCents - data.estimatedCents;

    let percentageOfTargetBudget = 0;
    if (targetCents > 0) {
      percentageOfTargetBudget =
        Math.round((data.estimatedCents / targetCents) * 10000) / 100;
    }

    let percentageOfTotalEstimated = 0;
    if (totalEstimatedCentsAll > 0) {
      percentageOfTotalEstimated =
        Math.round((data.estimatedCents / totalEstimatedCentsAll) * 10000) / 100;
    }

    summaries.push({
      category,
      totalEstimated: fromCents(data.estimatedCents),
      totalActual: fromCents(data.actualCents),
      variance: fromCents(varianceCents),
      itemCount: data.count,
      percentageOfTargetBudget,
      percentOfTargetBudget: percentageOfTargetBudget,
      percentageOfTotalEstimated,
      isOverspent: data.actualCents > data.estimatedCents && data.actualCents > 0,
    });
  }

  // Sort descending by total estimated amount, secondary by category name
  return summaries.sort((a, b) => {
    if (b.totalEstimated !== a.totalEstimated) {
      return b.totalEstimated - a.totalEstimated;
    }
    return a.category.localeCompare(b.category);
  });
}
