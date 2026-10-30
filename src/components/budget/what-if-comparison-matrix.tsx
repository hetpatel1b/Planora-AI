import * as React from "react";
import type { MultiScenarioComparison } from "@/lib/budget-simulator";
import { formatMoney } from "@/lib/currency-utils";
import { Badge } from "@/components/ui/badge";
import { Columns, Check, AlertTriangle } from "lucide-react";

export interface WhatIfComparisonMatrixProps {
  comparisonResults: MultiScenarioComparison;
}

/**
 * Presentational Multi-Scenario Comparison Matrix for What-If Budget Simulator.
 * Compares all draft scenarios side-by-side against authoritative saved baseline.
 */
export function WhatIfComparisonMatrix({ comparisonResults }: WhatIfComparisonMatrixProps) {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs dark:border-indigo-900 dark:bg-slate-900 space-y-4">
      <h4 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
        <Columns className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <span>Multi-Scenario Comparison Matrix</span>
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" aria-label="Multi-Scenario Comparison Matrix">
          <thead className="border-b border-slate-200 text-slate-600 dark:text-slate-400 dark:border-slate-800">
            <tr>
              <th scope="col" className="py-2 pr-4 font-semibold">Scenario</th>
              <th scope="col" className="py-2 px-4 font-semibold">Target Budget</th>
              <th scope="col" className="py-2 px-4 font-semibold">Projected Spend</th>
              <th scope="col" className="py-2 px-4 font-semibold">Delta vs Baseline</th>
              <th scope="col" className="py-2 px-4 font-semibold">Projected Savings</th>
              <th scope="col" className="py-2 pl-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr className="bg-slate-50/60 font-semibold dark:bg-slate-950/40">
              <td className="py-2.5 pr-4">Baseline (Saved)</td>
              <td className="py-2.5 px-4 font-mono">
                {formatMoney(comparisonResults.baselineSummary.targetBudget)}
              </td>
              <td className="py-2.5 px-4 font-mono">
                {formatMoney(comparisonResults.baselineSummary.totalEstimated)}
              </td>
              <td className="py-2.5 px-4 font-mono text-slate-500">—</td>
              <td className="py-2.5 px-4 font-mono text-slate-500">—</td>
              <td className="py-2.5 pl-4">
                <Badge variant="outline">Current</Badge>
              </td>
            </tr>
            {comparisonResults.scenarios.map((sc) => (
              <tr key={sc.scenarioId}>
                <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-100">
                  {sc.scenarioName}
                </td>
                <td className="py-2.5 px-4 font-mono">
                  {formatMoney(sc.effectiveTargetBudget)}
                </td>
                <td className="py-2.5 px-4 font-mono">
                  {formatMoney(sc.scenarioSummary.totalEstimated)}
                </td>
                <td
                  className={`py-2.5 px-4 font-mono font-semibold ${
                    sc.deltaEstimatedTotal < 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : sc.deltaEstimatedTotal > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-500"
                  }`}
                >
                  {sc.deltaEstimatedTotal > 0 ? "+" : ""}
                  {formatMoney(sc.deltaEstimatedTotal)}
                </td>
                <td className="py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {sc.projectedSavings > 0 ? formatMoney(sc.projectedSavings) : "—"}
                </td>
                <td className="py-2.5 pl-4">
                  {sc.projectedOverspending > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="size-3" />
                      <span>Over by {formatMoney(sc.projectedOverspending)}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3" />
                      <span>Within Budget</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
