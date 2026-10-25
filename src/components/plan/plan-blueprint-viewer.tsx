"use client";

import * as React from "react";
import type {
  AIPlanBlueprint,
  PlanRevisionRow,
  PlanMilestone,
  PlanSuggestedTask,
  PlanProposedBudgetItem,
} from "@/lib/validations/plan";
import { acceptPlanBlueprintAction } from "@/lib/actions/plan";
import { toCents, fromCents } from "@/lib/budget-math";
import { formatEventDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  ListTodo,
  Layers,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Tag,
  Info,
  CheckSquare,
  Square,
} from "lucide-react";

export interface PlanBlueprintViewerProps {
  eventId: string;
  blueprint: AIPlanBlueprint;
  onAccepted?: (revision: PlanRevisionRow) => void;
  onDiscard?: () => void;
  className?: string;
}

/**
 * Format currency with strict two decimal places for budget review.
 */
function formatMoney(amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Priority badge helper mapping task priority to design tokens.
 */
function PriorityBadge({ priority }: { priority: string }) {
  switch (priority.toLowerCase()) {
    case "urgent":
      return <Badge variant="destructive">Urgent</Badge>;
    case "high":
      return <Badge variant="warning">High</Badge>;
    case "medium":
      return <Badge variant="default">Medium</Badge>;
    case "low":
    default:
      return <Badge variant="secondary">Low</Badge>;
  }
}

export function PlanBlueprintViewer({
  eventId,
  blueprint,
  onAccepted,
  onDiscard,
  className = "",
}: PlanBlueprintViewerProps) {
  // Task selection state (initialized to all suggested tasks selected)
  const [selectedTaskIndexes, setSelectedTaskIndexes] = React.useState<Set<number>>(
    () => new Set(blueprint.suggestedTasks.map((_, i) => i))
  );

  // Budget item selection state (initialized to all proposed items selected)
  const [selectedBudgetItemIndexes, setSelectedBudgetItemIndexes] = React.useState<Set<number>>(
    () => new Set(blueprint.proposedBudgetItems.map((_, i) => i))
  );

  // Confirmation modal and submission states
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [acceptanceResult, setAcceptanceResult] = React.useState<{
    success: boolean;
    message: string;
    revisionNumber?: number;
    isPartial?: boolean;
  } | null>(null);

  // Toggle all tasks
  const handleToggleAllTasks = () => {
    if (selectedTaskIndexes.size === blueprint.suggestedTasks.length) {
      setSelectedTaskIndexes(new Set());
    } else {
      setSelectedTaskIndexes(new Set(blueprint.suggestedTasks.map((_, i) => i)));
    }
  };

  // Toggle single task
  const handleToggleTask = (index: number) => {
    setSelectedTaskIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Toggle all budget items
  const handleToggleAllBudgetItems = () => {
    if (selectedBudgetItemIndexes.size === blueprint.proposedBudgetItems.length) {
      setSelectedBudgetItemIndexes(new Set());
    } else {
      setSelectedBudgetItemIndexes(new Set(blueprint.proposedBudgetItems.map((_, i) => i)));
    }
  };

  // Toggle single budget item
  const handleToggleBudgetItem = (index: number) => {
    setSelectedBudgetItemIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Safe integer-cent total calculation for selected budget items
  const selectedBudgetTotal = React.useMemo(() => {
    let cents = 0;
    for (const idx of selectedBudgetItemIndexes) {
      const item = blueprint.proposedBudgetItems[idx];
      if (item) {
        cents += toCents(item.estimated_amount);
      }
    }
    return fromCents(cents);
  }, [blueprint.proposedBudgetItems, selectedBudgetItemIndexes]);

  // Acceptance submission handler
  const handleAcceptConfirm = async () => {
    setIsAccepting(true);
    setAcceptanceResult(null);

    try {
      const sortedTaskIndexes = Array.from(selectedTaskIndexes).sort((a, b) => a - b);
      const sortedBudgetIndexes = Array.from(selectedBudgetItemIndexes).sort((a, b) => a - b);

      const result = await acceptPlanBlueprintAction({
        eventId,
        blueprint,
        selectedTaskIndexes: sortedTaskIndexes,
        selectedBudgetItemIndexes: sortedBudgetIndexes,
      });

      if (!result.success) {
        const isPartial = result.error.includes("was saved, but");
        setAcceptanceResult({
          success: false,
          isPartial,
          message: result.error,
        });
        setIsConfirmOpen(false);
        setIsAccepting(false);
        return;
      }

      const revision = result.data;
      setAcceptanceResult({
        success: true,
        revisionNumber: revision.revision_number,
        message: `Plan Revision #${revision.revision_number} successfully saved! Imported ${sortedTaskIndexes.length} tasks and ${sortedBudgetIndexes.length} budget items to your workspace.`,
      });
      setIsConfirmOpen(false);
      setIsAccepting(false);
      onAccepted?.(revision);
    } catch {
      setAcceptanceResult({
        success: false,
        isPartial: false,
        message: "An unexpected network or server error occurred while accepting the plan.",
      });
      setIsConfirmOpen(false);
      setIsAccepting(false);
    }
  };

  const isAccepted = acceptanceResult?.success === true;
  const taskCount = blueprint.suggestedTasks.length;
  const selectedTaskCount = selectedTaskIndexes.size;
  const budgetCount = blueprint.proposedBudgetItems.length;
  const selectedBudgetCount = selectedBudgetItemIndexes.size;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 1. Header & Status Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/60 p-6 shadow-xs dark:border-indigo-950/70 dark:bg-gradient-to-r dark:from-indigo-950/40 dark:via-slate-900 dark:to-sky-950/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs">
                <Sparkles className="size-3.5" />
                Proposed Event Blueprint
              </span>

              {blueprint.metadata.source === "deterministic" ? (
                <Badge variant="secondary" className="gap-1 border-slate-300 dark:border-slate-700">
                  <ShieldCheck className="size-3 text-slate-600 dark:text-slate-400" />
                  Deterministic Engine ({blueprint.metadata.model || "planora-rules-v1"})
                </Badge>
              ) : (
                <Badge variant="default" className="gap-1">
                  <Sparkles className="size-3" />
                  AI Synthesized ({blueprint.metadata.model || "Planora AI"})
                </Badge>
              )}

              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Generated {formatEventDate(blueprint.metadata.generatedAt)}
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Event Planning Blueprint &amp; Strategy
            </h2>

            <p className="max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              This is a proposed planning draft prepared for your review. It has <strong>not</strong> been saved to your event history yet. Review milestones, select which tasks and budget items you wish to import, and accept the plan below.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onDiscard && !isAccepted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDiscard}
                disabled={isAccepting}
              >
                Discard Preview
              </Button>
            )}

            {!isAccepted && (
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isAccepting}
              >
                <Check className="size-4" />
                <span>Review &amp; Accept Plan</span>
              </Button>
            )}
          </div>
        </div>

        {/* Informational Callout */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-indigo-200/60 bg-white/70 p-3 text-xs text-indigo-950 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200">
          <Info className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>
            <strong>Selective Workspace Import:</strong> Accepting this blueprint persists a versioned plan revision. Only the tasks and budget lines you select will be added to your event workspace. Existing tasks and budget records will not be overwritten or removed.
          </span>
        </div>
      </div>

      {/* Acceptance Notification Alerts */}
      {acceptanceResult && (
        <div
          role="alert"
          className={`rounded-xl border p-4 text-xs leading-relaxed shadow-xs ${
            acceptanceResult.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200"
              : acceptanceResult.isPartial
              ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {acceptanceResult.success ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : acceptanceResult.isPartial ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">
                {acceptanceResult.success
                  ? `Revision #${acceptanceResult.revisionNumber} Accepted & Applied`
                  : acceptanceResult.isPartial
                  ? "Partial Import Notice"
                  : "Acceptance Failed"}
              </p>
              <p>{acceptanceResult.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Executive Summary & Themes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Executive Summary */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Layers className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              Executive Concept &amp; Strategy
            </h3>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap dark:text-slate-300">
            {blueprint.summary}
          </p>
        </div>

        {/* Themes & Concepts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Tag className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              Event Themes &amp; Motifs
            </h3>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {blueprint.themes.map((theme, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-indigo-100/80 bg-indigo-50/40 p-3 text-xs dark:border-indigo-950/60 dark:bg-indigo-950/30"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {theme}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Schedule Milestones */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              Planning Timeline &amp; Key Milestones
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {blueprint.scheduleMilestones.length} Milestones
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {blueprint.scheduleMilestones.map((milestone: PlanMilestone, idx) => (
            <div
              key={idx}
              className="relative flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-slate-200 dark:border-slate-800/60 dark:bg-slate-950/40 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {idx + 1}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-950 dark:text-white">
                    {milestone.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {milestone.description}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 pt-2 sm:pt-0">
                <Badge variant="outline" className="text-[11px]">
                  <Clock className="mr-1 size-3 text-slate-400" />
                  {milestone.timeframe}
                </Badge>
                {milestone.suggested_date ? (
                  <Badge variant="secondary" className="text-[11px]">
                    <Calendar className="mr-1 size-3 text-slate-400" />
                    {formatEventDate(milestone.suggested_date)}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Relative date
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Suggested Tasks (Selective Import) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ListTodo className="size-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Suggested Action Checklist
              </h3>
              <Badge variant="secondary" className="ml-1 text-[11px]">
                {selectedTaskCount} of {taskCount} selected
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select the checklist items you want imported into your workspace tasks.
            </p>
          </div>

          {!isAccepted && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleToggleAllTasks}
                className="gap-1 text-xs"
              >
                {selectedTaskCount === taskCount ? (
                  <>
                    <Square className="size-3" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="size-3" />
                    <span>Select All ({taskCount})</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {blueprint.suggestedTasks.map((task: PlanSuggestedTask, idx) => {
            const isSelected = selectedTaskIndexes.has(idx);
            return (
              <div
                key={idx}
                onClick={() => !isAccepted && handleToggleTask(idx)}
                className={`flex items-start gap-3 py-3 px-2 rounded-lg transition ${
                  !isAccepted ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40" : ""
                } ${isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""}`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    id={`task-select-${idx}`}
                    checked={isSelected}
                    onChange={() => handleToggleTask(idx)}
                    disabled={isAccepted}
                    aria-label={`Select task: ${task.title}`}
                    className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={`task-select-${idx}`}
                      className={`text-xs font-semibold cursor-pointer ${
                        isSelected
                          ? "text-slate-950 dark:text-white"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {task.title}
                    </label>

                    <PriorityBadge priority={task.priority} />

                    <Badge variant="outline" className="text-[10px] text-slate-500">
                      {task.category}
                    </Badge>

                    {task.is_vendor_checklist && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900"
                      >
                        Vendor Checklist
                      </Badge>
                    )}

                    {task.suggested_days_before !== null &&
                      task.suggested_days_before !== undefined && (
                        <span className="text-[10px] text-slate-400">
                          {task.suggested_days_before === 0
                            ? "Event day"
                            : `${task.suggested_days_before} days prior`}
                        </span>
                      )}
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Proposed Budget Allocations (Selective Import) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Proposed Budget Allocations
              </h3>
              <Badge variant="secondary" className="ml-1 text-[11px]">
                {selectedBudgetCount} of {budgetCount} selected
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selected estimated total:{" "}
              <strong className="text-slate-900 dark:text-white">
                {formatMoney(selectedBudgetTotal)}
              </strong>
            </p>
          </div>

          {!isAccepted && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleToggleAllBudgetItems}
                className="gap-1 text-xs"
              >
                {selectedBudgetCount === budgetCount ? (
                  <>
                    <Square className="size-3" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="size-3" />
                    <span>Select All ({budgetCount})</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {blueprint.proposedBudgetItems.map((item: PlanProposedBudgetItem, idx) => {
            const isSelected = selectedBudgetItemIndexes.has(idx);
            return (
              <div
                key={idx}
                onClick={() => !isAccepted && handleToggleBudgetItem(idx)}
                className={`flex items-start gap-3 py-3 px-2 rounded-lg transition ${
                  !isAccepted ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40" : ""
                } ${isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""}`}
              >
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    id={`budget-select-${idx}`}
                    checked={isSelected}
                    onChange={() => handleToggleBudgetItem(idx)}
                    disabled={isAccepted}
                    aria-label={`Select budget line: ${item.item_name}`}
                    className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div className="min-w-0 flex-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`budget-select-${idx}`}
                        className={`text-xs font-semibold cursor-pointer ${
                          isSelected
                            ? "text-slate-950 dark:text-white"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {item.item_name}
                      </label>
                      <Badge variant="outline" className="text-[10px]">
                        {item.category}
                      </Badge>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatMoney(Number(item.estimated_amount))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Strategic Recommendations */}
      {blueprint.keyRecommendations && blueprint.keyRecommendations.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Lightbulb className="size-4 text-amber-500 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              Strategic Recommendations
            </h3>
          </div>

          <ul className="mt-4 space-y-2.5">
            {blueprint.keyRecommendations.map((rec, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300"
              >
                <span className="mt-1 flex size-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. Bottom Acceptance Summary Bar */}
      {!isAccepted && (
        <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-950 dark:text-white">
                Ready to apply this blueprint?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Will save a versioned plan revision and import {selectedTaskCount} tasks and {selectedBudgetCount} budget items ({formatMoney(selectedBudgetTotal)}).
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onDiscard && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onDiscard}
                  disabled={isAccepting}
                >
                  Discard
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isAccepting}
              >
                <Check className="size-4" />
                <span>Accept &amp; Apply Plan</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Acceptance Confirmation Modal Dialog */}
      {isConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-plan-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h3 id="confirm-plan-title" className="text-sm font-bold text-slate-950 dark:text-white">
                    Confirm Plan Acceptance
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Versioned event workspace update
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isAccepting && setIsConfirmOpen(false)}
                disabled={isAccepting}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                Saving this blueprint will create a permanent, versioned plan revision in your event history.
              </p>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5 dark:border-slate-800/80 dark:bg-slate-950/50">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tasks to import:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedTaskCount} of {taskCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Budget items to import:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedBudgetCount} of {budgetCount}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-1.5 dark:border-slate-800">
                  <span className="text-slate-500">Selected budget total:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatMoney(selectedBudgetTotal)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Note: Existing workspace tasks and budget records will remain safe and will not be overwritten.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isAccepting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                onClick={handleAcceptConfirm}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving Plan Revision...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Confirm &amp; Apply Plan</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
