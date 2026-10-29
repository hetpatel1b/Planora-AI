"use client";

import * as React from "react";
import type { TaskRow, TaskStatus } from "@/lib/validations/task";
import { toggleTaskStatusAction } from "@/lib/actions/tasks";
import {
  formatEventDate,
  getStatusBadgeVariant,
  formatStatusLabel,
  isTaskOverdue,
} from "@/lib/date-utils";
import { TaskDialog } from "@/components/timeline/task-dialog";
import { DeleteTaskDialog } from "@/components/timeline/delete-task-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  ListTodo,
  CalendarDays,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { triggerCsvDownload } from "@/lib/download-csv";

export interface TimelineChecklistManagerProps {
  eventId: string;
  eventDate?: string | null;
  initialTasks: TaskRow[];
  initialError?: string | null;
}

type ViewMode = "timeline" | "checklist";
type FilterStatus = "ALL" | "pending" | "in_progress" | "completed" | "vendor";



/**
 * Categorizes a task into a timeline bucket.
 * Supports passing a precalculated todayStartMs to avoid redundant Date instantiations in batch loops.
 */
function getTimelineBucket(
  dueDateStr: string | null,
  status: TaskStatus,
  todayStartMs?: number
): "overdue" | "today" | "this_week" | "upcoming" | "unscheduled" {
  if (!dueDateStr) return "unscheduled";
  if (status === "completed" || status === "cancelled") return "upcoming";

  const dueDate = new Date(dueDateStr);
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();

  const today =
    todayStartMs ??
    (() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    })();

  const diffDays = Math.round((dueDay - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 7) return "this_week";
  return "upcoming";
}

export function TimelineChecklistManager({
  eventId,
  initialTasks,
  initialError,
}: TimelineChecklistManagerProps) {
  const [tasks, setTasks] = React.useState<TaskRow[]>(initialTasks);
  const [viewMode, setViewMode] = React.useState<ViewMode>("timeline");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");

  // Modal dialog states
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskRow | null>(null);
  const [deletingTask, setDeletingTask] = React.useState<TaskRow | null>(null);

  // Quick toggle pending tracking
  const [pendingToggles, setPendingToggles] = React.useState<Set<string>>(new Set());

  // Contextual CSV export states
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const handleExportCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);

    const fallback = `planora-${eventId}-tasks.csv`;
    const result = await triggerCsvDownload(
      `/api/events/${eventId}/export/tasks`,
      fallback
    );

    setIsExporting(false);
    if (!result.success) {
      setExportError(result.error || "Failed to download tasks CSV.");
    }
  };

  // Adjust state during render when server revalidation delivers new authoritative tasks.
  // Aligns with official React documentation for "adjusting state when a prop changes":
  // React immediately restarts the render with fresh state before DOM paint, avoiding
  // the cascading renders and post-paint flicker flagged by eslint-plugin-react-hooks.
  const [prevInitialTasks, setPrevInitialTasks] = React.useState(initialTasks);
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  // Summary Metrics
  const metrics = React.useMemo(() => {
    const total = tasks.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;
    let vendorCount = 0;
    let completedVendorCount = 0;

    for (const t of tasks) {
      if (t.status === "completed") {
        completed++;
        if (t.is_vendor_checklist) completedVendorCount++;
      } else if (t.status === "in_progress") inProgress++;
      else if (t.status === "pending") pending++;

      if (t.is_vendor_checklist) vendorCount++;
      if (isTaskOverdue(t.due_date, t.status)) overdue++;
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const vendorCompletionRate =
      vendorCount > 0 ? Math.round((completedVendorCount / vendorCount) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      vendorCount,
      completedVendorCount,
      completionRate,
      vendorCompletionRate,
    };
  }, [tasks]);

  // Filtered task collection
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      // Status / Vendor tab filter
      if (statusFilter === "vendor" && !t.is_vendor_checklist) return false;
      if (statusFilter === "completed" && t.status !== "completed") return false;
      if (statusFilter === "in_progress" && t.status !== "in_progress") return false;
      if (statusFilter === "pending" && t.status !== "pending") return false;

      // Priority filter
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Grouped tasks for Timeline view
  const timelineGroups = React.useMemo(() => {
    const overdue: TaskRow[] = [];
    const today: TaskRow[] = [];
    const thisWeek: TaskRow[] = [];
    const upcoming: TaskRow[] = [];
    const unscheduled: TaskRow[] = [];

    const now = new Date();
    const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    for (const t of filteredTasks) {
      const bucket = getTimelineBucket(t.due_date, t.status, todayStartMs);
      if (bucket === "overdue") overdue.push(t);
      else if (bucket === "today") today.push(t);
      else if (bucket === "this_week") thisWeek.push(t);
      else if (bucket === "upcoming") upcoming.push(t);
      else unscheduled.push(t);
    }

    return {
      overdue,
      today,
      thisWeek,
      upcoming,
      unscheduled,
    };
  }, [filteredTasks]);


  // Quick completion toggle handler
  const handleToggleStatus = async (task: TaskRow) => {
    const targetStatus: TaskStatus =
      task.status === "completed" ? "pending" : "completed";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: targetStatus } : t))
    );
    setPendingToggles((prev) => new Set(prev).add(task.id));

    try {
      const result = await toggleTaskStatusAction(task.id, eventId, targetStatus);
      if (!result.success) {
        // Rollback on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
        );
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? result.data : t))
        );
      }
    } catch {
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    } finally {
      setPendingToggles((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleTaskSaved = (savedTask: TaskRow) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTask.id ? savedTask : t));
      }
      return [savedTask, ...prev];
    });
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Helper for rendering a single task card
  const renderTaskCard = (task: TaskRow) => {
    const isCompleted = task.status === "completed";
    const isPendingToggle = pendingToggles.has(task.id);
    const overdue = isTaskOverdue(task.due_date, task.status);

    return (
      <div
        key={task.id}
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
          onClick={() => handleToggleStatus(task)}
          disabled={isPendingToggle}
          className="mt-0.5 shrink-0 rounded text-slate-500 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-indigo-400"
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

            <Badge variant={getStatusBadgeVariant(task.status)} className="text-[10px]">
              {formatStatusLabel(task.status)}
            </Badge>

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
            onClick={() => setEditingTask(task)}
            aria-label={`Edit task "${task.title}"`}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Edit2 className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setDeletingTask(task)}
            aria-label={`Delete task "${task.title}"`}
            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card with KPI Progress */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ListTodo className="size-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                Dynamic Timeline &amp; Checklist
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                F04 Planning
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track operational milestones, vendor deadlines, and event deliverables.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              id="contextual-export-tasks-csv-button"
              disabled={isExporting}
              onClick={handleExportCsv}
              className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              title="Download checklist tasks as CSV"
            >
              {isExporting ? (
                <Loader2 className="size-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>Export CSV</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-xs"
            >
              <Plus className="size-4" />
              <span>Add Task</span>
            </Button>
          </div>
        </div>

        {/* Error Alert if Export Error */}
        {exportError && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
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

        {/* Error Alert if Initial Error */}
        {initialError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="size-4 shrink-0" />
            <span>{initialError}</span>
          </div>
        )}

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
      </div>

      {/* 2. Controls, Search & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/80 bg-white p-1 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Filter tasks by status">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            aria-pressed={statusFilter === "ALL"}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            All ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            aria-pressed={statusFilter === "pending"}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "pending"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Pending ({metrics.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_progress")}
            aria-pressed={statusFilter === "in_progress"}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "in_progress"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            In Progress ({metrics.inProgress})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("completed")}
            aria-pressed={statusFilter === "completed"}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "completed"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Completed ({metrics.completed})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("vendor")}
            aria-pressed={statusFilter === "vendor"}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === "vendor"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Vendor ({metrics.vendorCount})
          </button>
        </div>

        {/* View Switcher, Priority & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[160px] sm:min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search checklist tasks"
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
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
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="View mode">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
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
              onClick={() => setViewMode("checklist")}
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

      {/* 3. Task Display Body */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <ListTodo className="size-6" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
            {tasks.length === 0
              ? "No checklist tasks yet"
              : statusFilter === "vendor"
              ? "No vendor checklist items found"
              : "No matching tasks found"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {tasks.length === 0
              ? "Generate an AI event blueprint above or click 'Add Task' to create your first milestone deliverable."
              : statusFilter === "vendor"
              ? "Vendor checklist items help track catering, venue contracts, decor, photography, and entertainment suppliers. Click 'Add Task' to log a vendor requirement."
              : "Try adjusting your search query, status tab, or priority filter to view more tasks."}
          </p>
          {(tasks.length === 0 || statusFilter === "vendor") && (
            <div className="mt-5">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                <Plus className="size-3.5" />
                <span>{statusFilter === "vendor" ? "Add Vendor Task" : "Add First Task"}</span>
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === "checklist" ? (
        /* Flat Checklist View */
        <div className="space-y-3">
          {filteredTasks.map(renderTaskCard)}
        </div>
      ) : (
        /* Chronological Timeline View */
        <div className="space-y-6">
          {/* Overdue Section */}
          {timelineGroups.overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-rose-100 pb-2 dark:border-rose-950">
                <AlertCircle className="size-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Past Due / Overdue ({timelineGroups.overdue.length})
                </h3>
              </div>
              <div className="space-y-3">
                {timelineGroups.overdue.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Due Today Section */}
          {timelineGroups.today.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-amber-100 pb-2 dark:border-amber-950">
                <Clock className="size-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Due Today ({timelineGroups.today.length})
                </h3>
              </div>
              <div className="space-y-3">
                {timelineGroups.today.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* This Week Section */}
          {timelineGroups.thisWeek.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-2 dark:border-indigo-950">
                <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  This Week ({timelineGroups.thisWeek.length})
                </h3>
              </div>
              <div className="space-y-3">
                {timelineGroups.thisWeek.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {timelineGroups.upcoming.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                <CalendarDays className="size-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Upcoming Timeline ({timelineGroups.upcoming.length})
                </h3>
              </div>
              <div className="space-y-3">
                {timelineGroups.upcoming.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Unscheduled Section */}
          {timelineGroups.unscheduled.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                <ListTodo className="size-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unscheduled / Open Tasks ({timelineGroups.unscheduled.length})
                </h3>
              </div>
              <div className="space-y-3">
                {timelineGroups.unscheduled.map(renderTaskCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Dialogs */}
      <TaskDialog
        eventId={eventId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleTaskSaved}
        initialIsVendor={statusFilter === "vendor"}
      />

      <TaskDialog
        eventId={eventId}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSuccess={handleTaskSaved}
        task={editingTask}
      />

      <DeleteTaskDialog
        eventId={eventId}
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onDeleted={handleTaskDeleted}
        task={deletingTask}
      />
    </div>
  );
}
