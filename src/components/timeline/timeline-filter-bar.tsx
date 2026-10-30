import * as React from "react";
import { Search, CalendarDays, ListTodo } from "lucide-react";
import { Input } from "@/components/ui/input";

export type FilterStatus = "ALL" | "pending" | "in_progress" | "completed" | "vendor";
export type ViewMode = "timeline" | "checklist";

export interface TimelineFilterBarProps {
  statusFilter: FilterStatus;
  onStatusFilterChange: (filter: FilterStatus) => void;
  metrics: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    vendorCount: number;
  };
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (val: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TimelineFilterBar({
  statusFilter,
  onStatusFilterChange,
  metrics,
  searchQuery,
  onSearchQueryChange,
  priorityFilter,
  onPriorityFilterChange,
  viewMode,
  onViewModeChange,
}: TimelineFilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Status Filter Tabs */}
      <div
        className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/80 bg-white p-1 dark:border-slate-800 dark:bg-slate-900"
        role="group"
        aria-label="Filter tasks by status"
      >
        <button
          type="button"
          onClick={() => onStatusFilterChange("ALL")}
          aria-pressed={statusFilter === "ALL"}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          All ({metrics.total})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("pending")}
          aria-pressed={statusFilter === "pending"}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
            statusFilter === "pending"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Pending ({metrics.pending})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("in_progress")}
          aria-pressed={statusFilter === "in_progress"}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
            statusFilter === "in_progress"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          In Progress ({metrics.inProgress})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("completed")}
          aria-pressed={statusFilter === "completed"}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
            statusFilter === "completed"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          Completed ({metrics.completed})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("vendor")}
          aria-pressed={statusFilter === "vendor"}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
            statusFilter === "vendor"
              ? "bg-purple-600 text-white shadow-2xs dark:bg-purple-600 dark:text-white"
              : "text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-white"
          }`}
        >
          Vendor ({metrics.vendorCount})
        </button>
      </div>

      {/* View Switcher, Priority & Search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Box */}
        <div className="relative min-w-[160px] sm:min-w-[200px]">
          <Search
            className="absolute left-2.5 top-2.5 size-3.5 text-slate-500 dark:text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            aria-label="Search checklist tasks"
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Priority Select */}
        <select
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          aria-label="Filter checklist tasks by priority"
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-xs outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="ALL">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* View Toggle */}
        <div
          className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            onClick={() => onViewModeChange("timeline")}
            aria-pressed={viewMode === "timeline"}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              viewMode === "timeline"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <span>Timeline</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("checklist")}
            aria-pressed={viewMode === "checklist"}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              viewMode === "checklist"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <ListTodo className="size-3.5" aria-hidden="true" />
            <span>Checklist</span>
          </button>
        </div>
      </div>
    </div>
  );
}

