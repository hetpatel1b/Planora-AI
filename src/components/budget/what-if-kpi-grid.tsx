import * as React from "react";
import type { ScenarioResult } from "@/lib/budget-simulator";
import { formatMoney } from "@/lib/currency-utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export interface WhatIfKpiGridProps {
  simulationResult: ScenarioResult;
}

/**
 * Presentational KPI metric grid for the What-If Budget Simulator.
 * Displays real-time projected spend, baseline delta, projected savings, and budget cushion.
 */
export function WhatIfKpiGrid({ simulationResult }: WhatIfKpiGridProps) {
  const { scenarioSummary, baselineSummary, deltaEstimatedTotal, projectedSavings, projectedOverspending, effectiveTargetBudget } =
    simulationResult;

  return (
    <div
      aria-live="polite"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Projected Total */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Projected Spend
        </p>
        <p className="mt-1 font-mono text-lg font-bold text-slate-950 dark:text-white">
          {formatMoney(scenarioSummary.totalEstimated)}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          Baseline: {formatMoney(baselineSummary.totalEstimated)}
        </p>
      </div>

      {/* Delta vs Baseline */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Delta vs Baseline
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          {deltaEstimatedTotal < 0 ? (
            <TrendingDown className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : deltaEstimatedTotal > 0 ? (
            <TrendingUp className="size-4 text-rose-600 dark:text-rose-400" />
          ) : null}
          <span
            className={`font-mono text-lg font-bold ${
              deltaEstimatedTotal < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : deltaEstimatedTotal > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-950 dark:text-white"
            }`}
          >
            {deltaEstimatedTotal > 0 ? "+" : ""}
            {formatMoney(deltaEstimatedTotal)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {deltaEstimatedTotal < 0
            ? "Cost reduction"
            : deltaEstimatedTotal > 0
            ? "Cost increase"
            : "No change"}
        </p>
      </div>

      {/* Projected Savings */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Projected Savings
        </p>
        <p className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
          {formatMoney(projectedSavings)}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          Estimated spending saved
        </p>
      </div>

      {/* Projected Remaining / Overspend */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {projectedOverspending > 0
            ? "Projected Overspend"
            : "Remaining Cushion"}
        </p>
        <p
          className={`mt-1 font-mono text-lg font-bold ${
            projectedOverspending > 0
              ? "text-rose-600 dark:text-rose-400"
              : "text-slate-950 dark:text-white"
          }`}
        >
          {projectedOverspending > 0
            ? `-${formatMoney(projectedOverspending)}`
            : formatMoney(scenarioSummary.unallocatedBudget)}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Target Ceiling: {formatMoney(effectiveTargetBudget)}
        </p>
      </div>
    </div>
  );
}

