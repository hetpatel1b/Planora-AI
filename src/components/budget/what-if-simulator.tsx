"use client";

import * as React from "react";
import type { BudgetItemRow } from "@/lib/validations/budget";
import {
  simulateBudgetScenario,
  compareBudgetScenarios,
  resetScenario,
  type BudgetScenarioInput,
  type ScenarioNewItem,
  type ScenarioResult,
} from "@/lib/budget-simulator";
import { applyBudgetScenarioAction } from "@/lib/actions/simulator";
import { formatMoney } from "@/lib/currency-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sliders,
  RotateCcw,
  Plus,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Columns,
  Check,
  X,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";

export interface WhatIfSimulatorProps {
  eventId: string;
  baselineTargetBudget: number;
  baselineItems: BudgetItemRow[];
  onScenarioApplied?: () => void;
  onClose?: () => void;
}

export function WhatIfSimulator({
  eventId,
  baselineTargetBudget,
  baselineItems,
  onScenarioApplied,
  onClose,
}: WhatIfSimulatorProps) {
  // Scenario state: active scenario index (0, 1, 2)
  const [activeScenarioIdx, setActiveScenarioIdx] = React.useState<number>(0);
  const [scenarios, setScenarios] = React.useState<BudgetScenarioInput[]>([
    {
      id: "scenario-1",
      name: "Scenario A: Vendor Adjustments",
      target_budget: null,
      item_overrides: [],
      new_items: [],
    },
    {
      id: "scenario-2",
      name: "Scenario B: Budget Optimization",
      target_budget: null,
      item_overrides: [],
      new_items: [],
    },
  ]);

  // Dialog & Review states
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [applySuccess, setApplySuccess] = React.useState<string | null>(null);
  const [isComparisonView, setIsComparisonView] = React.useState(false);

  // New Candidate Item form state
  const [isAddingNewItem, setIsAddingNewItem] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState("");
  const [newItemCategory, setNewItemCategory] = React.useState("Venue & Facilities");
  const [newItemAmount, setNewItemAmount] = React.useState("");

  const currentScenario = scenarios[activeScenarioIdx] || scenarios[0];

  // Pure simulation evaluation
  const simulationResult: ScenarioResult = React.useMemo(() => {
    return simulateBudgetScenario(
      baselineTargetBudget,
      baselineItems,
      currentScenario
    );
  }, [baselineTargetBudget, baselineItems, currentScenario]);

  // Multi-scenario comparison matrix
  const comparisonResults = React.useMemo(() => {
    if (!isComparisonView) return null;
    return compareBudgetScenarios(
      baselineTargetBudget,
      baselineItems,
      scenarios
    );
  }, [baselineTargetBudget, baselineItems, scenarios, isComparisonView]);

  // Handler for modifying target budget override
  const handleTargetBudgetChange = (value: string) => {
    const num = value.trim() === "" ? null : Number(value);
    setScenarios((prev) =>
      prev.map((s, idx) =>
        idx === activeScenarioIdx
          ? { ...s, target_budget: isNaN(num as number) ? null : num }
          : s
      )
    );
  };

  // Handler for overriding an existing item's estimated amount
  const handleItemEstimateChange = (itemId: string, newEstimateStr: string) => {
    const num = Number(newEstimateStr);
    const validAmount = isNaN(num) || num < 0 ? 0 : num;

    setScenarios((prev) =>
      prev.map((s, idx) => {
        if (idx !== activeScenarioIdx) return s;

        const existingOverrides = Array.isArray(s.item_overrides)
          ? [...s.item_overrides]
          : Object.values(s.item_overrides || {});

        const itemIdx = existingOverrides.findIndex((o) => o.id === itemId);
        if (itemIdx >= 0) {
          existingOverrides[itemIdx] = {
            ...existingOverrides[itemIdx],
            estimated_amount: validAmount,
            is_deleted: false,
          };
        } else {
          existingOverrides.push({
            id: itemId,
            estimated_amount: validAmount,
            is_deleted: false,
          });
        }

        return { ...s, item_overrides: existingOverrides };
      })
    );
  };

  // Handler for toggling deletion of an item
  const handleItemDeleteToggle = (itemId: string) => {
    setScenarios((prev) =>
      prev.map((s, idx) => {
        if (idx !== activeScenarioIdx) return s;

        const existingOverrides = Array.isArray(s.item_overrides)
          ? [...s.item_overrides]
          : Object.values(s.item_overrides || {});

        const itemIdx = existingOverrides.findIndex((o) => o.id === itemId);
        if (itemIdx >= 0) {
          const wasDeleted = existingOverrides[itemIdx].is_deleted;
          existingOverrides[itemIdx] = {
            ...existingOverrides[itemIdx],
            is_deleted: !wasDeleted,
          };
        } else {
          existingOverrides.push({
            id: itemId,
            is_deleted: true,
          });
        }

        return { ...s, item_overrides: existingOverrides };
      })
    );
  };

  // Handler for adding candidate new item
  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newItemAmount);
    if (!newItemName.trim() || isNaN(amount) || amount < 0) return;

    const newItem: ScenarioNewItem = {
      tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      category: newItemCategory,
      item_name: newItemName.trim(),
      estimated_amount: amount,
      actual_amount: 0,
    };

    setScenarios((prev) =>
      prev.map((s, idx) =>
        idx === activeScenarioIdx
          ? { ...s, new_items: [...(s.new_items || []), newItem] }
          : s
      )
    );

    setNewItemName("");
    setNewItemAmount("");
    setIsAddingNewItem(false);
  };

  // Handler for removing a candidate new item
  const handleRemoveNewItem = (tempId: string) => {
    setScenarios((prev) =>
      prev.map((s, idx) =>
        idx === activeScenarioIdx
          ? {
              ...s,
              new_items: (s.new_items || []).filter((i) => i.tempId !== tempId),
            }
          : s
      )
    );
  };

  // Reset active scenario to baseline
  const handleResetScenario = () => {
    setScenarios((prev) =>
      prev.map((s, idx) =>
        idx === activeScenarioIdx
          ? resetScenario(s.id, s.name)
          : s
      )
    );
    setApplyError(null);
    setApplySuccess(null);
  };

  // Handle explicit persistence application
  const handleApplyScenario = async () => {
    if (isApplying) return;
    setIsApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      const overridesList = Array.isArray(currentScenario.item_overrides)
        ? currentScenario.item_overrides
        : Object.values(currentScenario.item_overrides || {});

      const payload = {
        eventId,
        scenarioName: currentScenario.name,
        target_budget: currentScenario.target_budget ?? undefined,
        item_overrides: overridesList,
        new_items: currentScenario.new_items || [],
      };

      const result = await applyBudgetScenarioAction(payload);

      if (!result.success) {
        setApplyError(result.error);
        setIsApplying(false);
        return;
      }

      setApplySuccess(result.data.message);
      setIsReviewOpen(false);
      setIsApplying(false);

      if (onScenarioApplied) {
        onScenarioApplied();
      }
    } catch {
      setApplyError("An unexpected network error occurred while applying the scenario.");
      setIsApplying(false);
    }
  };

  // Compute itemized diff for confirmation modal
  const itemDiff = React.useMemo(() => {
    const modified: Array<{ name: string; oldVal: number; newVal: number; delta: number }> = [];
    const added: Array<{ name: string; category: string; amount: number }> = [];
    const deleted: Array<{ name: string; amount: number }> = [];

    const overridesList = Array.isArray(currentScenario.item_overrides)
      ? currentScenario.item_overrides
      : Object.values(currentScenario.item_overrides || {});

    const overrideMap = new Map(overridesList.map((o) => [o.id, o]));

    for (const bItem of baselineItems) {
      const o = overrideMap.get(bItem.id);
      if (!o) continue;

      if (o.is_deleted) {
        deleted.push({ name: bItem.item_name, amount: Number(bItem.estimated_amount) });
      } else if (
        o.estimated_amount !== undefined &&
        o.estimated_amount !== Number(bItem.estimated_amount)
      ) {
        const oldVal = Number(bItem.estimated_amount);
        const newVal = o.estimated_amount;
        modified.push({ name: bItem.item_name, oldVal, newVal, delta: newVal - oldVal });
      }
    }

    if (currentScenario.new_items) {
      for (const n of currentScenario.new_items) {
        added.push({ name: n.item_name, category: n.category, amount: n.estimated_amount });
      }
    }

    const hasTargetBudgetChange =
      currentScenario.target_budget !== undefined &&
      currentScenario.target_budget !== null &&
      currentScenario.target_budget !== baselineTargetBudget;

    return {
      modified,
      added,
      deleted,
      hasTargetBudgetChange,
      oldTargetBudget: baselineTargetBudget,
      newTargetBudget: currentScenario.target_budget ?? baselineTargetBudget,
      totalChangesCount:
        modified.length + added.length + deleted.length + (hasTargetBudgetChange ? 1 : 0),
    };
  }, [currentScenario, baselineItems, baselineTargetBudget]);

  return (
    <div
      aria-label="What-If Budget Simulator"
      className="rounded-2xl border border-indigo-200/80 bg-indigo-50/20 p-5 sm:p-6 shadow-xs space-y-6 dark:border-indigo-900/60 dark:bg-indigo-950/20"
    >
      {/* Top Banner / Simulator Mode Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-100 pb-4 dark:border-indigo-900/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Sliders className="size-3.5" />
            </span>
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              What-If Budget Simulator
            </h3>
            <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
              In-Memory Draft
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Experiment with hypothetical allocations and budget ceilings. Changes remain strictly in memory until explicitly applied.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsComparisonView(!isComparisonView)}
            className="gap-1.5 text-xs h-8"
          >
            <Columns className="size-3" />
            <span>{isComparisonView ? "Hide Matrix" : "Compare Scenarios"}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetScenario}
            className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 h-8"
          >
            <RotateCcw className="size-3" />
            <span>Reset Baseline</span>
          </Button>

          {onClose && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="text-xs h-8"
            >
              Close Simulator
            </Button>
          )}
        </div>
      </div>

      {/* Scenario Tabs (Scenario A, Scenario B) */}
      <div className="flex items-center gap-2 border-b border-indigo-100/60 pb-3 dark:border-indigo-900/40">
        {scenarios.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setActiveScenarioIdx(idx);
              setIsComparisonView(false);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeScenarioIdx === idx && !isComparisonView
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Multi-Scenario Comparison Matrix View (If Toggled) */}
      {isComparisonView && comparisonResults && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs dark:border-indigo-900 dark:bg-slate-900 space-y-4">
          <h4 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
            <Columns className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span>Multi-Scenario Comparison Matrix</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Scenario</th>
                  <th className="py-2 px-4 font-semibold">Target Budget</th>
                  <th className="py-2 px-4 font-semibold">Projected Spend</th>
                  <th className="py-2 px-4 font-semibold">Delta vs Baseline</th>
                  <th className="py-2 px-4 font-semibold">Projected Savings</th>
                  <th className="py-2 pl-4 font-semibold">Status</th>
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
      )}

      {/* KPI Cards: Projected Spend, Delta, Projected Savings, Remaining */}
      <div
        aria-live="polite"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Projected Total */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Projected Spend
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-slate-950 dark:text-white">
            {formatMoney(simulationResult.scenarioSummary.totalEstimated)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Baseline: {formatMoney(simulationResult.baselineSummary.totalEstimated)}
          </p>
        </div>

        {/* Delta vs Baseline */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Delta vs Baseline
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {simulationResult.deltaEstimatedTotal < 0 ? (
              <TrendingDown className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : simulationResult.deltaEstimatedTotal > 0 ? (
              <TrendingUp className="size-4 text-rose-600 dark:text-rose-400" />
            ) : null}
            <span
              className={`font-mono text-lg font-bold ${
                simulationResult.deltaEstimatedTotal < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : simulationResult.deltaEstimatedTotal > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {simulationResult.deltaEstimatedTotal > 0 ? "+" : ""}
              {formatMoney(simulationResult.deltaEstimatedTotal)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {simulationResult.deltaEstimatedTotal < 0
              ? "Cost reduction"
              : simulationResult.deltaEstimatedTotal > 0
              ? "Cost increase"
              : "No change"}
          </p>
        </div>

        {/* Projected Savings */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Projected Savings
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(simulationResult.projectedSavings)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Estimated spending saved
          </p>
        </div>

        {/* Projected Remaining / Overspend */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {simulationResult.projectedOverspending > 0
              ? "Projected Overspend"
              : "Remaining Cushion"}
          </p>
          <p
            className={`mt-1 font-mono text-lg font-bold ${
              simulationResult.projectedOverspending > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-950 dark:text-white"
            }`}
          >
            {simulationResult.projectedOverspending > 0
              ? `-${formatMoney(simulationResult.projectedOverspending)}`
              : formatMoney(simulationResult.scenarioSummary.unallocatedBudget)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Target Ceiling: {formatMoney(simulationResult.effectiveTargetBudget)}
          </p>
        </div>
      </div>

      {/* Target Budget Override Field */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <label
            htmlFor="target-budget-override"
            className="text-xs font-bold text-slate-900 dark:text-white block"
          >
            Hypothetical Target Budget Ceiling
          </label>
          <p className="text-[11px] text-slate-500">
            Override the target budget limit to test what happens if client funding increases or drops.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-40">
            <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
            <Input
              id="target-budget-override"
              type="number"
              step="0.01"
              min="0"
              placeholder={String(baselineTargetBudget)}
              value={currentScenario.target_budget ?? ""}
              onChange={(e) => handleTargetBudgetChange(e.target.value)}
              className="pl-7 h-8 text-xs font-mono"
            />
          </div>
          {currentScenario.target_budget !== null && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleTargetBudgetChange("")}
              className="text-xs h-8 text-slate-500"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Interactive Line-Item Overrides Workbench Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-950 dark:text-white">
              Hypothetical Line-Item Edits
            </h4>
            <p className="text-xs text-slate-500">
              Adjust estimated allocations directly or add/remove candidate items.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddingNewItem(true)}
            className="gap-1 bg-indigo-600 text-white hover:bg-indigo-700 text-xs h-8"
          >
            <Plus className="size-3" />
            <span>Add Candidate Item</span>
          </Button>
        </div>

        {/* Add Candidate Item Inline Form */}
        {isAddingNewItem && (
          <form
            onSubmit={handleAddNewItem}
            className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/30 space-y-3"
          >
            <div className="font-semibold text-xs text-indigo-950 dark:text-indigo-200">
              Add New Candidate Expense to Scenario
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Item Name</label>
                <Input
                  required
                  placeholder="e.g. Photo Booth Rental"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Category</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="Venue & Facilities">Venue &amp; Facilities</option>
                  <option value="Catering & Bar">Catering &amp; Bar</option>
                  <option value="Decor & Styling">Decor &amp; Styling</option>
                  <option value="Entertainment & AV">Entertainment &amp; AV</option>
                  <option value="Photography & Video">Photography &amp; Video</option>
                  <option value="Logistics & Rentals">Logistics &amp; Rentals</option>
                  <option value="Staffing & Security">Staffing &amp; Security</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Estimated Cost ($)</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsAddingNewItem(false)}
                className="text-xs h-7"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs h-7"
              >
                Save to Scenario
              </Button>
            </div>
          </form>
        )}

        {/* Table of items */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
              <tr>
                <th className="py-2 pr-4 font-semibold">Expense Item</th>
                <th className="py-2 px-4 font-semibold">Category</th>
                <th className="py-2 px-4 font-semibold">Baseline Cost</th>
                <th className="py-2 px-4 font-semibold">Hypothetical Estimate</th>
                <th className="py-2 px-4 font-semibold">Delta</th>
                <th className="py-2 pl-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {baselineItems.length === 0 && (!currentScenario.new_items || currentScenario.new_items.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No baseline budget items found. Add a candidate item to begin modeling.
                  </td>
                </tr>
              )}
              {/* Existing Items with overrides */}
              {baselineItems.map((bItem) => {
                const computed = simulationResult.computedItems.find((i) => i.id === bItem.id);
                const isDeleted = !computed;
                const baselineEst = Number(bItem.estimated_amount);
                const hypotheticalEst = computed ? computed.estimated_amount : 0;
                const delta = hypotheticalEst - baselineEst;

                return (
                  <tr
                    key={bItem.id}
                    className={`transition ${isDeleted ? "opacity-40 bg-slate-50 dark:bg-slate-900/40" : ""}`}
                  >
                    <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        {isDeleted && <span className="line-through">{bItem.item_name}</span>}
                        {!isDeleted && <span>{bItem.item_name}</span>}
                        {computed?.isModified && (
                          <Badge variant="outline" className="text-[10px] text-indigo-600 py-0">
                            Edited
                          </Badge>
                        )}
                        {isDeleted && (
                          <Badge variant="destructive" className="text-[10px] py-0">
                            Removed
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{bItem.category}</td>
                    <td className="py-2.5 px-4 font-mono">{formatMoney(baselineEst)}</td>
                    <td className="py-2.5 px-4">
                      {!isDeleted ? (
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            aria-label={`Adjust estimated amount for ${bItem.item_name}`}
                            value={hypotheticalEst}
                            onChange={(e) =>
                              handleItemEstimateChange(bItem.id, e.target.value)
                            }
                            className="pl-6 h-7 text-xs font-mono"
                          />
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400">$0.00</span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-4 font-mono font-semibold ${
                        delta < 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : delta > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-500"
                      }`}
                    >
                      {delta !== 0 ? `${delta > 0 ? "+" : ""}${formatMoney(delta)}` : "—"}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleItemDeleteToggle(bItem.id)}
                        className={`h-7 px-2 text-xs ${
                          isDeleted
                            ? "text-indigo-600 hover:text-indigo-700"
                            : "text-rose-600 hover:text-rose-700"
                        }`}
                      >
                        {isDeleted ? "Restore" : "Remove"}
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {/* Newly Proposed Items */}
              {currentScenario.new_items?.map((newItem) => (
                <tr key={newItem.tempId} className="bg-emerald-50/40 dark:bg-emerald-950/20">
                  <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{newItem.item_name}</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-700 py-0">
                      New
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">{newItem.category}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">$0.00</td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatMoney(newItem.estimated_amount)}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    +{formatMoney(newItem.estimated_amount)}
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveNewItem(newItem.tempId)}
                      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Apply Banner / Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-indigo-100 pt-4 dark:border-indigo-900/60">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white">
            {itemDiff.totalChangesCount} proposed change(s)
          </span>{" "}
          in this scenario. Nothing is persisted until you confirm.
        </div>

        <Button
          onClick={() => setIsReviewOpen(true)}
          disabled={itemDiff.totalChangesCount === 0}
          className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs"
        >
          Review &amp; Apply Changes to Live Budget
        </Button>
      </div>

      {/* Review & Confirmation Modal */}
      {isReviewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-apply-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3
                id="confirm-apply-title"
                className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2"
              >
                <FileSpreadsheet className="size-4 text-indigo-600 dark:text-indigo-400" />
                <span>Confirm Budget Scenario Application</span>
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsReviewOpen(false)}
                className="size-7 p-0"
              >
                <X className="size-4" />
              </Button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Applying this scenario will permanently update your saved budget items. All calculations are re-validated server-side.
            </p>

            {/* Itemized Diff Summary */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-950/40">
              {itemDiff.hasTargetBudgetChange && (
                <div className="flex items-center justify-between font-mono pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-sans font-semibold text-slate-700 dark:text-slate-300">
                    Target Budget Ceiling:
                  </span>
                  <span>
                    {formatMoney(itemDiff.oldTargetBudget)} &rarr; {formatMoney(itemDiff.newTargetBudget)}
                  </span>
                </div>
              )}

              {itemDiff.modified.map((m) => (
                <div key={m.name} className="flex items-center justify-between">
                  <span className="truncate pr-2 font-medium text-slate-700 dark:text-slate-300">
                    {m.name}
                  </span>
                  <span className="font-mono shrink-0">
                    {formatMoney(m.oldVal)} &rarr; {formatMoney(m.newVal)} ({m.delta > 0 ? "+" : ""}{formatMoney(m.delta)})
                  </span>
                </div>
              ))}

              {itemDiff.added.map((a) => (
                <div key={a.name} className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-medium">
                  <span className="truncate pr-2">+ {a.name} ({a.category})</span>
                  <span className="font-mono shrink-0">{formatMoney(a.amount)}</span>
                </div>
              ))}

              {itemDiff.deleted.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-rose-700 dark:text-rose-300 line-through">
                  <span className="truncate pr-2">- {d.name}</span>
                  <span className="font-mono shrink-0">{formatMoney(d.amount)}</span>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {applyError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200 flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600" />
                <p>{applyError}</p>
              </div>
            )}

            {/* Success Message */}
            {applySuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                <p>{applySuccess}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewOpen(false)}
                disabled={isApplying}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyScenario}
                disabled={isApplying}
                className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs"
              >
                {isApplying ? "Persisting Scenario..." : "Confirm & Persist to Saved Budget"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
