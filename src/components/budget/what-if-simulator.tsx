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
import { toCents, fromCents } from "@/lib/budget-math";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WhatIfReviewModal } from "@/components/budget/what-if-review-modal";
import { WhatIfCandidateForm } from "@/components/budget/what-if-candidate-form";
import { WhatIfKpiGrid } from "@/components/budget/what-if-kpi-grid";
import { WhatIfComparisonMatrix } from "@/components/budget/what-if-comparison-matrix";
import { WhatIfWorkbenchTable } from "@/components/budget/what-if-workbench-table";
import {
  Sliders,
  RotateCcw,
  Plus,
  Columns,
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
  const reviewTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  // New Candidate Item form visibility
  const [isAddingNewItem, setIsAddingNewItem] = React.useState(false);

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
          ? { ...s, target_budget: num === null || !Number.isFinite(num) ? null : num }
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
  const handleAddNewCandidateItem = (candidate: {
    name: string;
    category: string;
    amount: number;
  }) => {
    const newItem: ScenarioNewItem = {
      tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: candidate.category,
      item_name: candidate.name,
      estimated_amount: candidate.amount,
      actual_amount: 0,
    };

    setScenarios((prev) =>
      prev.map((s, idx) =>
        idx === activeScenarioIdx
          ? { ...s, new_items: [...(s.new_items || []), newItem] }
          : s
      )
    );
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
        const delta = fromCents(toCents(newVal) - toCents(oldVal));
        modified.push({ name: bItem.item_name, oldVal, newVal, delta });
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
            aria-pressed={isComparisonView}
            className="gap-1.5 text-xs h-8"
          >
            <Columns className="size-3" aria-hidden="true" />
            <span>{isComparisonView ? "Hide Matrix" : "Compare Scenarios"}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetScenario}
            className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 h-8"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
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
      <div className="flex items-center gap-2 border-b border-indigo-100/60 pb-3 dark:border-indigo-900/40 overflow-x-auto no-scrollbar" role="group" aria-label="Scenarios">
        {scenarios.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setActiveScenarioIdx(idx);
              setIsComparisonView(false);
            }}
            aria-pressed={activeScenarioIdx === idx && !isComparisonView}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
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
        <WhatIfComparisonMatrix comparisonResults={comparisonResults} />
      )}

      {/* KPI Cards: Projected Spend, Delta, Projected Savings, Remaining */}
      <WhatIfKpiGrid simulationResult={simulationResult} />

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
            <span className="absolute left-3 top-2 text-xs text-slate-400">₹</span>
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
        <WhatIfCandidateForm
          isOpen={isAddingNewItem}
          onClose={() => setIsAddingNewItem(false)}
          onAdd={handleAddNewCandidateItem}
        />

        {/* Table of items */}
        <WhatIfWorkbenchTable
          baselineItems={baselineItems}
          simulationResult={simulationResult}
          currentScenario={currentScenario}
          onItemEstimateChange={handleItemEstimateChange}
          onItemDeleteToggle={handleItemDeleteToggle}
          onRemoveNewItem={handleRemoveNewItem}
        />
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
          ref={reviewTriggerRef}
          onClick={() => setIsReviewOpen(true)}
          disabled={itemDiff.totalChangesCount === 0}
          className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs"
        >
          Review &amp; Apply Changes to Live Budget
        </Button>
      </div>

      {/* Review & Confirmation Modal */}
      <WhatIfReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleApplyScenario}
        isApplying={isApplying}
        applyError={applyError}
        applySuccess={applySuccess}
        itemDiff={itemDiff}
        triggerRef={reviewTriggerRef}
      />
    </div>
  );
}
