import * as React from "react";
import { AlertCircle } from "lucide-react";
import type { TaskSummary } from "@/lib/task-math";

export interface TimelineKpiGridProps {
  metrics: TaskSummary;
}

/**
 * Renders the top-level KPI metrics summary and progress indicator for the timeline and checklist.
 * Pure presentational component with no internal state or side effects.
 */
export function TimelineKpiGrid({ metrics }: TimelineKpiGridProps) {
  return (
    <>
      {/* KPI Metrics Grid */}
      <div className="mt-6 grid grid-cols-1 xs:grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {/* Total Tasks */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Deliverables
          </p>
          <p className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">
            {metrics.total}
          </p>
        </div>

        {/* Completed */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Completed
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.completed}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({metrics.completionRate}%)
            </span>
          </div>
        </div>

        {/* In Progress / Pending */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Remaining Pending
          </p>
          <p className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">
            {metrics.pending + metrics.inProgress}
          </p>
        </div>

        {/* Overdue */}
        <div
          className={`rounded-xl border p-3.5 ${
            metrics.overdue > 0
              ? "border-rose-200 bg-rose-50/60 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
              : "border-slate-100 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-950/40"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overdue
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`text-lg font-extrabold ${
                metrics.overdue > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-950 dark:text-white"
              }`}
            >
              {metrics.overdue}
            </span>
            {metrics.overdue > 0 && (
              <AlertCircle className="size-4 text-rose-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* Vendor Checklist */}
        <div className="col-span-1 xs:col-span-2 sm:col-span-1 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Vendor Items
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
              {metrics.vendorCount}
            </span>
            {metrics.vendorCount > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({metrics.completedVendorCount} done)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div className="mt-5 space-y-1.5">
        <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>Overall Timeline Progress</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {metrics.completionRate}%
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={Math.min(100, Math.max(0, metrics.completionRate))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall timeline progress: ${metrics.completionRate} percent`}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, metrics.completionRate))}%` }}
          />
        </div>
      </div>
    </>
  );
}

