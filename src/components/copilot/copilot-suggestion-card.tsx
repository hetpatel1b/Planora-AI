"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CopilotProposedTask, CopilotProposedBudgetItem } from "@/lib/validations/copilot";
import { createTaskAction } from "@/lib/actions/tasks";
import { createBudgetItemAction } from "@/lib/actions/budget";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency-utils";
import {
  ListTodo,
  DollarSign,
  Calendar,
  Check,
  Loader2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

/**
 * Calculates a concrete ISO due date string from an event date and days_before offset.
 */
function computeDueDate(
  eventDateStr: string | null | undefined,
  daysBefore: number | null | undefined
): string | null {
  if (!eventDateStr || daysBefore === null || daysBefore === undefined) return null;
  const eventTime = new Date(eventDateStr).getTime();
  if (isNaN(eventTime)) return null;
  const dueTime = eventTime - daysBefore * 24 * 60 * 60 * 1000;
  const dueDate = new Date(dueTime);
  const year = dueDate.getFullYear();
  if (year < 2000 || year > 2100) return null;
  return dueDate.toISOString();
}

interface SuggestedTaskCardProps {
  eventId: string;
  eventDate?: string | null;
  task: CopilotProposedTask;
  index: number;
}

export function SuggestedTaskCard({ eventId, eventDate, task, index }: SuggestedTaskCardProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"idle" | "pending" | "added" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const calculatedDueDate = task.due_date || computeDueDate(eventDate, task.suggested_days_before);

  const handleAdd = async () => {
    if (status === "pending" || status === "added") return;

    setStatus("pending");
    setErrorMessage(null);

    try {
      const result = await createTaskAction(eventId, {
        title: task.title,
        description: task.description ?? null,
        priority: task.priority,
        status: "pending",
        is_vendor_checklist: task.is_vendor_checklist,
        due_date: calculatedDueDate,
      });

      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      setStatus("added");
      try {
        router.refresh();
      } catch {
        // Safe for test environments
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to add task. Please try again.");
    }
  };

  return (
    <div
      key={`task-${index}`}
      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900/90"
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <ListTodo className="size-3" />
            </span>
            <h5 className="text-xs font-semibold text-slate-900 dark:text-white">
              {task.title}
            </h5>
          </div>
          <PriorityBadge priority={task.priority} />
        </div>

        {task.description && (
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          {calculatedDueDate ? (
            <span className="flex items-center gap-1">
              <Calendar className="size-3 text-slate-400" />
              <span>{`Due: ${calculatedDueDate.slice(0, 10)}`}</span>
            </span>
          ) : task.suggested_days_before !== null && task.suggested_days_before !== undefined ? (
            <span>{task.suggested_days_before} days prior</span>
          ) : null}

          {task.is_vendor_checklist && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              Vendor Checklist
            </Badge>
          )}
        </div>
      </div>

      {status === "error" && errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          <AlertCircle className="size-3 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="pt-1">
        <Button
          type="button"
          size="xs"
          variant={status === "added" ? "secondary" : "outline"}
          disabled={status === "pending" || status === "added"}
          onClick={handleAdd}
          className="w-full justify-center gap-1.5 text-[11px]"
        >
          {status === "pending" ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              <span>Adding to Checklist...</span>
            </>
          ) : status === "added" ? (
            <>
              <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300">Added to Checklist</span>
            </>
          ) : (
            <>
              <ListTodo className="size-3 text-indigo-600 dark:text-indigo-400" />
              <span>Add to Checklist</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface SuggestedBudgetItemCardProps {
  eventId: string;
  item: CopilotProposedBudgetItem;
  index: number;
}

export function SuggestedBudgetItemCard({ eventId, item, index }: SuggestedBudgetItemCardProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"idle" | "pending" | "added" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleAdd = async () => {
    if (status === "pending" || status === "added") return;

    setStatus("pending");
    setErrorMessage(null);

    try {
      const result = await createBudgetItemAction(eventId, {
        category: item.category,
        item_name: item.item_name,
        estimated_amount: item.estimated_amount,
        actual_amount: 0,
        notes: item.notes ?? null,
      });

      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      setStatus("added");
      try {
        router.refresh();
      } catch {
        // Safe for test environments
      }
    } catch {
      setStatus("error");
      setErrorMessage("Failed to add budget item. Please try again.");
    }
  };

  return (
    <div
      key={`budget-${index}`}
      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900/90"
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <DollarSign className="size-3" />
            </span>
            <h5 className="text-xs font-semibold text-slate-900 dark:text-white">
              {item.item_name}
            </h5>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(item.estimated_amount)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
            {item.category}
          </Badge>
        </div>

        {item.notes && (
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            {item.notes}
          </p>
        )}
      </div>

      {status === "error" && errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          <AlertCircle className="size-3 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="pt-1">
        <Button
          type="button"
          size="xs"
          variant={status === "added" ? "secondary" : "outline"}
          disabled={status === "pending" || status === "added"}
          onClick={handleAdd}
          className="w-full justify-center gap-1.5 text-[11px]"
        >
          {status === "pending" ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              <span>Adding to Budget...</span>
            </>
          ) : status === "added" ? (
            <>
              <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300">Added to Budget</span>
            </>
          ) : (
            <>
              <DollarSign className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span>Add to Budget</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function RecommendationsList({ recommendations }: { recommendations: string[] }) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-xs dark:border-amber-950/60 dark:bg-amber-950/20">
      <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300">
        <Lightbulb className="size-3.5 text-amber-600 dark:text-amber-400" />
        <span>Advisory Recommendations</span>
      </div>
      <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-950/80 dark:text-amber-200/80">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-amber-500 font-bold">•</span>
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
