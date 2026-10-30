import type { TaskRow } from "@/lib/validations/task";
import { isTaskOverdue } from "@/lib/date-utils";

/**
 * Planora AI — Deterministic Task KPI & Progress Engine
 * 
 * Provides pure, zero-dependency calculation functions for tasks and checklists.
 * Mirrors the pure domain architecture of `budget-math.ts` to ensure consistency
 * across server actions, dashboard overviews, and client UI components.
 */

export interface TaskSummary {
  /** Total number of tasks */
  total: number;
  /** Number of tasks with status 'completed' */
  completed: number;
  /** Number of tasks with status 'in_progress' */
  inProgress: number;
  /** Number of tasks with status 'pending' */
  pending: number;
  /** Number of tasks with status 'cancelled' */
  cancelled: number;
  /** Combined count of active non-completed tasks (pending + in_progress) */
  activeNonCompleted: number;
  /** Number of tasks whose due date is in the past and status is not completed or cancelled */
  overdue: number;
  /** Total number of tasks marked as vendor checklist items */
  vendorCount: number;
  /** Number of vendor checklist tasks marked as 'completed' */
  completedVendorCount: number;
  /** Overall task completion rate as an integer percentage (0 - 100) */
  completionRate: number;
  /** Vendor checklist completion rate as an integer percentage (0 - 100) */
  vendorCompletionRate: number;
}

export type TaskSummaryInput = Pick<
  TaskRow,
  "status" | "due_date" | "is_vendor_checklist"
>;

/**
 * Computes deterministic task statistics, completion percentages, and vendor metrics.
 * Operates in a single efficient O(n) pass.
 *
 * Guaranteed to never produce NaN, Infinity, or division by zero.
 *
 * @param tasks - Array of task rows or partial objects containing status, due_date, and is_vendor_checklist
 * @param nowMs - Optional reference timestamp in milliseconds for deterministic overdue calculation (defaults to Date.now())
 */
export function calculateTaskSummary(
  tasks: readonly TaskSummaryInput[] | null | undefined,
  nowMs: number = Date.now()
): TaskSummary {
  if (!tasks || tasks.length === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      cancelled: 0,
      activeNonCompleted: 0,
      overdue: 0,
      vendorCount: 0,
      completedVendorCount: 0,
      completionRate: 0,
      vendorCompletionRate: 0,
    };
  }

  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let cancelled = 0;
  let overdue = 0;
  let vendorCount = 0;
  let completedVendorCount = 0;

  for (const t of tasks) {
    const isCompleted = t.status === "completed";
    const isVendor = Boolean(t.is_vendor_checklist);

    if (isCompleted) {
      completed++;
      if (isVendor) completedVendorCount++;
    } else if (t.status === "in_progress") {
      inProgress++;
    } else if (t.status === "pending") {
      pending++;
    } else if (t.status === "cancelled") {
      cancelled++;
    }

    if (isVendor) {
      vendorCount++;
    }

    if (isTaskOverdue(t.due_date, t.status, nowMs)) {
      overdue++;
    }
  }

  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const vendorCompletionRate =
    vendorCount > 0 ? Math.round((completedVendorCount / vendorCount) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    pending,
    cancelled,
    activeNonCompleted: pending + inProgress,
    overdue,
    vendorCount,
    completedVendorCount,
    completionRate,
    vendorCompletionRate,
  };
}

