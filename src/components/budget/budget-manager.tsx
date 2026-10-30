"use client";

import * as React from "react";
import type { BudgetItemRow } from "@/lib/validations/budget";
import {
  calculateBudgetSummary,
  calculateCategoryBreakdown,
  getItemVariance,
  isItemOverspent,
} from "@/lib/budget-math";
import { BudgetItemDialog } from "@/components/budget/budget-item-dialog";
import { DeleteBudgetItemDialog } from "@/components/budget/delete-budget-item-dialog";
import { formatMoney } from "@/lib/currency-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Search,
  Edit2,
  Trash2,
  PieChart,
  Info,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Sliders,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { triggerCsvDownload } from "@/lib/download-csv";
import { WhatIfSimulator } from "@/components/budget/what-if-simulator";

interface BudgetManagerProps {
  eventId: string;
  targetBudget: number;
  initialItems: BudgetItemRow[];
  initialError?: string | null;
}

export function BudgetManager({
  eventId,
  targetBudget,
  initialItems,
  initialError,
}: BudgetManagerProps) {
  // Track items state paired with authoritative initialItems to eliminate render-phase setState calls
  const [itemsState, setItemsState] = React.useState<{
    initialItems: BudgetItemRow[];
    items: BudgetItemRow[];
  }>(() => ({
    initialItems,
    items: initialItems,
  }));

  // Resolve authoritative items: if server revalidation delivers new items, derive them without render restarts
  const items = itemsState.initialItems === initialItems
    ? itemsState.items
    : initialItems;

  const setItems = React.useCallback(
    (updater: BudgetItemRow[] | ((prev: BudgetItemRow[]) => BudgetItemRow[])) => {
      setItemsState((prevState) => {
        const currentItems = prevState.initialItems === initialItems
          ? prevState.items
          : initialItems;
        const nextItems = typeof updater === "function" ? updater(currentItems) : updater;
        return { initialItems, items: nextItems };
      });
    },
    [initialItems]
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");

  // Dialog states
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<BudgetItemRow | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<BudgetItemRow | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);

    const fallback = `planora-${eventId}-budget.csv`;
    const result = await triggerCsvDownload(
      `/api/events/${eventId}/export/budget`,
      fallback
    );

    setIsExporting(false);
    if (!result.success) {
      setExportError(result.error || "Failed to download budget CSV.");
    }
  };

  // Deterministic summary calculations
  const summary = React.useMemo(() => {
    return calculateBudgetSummary(targetBudget, items);
  }, [targetBudget, items]);

  // Deterministic category breakdown
  const categoryBreakdown = React.useMemo(() => {
    return calculateCategoryBreakdown(targetBudget, items);
  }, [items, targetBudget]);

  // Available categories for filtering
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.category));
    return Array.from(set).sort();
  }, [items]);

  // Filtered items based on search and category
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        item.item_name.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Handlers for mutations
  const handleItemCreated = (newItem: BudgetItemRow) => {
    setItems((prev) => [newItem, ...prev]);
  };

  const handleItemUpdated = (updatedItem: BudgetItemRow) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleItemDeleted = (deletedId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
  };


  return (
    <section aria-labelledby="budget-manager-title" className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <IndianRupee className="size-4" />
            </span>
            <h3
              id="budget-manager-title"
              className="text-xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Smart Budget Manager
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Track allocations, monitor actual expenses, and prevent cost overruns with deterministic financial math.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            id="contextual-export-budget-csv-button"
            disabled={isExporting}
            onClick={handleExportCsv}
            className="gap-1.5 text-xs font-semibold h-9 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            title="Download budget ledger as CSV"
          >
            {isExporting ? (
              <Loader2 className="size-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <FileSpreadsheet className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            variant={isSimulatorOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
            className={`gap-1.5 text-xs font-semibold h-9 ${
              isSimulatorOpen
                ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                : "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>{isSimulatorOpen ? "Close Simulator" : "What-If Simulator"}</span>
          </Button>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs text-xs font-semibold h-9"
          >
            <Plus className="size-3.5" />
            <span>Add Expense Item</span>
          </Button>
        </div>
      </div>

      {/* Error Alert if Export Error */}
      {exportError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* What-If Simulator Workbench (F06) */}
      {isSimulatorOpen && (
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={targetBudget}
          baselineItems={items}
          onClose={() => setIsSimulatorOpen(false)}
        />
      )}

      {/* Fetch Error Warning */}
      {initialError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to load budget records</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300">
              {initialError}. Please refresh the page to try again. Existing saved data has not been deleted.
            </p>
          </div>
        </div>
      )}

      {/* Zero Target Budget Guidance Banner */}
      {targetBudget === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="size-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold">No Target Budget Established</p>
            <p className="mt-0.5 text-amber-800 dark:text-amber-300">
              Target budget is currently set to ₹0.00. You can record line items and actual expenses below, but overall budget utilization and remaining balance will reflect a ₹0.00 baseline. You can set an overall budget anytime in event settings.
            </p>
          </div>
        </div>
      )}

      {/* Overspending Alerts Banner */}
      {(summary.isOverBudget || summary.isOverAllocated || summary.hasOverspentItems) && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
          <AlertTriangle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-rose-950 dark:text-rose-100">
              Budget Warning Detected
            </p>
            {summary.isOverBudget && (
              <p>
                • <strong>Overall budget exceeded:</strong> Actual spending exceeds target budget by{" "}
                <span className="font-semibold underline">
                  {formatMoney(Math.abs(summary.remainingBudget))}
                </span>
                .
              </p>
            )}
            {summary.isOverAllocated && (
              <p>
                • <strong>Estimated allocations exceed budget:</strong> Planned costs exceed target budget by{" "}
                <span className="font-semibold underline">
                  {formatMoney(Math.abs(summary.unallocatedBudget))}
                </span>
                .
              </p>
            )}
            {summary.hasOverspentItems && (
              <p>
                • <strong>Item cost overruns:</strong> {summary.overspentCount} line item(s) have actual expenses exceeding their estimated allocation.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Target Budget */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Target Budget
              </span>
              <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <IndianRupee className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(targetBudget)}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Utilization:</span>
              <span
                className={`font-semibold ${
                  summary.isOverBudget
                    ? "text-rose-600 dark:text-rose-400"
                    : summary.utilizationPercent >= 85
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {/* NEVER cap displayed percentage */}
                {summary.utilizationPercent.toFixed(1)}%
              </span>
            </div>
            {/* Visual Progress Bar (Width clamped 0-100%) */}
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              role="progressbar"
              aria-valuenow={Math.round(summary.visualProgressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Budget utilization: ${summary.utilizationPercent.toFixed(1)} percent`}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  summary.isOverBudget
                    ? "bg-rose-500"
                    : summary.utilizationPercent >= 85
                    ? "bg-amber-500"
                    : "bg-indigo-600 dark:bg-indigo-500"
                }`}
                style={{ width: `${summary.visualProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: Total Estimated */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Total Estimated
              </span>
              <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Receipt className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(summary.totalEstimated)}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            {targetBudget > 0 ? (
              summary.isOverAllocated ? (
                <div className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                  <TrendingUp className="size-3.5 shrink-0" />
                  <span>Over-allocated by {formatMoney(Math.abs(summary.unallocatedBudget))}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                  <span>{formatMoney(summary.unallocatedBudget)} unallocated cushion</span>
                </div>
              )
            ) : (
              <span className="text-slate-500">Unallocated cushion N/A</span>
            )}
          </div>
        </div>

        {/* KPI 3: Total Actual Expenses */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Total Actual Spent
              </span>
              <span className="rounded-lg bg-purple-50 p-1.5 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {formatMoney(summary.totalActual)}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              {items.length} line item{items.length === 1 ? "" : "s"} logged
            </span>
          </div>
        </div>

        {/* KPI 4: Remaining Balance */}
        <div
          className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition ${
            summary.remainingBudget < 0
              ? "border-rose-200 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20"
              : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Remaining Balance
              </span>
              <span
                className={`rounded-lg p-1.5 ${
                  summary.remainingBudget < 0
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                }`}
              >
                {summary.remainingBudget < 0 ? (
                  <TrendingDown className="size-4" />
                ) : (
                  <TrendingUp className="size-4" />
                )}
              </span>
            </div>
            <p
              className={`mt-2 text-2xl font-extrabold tracking-tight ${
                summary.remainingBudget < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatMoney(summary.remainingBudget)}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            {summary.remainingBudget < 0 ? (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                Over budget by {formatMoney(Math.abs(summary.remainingBudget))}
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300">
                Available to spend
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Section */}
      {categoryBreakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <PieChart className="size-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Category Breakdown &amp; Variances
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {categoryBreakdown.length} active categor{categoryBreakdown.length === 1 ? "y" : "ies"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryBreakdown.map((cat) => (
              <div
                key={cat.category}
                className={`rounded-xl border p-4 text-xs transition ${
                  cat.isOverspent
                    ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/20"
                    : "border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-950/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {cat.category}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {cat.itemCount} item{cat.itemCount === 1 ? "" : "s"}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Estimated:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200">
                      {formatMoney(cat.totalEstimated)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200">
                      {formatMoney(cat.totalActual)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span>Variance:</span>
                    <span
                      className={`font-semibold ${
                        cat.isOverspent
                          ? "text-rose-600 dark:text-rose-400"
                          : cat.variance < 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {cat.variance > 0
                        ? `+${formatMoney(cat.variance)} over`
                        : cat.variance < 0
                        ? `-${formatMoney(Math.abs(cat.variance))} under`
                        : "₹0.00 on target"}
                    </span>
                  </div>
                  {targetBudget > 0 && (
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>Share of Budget:</span>
                      <span>{cat.percentOfTargetBudget.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Line Items List/Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Table Controls (Search, Category Filter, Item Count) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              Expense Line Items
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredItems.length} of {items.length} item{items.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Search items or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search budget items"
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Category Filter Dropdown */}
            {availableCategories.length > 0 && (
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter budget items by category"
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="ALL">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(searchQuery !== "" || selectedCategory !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
                className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1"
                title="Reset filters"
              >
                <RotateCcw className="size-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {items.length === 0 ? (
          /* Empty Overall State */
          <div className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Receipt className="size-6" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              No budget items recorded yet
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Start building your event budget by adding expense items with estimated allocations and actual payments.
            </p>
            <div className="mt-5">
              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs text-xs"
              >
                <Plus className="size-3.5" />
                <span>Add First Expense</span>
              </Button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty Search/Filter State */
          <div className="py-10 text-center">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              No expenses match your search or filter
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Try adjusting your search query or reset the category filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
              }}
              className="mt-3 text-xs"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          /* Line Items Table */
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Budget Line Items">
              <caption className="sr-only">Budget Line Items</caption>
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="pb-3 pr-4">Expense Item</th>
                  <th scope="col" className="pb-3 px-4">Category</th>
                  <th scope="col" className="pb-3 px-4 text-right">Estimated</th>
                  <th scope="col" className="pb-3 px-4 text-right">Actual</th>
                  <th scope="col" className="pb-3 px-4 text-right">Variance</th>
                  <th scope="col" className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredItems.map((item) => {
                  const overspent = isItemOverspent(item);
                  const variance = getItemVariance(item);

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3.5 pr-4 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.item_name}
                        </div>
                        {item.notes && (
                          <div className="mt-0.5 max-w-md text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatMoney(item.estimated_amount)}
                      </td>
                      <td className="py-3.5 px-4 align-top text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatMoney(item.actual_amount)}
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        {overspent ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 font-semibold text-[11px] text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            <TrendingUp className="size-3" />
                            <span>+{formatMoney(variance)} over</span>
                          </span>
                        ) : variance < 0 ? (
                          <span className="inline-flex items-center gap-1 font-medium text-[11px] text-emerald-600 dark:text-emerald-400">
                            <span>-{formatMoney(Math.abs(variance))} under</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            On target
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pl-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            onClick={() => setEditingItem(item)}
                            title="Edit budget item"
                          >
                            <Edit2 className="size-3.5" />
                            <span className="sr-only">Edit {item.item_name}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                            onClick={() => setDeletingItem(item)}
                            title="Delete budget item"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Delete {item.item_name}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <BudgetItemDialog
        eventId={eventId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleItemCreated}
      />

      {/* Edit Item Modal */}
      {editingItem && (
        <BudgetItemDialog
          eventId={eventId}
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onSuccess={handleItemUpdated}
          item={editingItem}
        />
      )}

      {/* Delete Item Modal */}
      {deletingItem && (
        <DeleteBudgetItemDialog
          eventId={eventId}
          item={deletingItem}
          isOpen={Boolean(deletingItem)}
          onClose={() => setDeletingItem(null)}
          onDeleted={handleItemDeleted}
        />
      )}
    </section>
  );
}
