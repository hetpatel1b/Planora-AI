import * as React from "react";
import type { TaskRow } from "@/lib/validations/task";
import { formatEventDate, isTaskOverdue } from "@/lib/date-utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Edit2,
  Trash2,
} from "lucide-react";

export interface TimelineTaskCardProps {
  task: TaskRow;
  isPendingToggle: boolean;
  onToggleStatus: (task: TaskRow) => void;
  onEdit: (task: TaskRow) => void;
  onDelete: (task: TaskRow) => void;
}

export function TimelineTaskCard({
  task,
  isPendingToggle,
  onToggleStatus,
  onEdit,
  onDelete,
}: TimelineTaskCardProps) {
  const isCompleted = task.status === "completed";
  const overdue = isTaskOverdue(task.due_date, task.status);

  return (
    <div
      className={`group flex items-start gap-3.5 rounded-xl border p-4 transition-all ${
        isCompleted
          ? "border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-900/40"
          : overdue
          ? "border-rose-200/80 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/20"
          : "border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      {/* Toggle Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={isCompleted}
        onClick={() => onToggleStatus(task)}
        disabled={isPendingToggle}
        className="mt-0.5 shrink-0 rounded text-slate-500 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer"
        aria-label={
          isCompleted
            ? `Mark "${task.title}" as incomplete`
            : `Mark "${task.title}" as completed`
        }
      >
        {isCompleted ? (
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Circle className="size-5 hover:text-indigo-600 dark:hover:text-indigo-400" />
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold ${
              isCompleted
                ? "line-through text-slate-400 dark:text-slate-500"
                : "text-slate-950 dark:text-white"
            }`}
          >
            {task.title}
          </span>

          <PriorityBadge priority={task.priority} />

          <StatusBadge status={task.status} className="text-[10px]" />

          {task.is_vendor_checklist && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900"
            >
              Vendor Checklist
            </Badge>
          )}
        </div>

        {task.description && (
          <p
            className={`text-xs leading-relaxed ${
              isCompleted
                ? "text-slate-400 dark:text-slate-500"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {task.description}
          </p>
        )}

        {/* Timeline & Due Date Info */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
          {task.due_date ? (
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                overdue
                  ? "text-rose-600 dark:text-rose-400"
                  : isCompleted
                  ? "text-slate-500 dark:text-slate-400"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {overdue ? (
                <AlertCircle className="size-3.5 text-rose-500" aria-hidden="true" />
              ) : (
                <Calendar className="size-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              )}
              <span>Due {formatEventDate(task.due_date)}</span>
              {overdue && <span className="font-bold">(Overdue)</span>}
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 italic">No deadline set</span>
          )}

          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">•</span>
          <span className="text-slate-500 dark:text-slate-400">
            Added {formatEventDate(task.created_at)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex shrink-0 items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(task)}
          aria-label={`Edit task "${task.title}"`}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Edit2 className="size-3.5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onDelete(task)}
          aria-label={`Delete task "${task.title}"`}
          className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

