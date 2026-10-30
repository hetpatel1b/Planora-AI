"use client";

import * as React from "react";
import type { TaskRow, TaskStatus } from "@/lib/validations/task";
import { toggleTaskStatusAction } from "@/lib/actions/tasks";
import { calculateTaskSummary } from "@/lib/task-math";
import { TimelineKpiGrid } from "@/components/timeline/timeline-kpi-grid";
import {
  TimelineFilterBar,
  type FilterStatus,
  type ViewMode,
} from "@/components/timeline/timeline-filter-bar";
import { TimelineTaskCard } from "@/components/timeline/timeline-task-card";
import { TaskDialog } from "@/components/timeline/task-dialog";
import { DeleteTaskDialog } from "@/components/timeline/delete-task-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
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
  activeFilter?: FilterStatus;
  onFilterChange?: (filter: FilterStatus) => void;
}



/**
 * Categorizes a task into a timeline bucket.
 * Supports passing a precalculated todayStartMs to avoid redundant Date instantiations in batch loops.
 */
function getTimelineBucket(
  dueDateStr: string | null,
  status: TaskStatus,
  todayStartMs?: number
): "overdue" | "today" | "this_week" | "upcoming" | "unscheduled" | "completed" {
  const isClosed = status === "completed" || status === "cancelled";
  if (!dueDateStr) return isClosed ? "completed" : "unscheduled";

  const dueDate = new Date(dueDateStr);
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();

  const today =
    todayStartMs ??
    (() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    })();

  const diffDays = Math.round((dueDay - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return isClosed ? "completed" : "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 7) return "this_week";
  return "upcoming";
}

export function TimelineChecklistManager({
  eventId,
  initialTasks,
  initialError,
  activeFilter,
  onFilterChange,
}: TimelineChecklistManagerProps) {
  // Track tasks state paired with authoritative initialTasks to eliminate render-phase setState calls
  const [tasksState, setTasksState] = React.useState<{
    initialTasks: TaskRow[];
    tasks: TaskRow[];
  }>(() => ({
    initialTasks,
    tasks: initialTasks,
  }));

  // Resolve authoritative tasks: if server revalidation delivers new tasks, derive them without render restarts
  const tasks = tasksState.initialTasks === initialTasks
    ? tasksState.tasks
    : initialTasks;

  const setTasks = React.useCallback(
    (updater: TaskRow[] | ((prev: TaskRow[]) => TaskRow[])) => {
      setTasksState((prevState) => {
        const currentTasks = prevState.initialTasks === initialTasks
          ? prevState.tasks
          : initialTasks;
        const nextTasks = typeof updater === "function" ? updater(currentTasks) : updater;
        return { initialTasks, tasks: nextTasks };
      });
    },
    [initialTasks]
  );

  const [viewMode, setViewMode] = React.useState<ViewMode>("timeline");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Controlled/uncontrolled filter state: prefers activeFilter when provided, without render-phase updates
  const [internalFilter, setInternalFilter] = React.useState<FilterStatus>(activeFilter ?? "ALL");
  const statusFilter = activeFilter ?? internalFilter;
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL");

  const handleFilterClick = (newFilter: FilterStatus) => {
    setInternalFilter(newFilter);
    onFilterChange?.(newFilter);
  };

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

  // Summary Metrics computed deterministically via domain calculation engine
  const metrics = React.useMemo(() => calculateTaskSummary(tasks), [tasks]);

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
    const completed: TaskRow[] = [];

    const now = new Date();
    const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    for (const t of filteredTasks) {
      const bucket = getTimelineBucket(t.due_date, t.status, todayStartMs);
      if (bucket === "overdue") overdue.push(t);
      else if (bucket === "today") today.push(t);
      else if (bucket === "this_week") thisWeek.push(t);
      else if (bucket === "upcoming") upcoming.push(t);
      else if (bucket === "completed") completed.push(t);
      else unscheduled.push(t);
    }

    return {
      overdue,
      today,
      thisWeek,
      upcoming,
      unscheduled,
      completed,
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
  const renderTaskCard = (task: TaskRow) => (
    <TimelineTaskCard
      key={task.id}
      task={task}
      isPendingToggle={pendingToggles.has(task.id)}
      onToggleStatus={handleToggleStatus}
      onEdit={setEditingTask}
      onDelete={setDeletingTask}
    />
  );

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

        {/* KPI Metrics Grid & Progress Bar */}
        <TimelineKpiGrid metrics={metrics} />
      </div>

      {/* 2. Controls, Search & Filter Bar */}
      <TimelineFilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={handleFilterClick}
        metrics={metrics}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

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

          {/* Completed / Closed Section */}
          {timelineGroups.completed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-emerald-100 pb-2 dark:border-emerald-950">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Completed / Closed ({timelineGroups.completed.length})
                </h3>
              </div>
              <div className="space-y-3">
                {timelineGroups.completed.map(renderTaskCard)}
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
