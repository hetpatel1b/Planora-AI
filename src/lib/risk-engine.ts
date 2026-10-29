import { toCents, fromCents } from "@/lib/budget-math";
import type { EventRow } from "@/lib/validations/event";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { TaskRow } from "@/lib/validations/task";
import {
  aiPlanBlueprintSchema,
  type PlanRevisionRow,
  type AIPlanBlueprint,
} from "@/lib/validations/plan";

export type RiskCategory =
  | "budget_overrun"
  | "overdue_tasks"
  | "at_risk_tasks"
  | "missing_checklist"
  | "schedule_conflict";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type OverallRiskLevel = "healthy" | "moderate" | "elevated" | "critical";

export interface DetectedRisk {
  /** Stable deterministic identifier */
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  evidence: Record<string, string | number | boolean | null>;
  suggestedMitigation: string;
  relatedItemId?: string;
  detectedAt: string;
}

export interface RiskSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface RiskAssessmentResult {
  overallRiskLevel: OverallRiskLevel;
  risks: DetectedRisk[];
  counts: RiskSeverityCounts;
  assessedAt: string;
}

export interface RiskEvaluationContext {
  event: Pick<EventRow, "id" | "name" | "event_date" | "budget" | "status" | "guest_count">;
  budgetItems: BudgetItemRow[];
  tasks: TaskRow[];
  activePlanRevision?: PlanRevisionRow | null;
  /** Injected timestamp for deterministic testing; defaults to Date.now() */
  referenceTimestampMs?: number;
}

/**
 * Regex identifying permitted post-event tasks that are naturally scheduled after event day.
 */
const PERMITTED_POST_EVENT_REGEX =
  /\b(post-event|wrap-?up|thank\s*you|deposit\s*return|debrief|feedback|final\s*invoice|vendor\s*payout)\b/i;

/**
 * Normalizes strings for resilient task title matching between plan blueprints and saved tasks.
 */
function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Pure, deterministic risk assessment engine for Planora AI (F08).
 * 
 * Evaluates real-time event health across 5 core risk categories:
 * 1. Budget overrun (R1)
 * 2. Overdue tasks (R2)
 * 3. At-risk tasks (R3)
 * 4. Missing checklist items (R4)
 * 5. Supported schedule conflicts (R5)
 * 
 * Guarantees:
 * - 100% pure function: zero database writes, zero network calls.
 * - Deterministic output: identical inputs & timestamps produce identical risks and IDs.
 * - Zero input mutation.
 * - Accurate matching of aggregate counts with returned risk array.
 */
export function evaluateEventRisks(
  context: RiskEvaluationContext
): RiskAssessmentResult {
  const {
    event,
    budgetItems,
    tasks,
    activePlanRevision,
    referenceTimestampMs = Date.now(),
  } = context;

  const detectedAt = new Date(referenceTimestampMs).toISOString();
  const risks: DetectedRisk[] = [];

  // ==========================================================================
  // R1: BUDGET OVERRUN DETECTION
  // ==========================================================================
  const targetBudget = Number(event.budget) || 0;
  const targetCents = toCents(targetBudget);

  let totalEstimatedCents = 0;
  let totalActualCents = 0;

  for (const item of budgetItems) {
    const estCents = toCents(item.estimated_amount);
    const actCents = toCents(item.actual_amount);

    totalEstimatedCents += estCents;
    totalActualCents += actCents;

    // R1.3: Line-item variance overrun shock
    // Triggered when an individual item's actual spend exceeds estimate by strictly > 20% AND strictly > $250
    if (actCents > estCents && actCents > 0) {
      const overspendCents = actCents - estCents;
      const isSignificantDollarAmount = overspendCents > 25000; // strictly > $250.00
      const percentOver =
        estCents > 0
          ? Math.round((overspendCents / estCents) * 10000) / 100
          : 100;

      if (isSignificantDollarAmount && percentOver > 20) {
        risks.push({
          id: `risk-budget-item-overrun-${item.id}`,
          category: "budget_overrun",
          severity: "medium",
          title: `Line-Item Cost Variance: ${item.item_name}`,
          explanation: `Line item "${item.item_name}" in category "${item.category}" exceeded its estimate by ₹${(
            overspendCents / 100
          ).toFixed(2)} (${percentOver}% over estimate).`,
          evidence: {
            itemId: item.id,
            itemName: item.item_name,
            category: item.category,
            estimatedAmount: fromCents(estCents),
            actualAmount: fromCents(actCents),
            varianceAmount: fromCents(overspendCents),
            percentOver,
          },
          suggestedMitigation:
            "Rebalance funds from lower-priority categories or allocate contingency cushion to absorb this variance.",
          relatedItemId: item.id,
          detectedAt,
        });
      }
    }
  }

  // R1.1: Actual spending exceeding event budget ceiling
  if (targetCents > 0 && totalActualCents > targetCents) {
    const overrunCents = totalActualCents - targetCents;
    const utilization =
      Math.round((totalActualCents / targetCents) * 10000) / 100;

    risks.push({
      id: "risk-budget-actual-overrun",
      category: "budget_overrun",
      severity: "critical",
      title: "Actual Budget Overrun",
      explanation: `Total recorded expenditures (₹${(
        totalActualCents / 100
      ).toFixed(2)}) exceed the target budget (₹${(targetCents / 100).toFixed(
        2
      )}) by ₹${(overrunCents / 100).toFixed(2)}.`,
      evidence: {
        targetBudget: fromCents(targetCents),
        totalActual: fromCents(totalActualCents),
        overrunAmount: fromCents(overrunCents),
        utilizationPercent: utilization,
      },
      suggestedMitigation:
        "Freeze discretionary expenses immediately and review high-variance line items in Catering, Venue, or Rentals.",
      detectedAt,
    });
  }
  // R1.2: Estimated allocations exceeding event budget
  else if (targetCents > 0 && totalEstimatedCents > targetCents) {
    const overallocationCents = totalEstimatedCents - targetCents;

    risks.push({
      id: "risk-budget-estimated-overallocation",
      category: "budget_overrun",
      severity: "high",
      title: "Projected Budget Overallocation",
      explanation: `Total planned allocations (₹${(
        totalEstimatedCents / 100
      ).toFixed(2)}) exceed the target budget (₹${(targetCents / 100).toFixed(
        2
      )}) by ₹${(overallocationCents / 100).toFixed(2)}.`,
      evidence: {
        targetBudget: fromCents(targetCents),
        totalEstimated: fromCents(totalEstimatedCents),
        overallocationAmount: fromCents(overallocationCents),
      },
      suggestedMitigation:
        "Use the What-If Simulator to trim planned allocations or negotiate vendor package rates before signing binding contracts.",
      detectedAt,
    });
  }

  // ==========================================================================
  // R2, R3 & R5: TASK DEADLINES, AT-RISK TASKS & SCHEDULE CONFLICTS
  // ==========================================================================
  const eventTime = event.event_date ? new Date(event.event_date).getTime() : null;
  const isEventDateValid = eventTime !== null && !isNaN(eventTime);

  // Group high/urgent priority tasks by UTC calendar day for R5 deadline clumping
  const highPriorityDateCounts = new Map<string, TaskRow[]>();

  for (const task of tasks) {
    // Exclude completed or cancelled tasks from deadline & conflict evaluations
    if (task.status === "completed" || task.status === "cancelled") {
      continue;
    }

    if (!task.due_date) {
      // Unscheduled tasks do not trigger overdue or deadline conflict alerts
      continue;
    }

    const taskDueTime = new Date(task.due_date).getTime();
    if (isNaN(taskDueTime)) {
      continue;
    }

    // ------------------------------------------------------------------------
    // R2: Overdue Tasks
    // ------------------------------------------------------------------------
    if (taskDueTime < referenceTimestampMs) {
      const daysOverdue = Math.floor(
        (referenceTimestampMs - taskDueTime) / (1000 * 60 * 60 * 24)
      );

      let severity: RiskSeverity = "medium";
      if (task.priority === "urgent" || daysOverdue > 7) {
        severity = "critical";
      } else if (task.priority === "high" || daysOverdue > 3) {
        severity = "high";
      }

      risks.push({
        id: `risk-task-overdue-${task.id}`,
        category: "overdue_tasks",
        severity,
        title: `Overdue Task: ${task.title}`,
        explanation: `Task "${task.title}" was due on ${
          task.due_date.split("T")[0]
        } (${daysOverdue} ${
          daysOverdue === 1 ? "day" : "days"
        } ago) and is currently ${task.status}.`,
        evidence: {
          taskId: task.id,
          title: task.title,
          dueDate: task.due_date,
          priority: task.priority,
          status: task.status,
          daysOverdue,
        },
        suggestedMitigation:
          "Complete this task immediately or update its deadline to realign your planning milestones.",
        relatedItemId: task.id,
        detectedAt,
      });

      // Continue to next task so overdue task is not also flagged as at-risk
      continue;
    }

    // ------------------------------------------------------------------------
    // R5: Supported Schedule Conflicts — Pre-event task due after event date
    // ------------------------------------------------------------------------
    if (isEventDateValid && taskDueTime > eventTime) {
      const isPermittedPostEvent =
        PERMITTED_POST_EVENT_REGEX.test(task.title) ||
        (task.description && PERMITTED_POST_EVENT_REGEX.test(task.description));

      if (!isPermittedPostEvent) {
        risks.push({
          id: `risk-schedule-post-event-conflict-${task.id}`,
          category: "schedule_conflict",
          severity: "high",
          title: `Schedule Sequence Conflict: ${task.title}`,
          explanation: `Task "${task.title}" is scheduled for completion after the event date (${
            event.event_date?.split("T")[0] ?? "event date"
          }).`,
          evidence: {
            taskId: task.id,
            title: task.title,
            dueDate: task.due_date,
            eventDate: event.event_date,
          },
          suggestedMitigation:
            "Pre-event preparations cannot be delivered after event day. Move this task deadline prior to the event date.",
          relatedItemId: task.id,
          detectedAt,
        });

        // Do not also add to R3 at-risk
        continue;
      }
    }

    // ------------------------------------------------------------------------
    // R3: At-Risk Tasks — Approaching deadlines
    // ------------------------------------------------------------------------
    const msUntilDue = taskDueTime - referenceTimestampMs;
    const hoursUntilDue = msUntilDue / (1000 * 60 * 60);
    const daysUntilDue = msUntilDue / (1000 * 60 * 60 * 24);

    // R3.1: Pending task due within 48 hours (unstarted imminent deadline)
    if (task.status === "pending" && hoursUntilDue <= 48) {
      const severity: RiskSeverity =
        task.priority === "urgent" || task.priority === "high" ? "high" : "medium";

      risks.push({
        id: `risk-task-imminent-pending-${task.id}`,
        category: "at_risk_tasks",
        severity,
        title: `Imminent Unstarted Task: ${task.title}`,
        explanation: `Task "${task.title}" is due in ${Math.max(
          1,
          Math.round(hoursUntilDue)
        )} hours, but work has not been started.`,
        evidence: {
          taskId: task.id,
          title: task.title,
          dueDate: task.due_date,
          hoursUntilDue: Math.round(hoursUntilDue),
          priority: task.priority,
          status: task.status,
        },
        suggestedMitigation:
          "Begin execution on this deliverable immediately or reassign to co-planners to avoid missing deadline.",
        relatedItemId: task.id,
        detectedAt,
      });
    }
    // R3.2: Urgent priority task due within 7 days
    else if (task.priority === "urgent" && daysUntilDue <= 7 && daysUntilDue > 2) {
      risks.push({
        id: `risk-task-urgent-window-${task.id}`,
        category: "at_risk_tasks",
        severity: "high",
        title: `Urgent Deadline Approaching: ${task.title}`,
        explanation: `Urgent-priority task "${task.title}" is due in ${Math.ceil(
          daysUntilDue
        )} days.`,
        evidence: {
          taskId: task.id,
          title: task.title,
          dueDate: task.due_date,
          daysUntilDue: Math.ceil(daysUntilDue),
          priority: task.priority,
          status: task.status,
        },
        suggestedMitigation:
          "Verify external vendors and critical prerequisites required to close this urgent deliverable.",
        relatedItemId: task.id,
        detectedAt,
      });
    }

    // ------------------------------------------------------------------------
    // Accumulate for R5: Deadline Clumping
    // ------------------------------------------------------------------------
    if (task.priority === "high" || task.priority === "urgent") {
      const dueDayKey = task.due_date.split("T")[0];
      const existing = highPriorityDateCounts.get(dueDayKey) || [];
      existing.push(task);
      highPriorityDateCounts.set(dueDayKey, existing);
    }
  }

  // R5: Supported Schedule Conflicts — Deadline clumping (> 5 high/urgent tasks on one day)
  for (const [dayKey, clumpedTasks] of highPriorityDateCounts.entries()) {
    if (clumpedTasks.length > 5) {
      risks.push({
        id: `risk-schedule-clumping-${dayKey}`,
        category: "schedule_conflict",
        severity: "medium",
        title: `Deadline Bottleneck: ${clumpedTasks.length} High-Priority Tasks on ${dayKey}`,
        explanation: `${clumpedTasks.length} high or urgent priority tasks are scheduled with identical deadline (${dayKey}), creating an operational bottleneck.`,
        evidence: {
          deadlineDate: dayKey,
          taskCount: clumpedTasks.length,
          sampleTasks: clumpedTasks
            .slice(0, 5)
            .map((t) => t.title)
            .join(", "),
        },
        suggestedMitigation:
          "Stagger task deadlines across preceding days to balance workload and prevent execution delays.",
        detectedAt,
      });
    }
  }

  // ==========================================================================
  // R4: MISSING CHECKLIST ITEMS
  // ==========================================================================
  // Extract blueprint if present
  let structuredBlueprint: AIPlanBlueprint | null = null;
  if (activePlanRevision?.structured_plan) {
    const planParse = aiPlanBlueprintSchema.safeParse(activePlanRevision.structured_plan);
    if (planParse.success) {
      structuredBlueprint = planParse.data;
    }
  }

  // R4.1: Blueprint-based omission detection
  if (structuredBlueprint && structuredBlueprint.suggestedTasks.length > 0) {
    const normalizedSavedTitles = tasks.map((t) => ({
      raw: t.title.toLowerCase(),
      normalized: normalizeTitle(t.title),
    }));

    for (const suggested of structuredBlueprint.suggestedTasks) {
      // Flag urgent or high priority blueprint recommendations that are missing from saved tasks
      if (suggested.priority === "urgent" || suggested.priority === "high") {
        const normSuggested = normalizeTitle(suggested.title);
        const rawSuggested = suggested.title.toLowerCase();

        const hasMatch = normalizedSavedTitles.some(
          (t) =>
            t.normalized === normSuggested ||
            t.raw.includes(rawSuggested) ||
            rawSuggested.includes(t.raw)
        );

        if (!hasMatch) {
          const slug = normSuggested.slice(0, 32);
          risks.push({
            id: `risk-missing-blueprint-task-${slug}`,
            category: "missing_checklist",
            severity: "medium",
            title: `Missing Recommended Task: ${suggested.title}`,
            explanation: `Recommended ${suggested.priority}-priority task "${suggested.title}" from your active plan blueprint is missing from your checklist.`,
            evidence: {
              blueprintTitle: suggested.title,
              category: suggested.category,
              priority: suggested.priority,
              isVerifiedOmission: true,
            },
            suggestedMitigation: `Add "${suggested.title}" to your checklist to ensure milestone coverage.`,
            detectedAt,
          });
        }
      }
    }
  }

  // R4.2: Heuristic: Empty checklist on scheduled upcoming event
  const isUpcomingEvent =
    isEventDateValid &&
    eventTime >= referenceTimestampMs &&
    event.status !== "cancelled" &&
    event.status !== "completed";

  if (tasks.length === 0 && isUpcomingEvent) {
    const daysUntilEvent = Math.ceil(
      (eventTime - referenceTimestampMs) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilEvent <= 90) {
      risks.push({
        id: "risk-missing-checklist-empty",
        category: "missing_checklist",
        severity: "high",
        title: "Empty Checklist for Upcoming Event",
        explanation: `Event is scheduled for ${
          event.event_date?.split("T")[0] ?? "the scheduled date"
        } (${daysUntilEvent} days away), but no checklist tasks have been created.`,
        evidence: {
          daysUntilEvent,
          totalTasks: 0,
          isHeuristicWarning: true,
        },
        suggestedMitigation:
          "Generate and accept an event plan blueprint or create key vendor and operational milestones.",
        detectedAt,
      });
    }
  }

  // R4.3: Heuristic: Uncovered high-spend vendor category (when no blueprint active)
  if (!structuredBlueprint) {
    const highSpendVendorCategories = ["Catering & Bar", "Venue & Facilities"];
    const flaggedCategories = new Set<string>();

    for (const item of budgetItems) {
      if (
        highSpendVendorCategories.includes(item.category) &&
        !flaggedCategories.has(item.category) &&
        Number(item.estimated_amount) >= 1000
      ) {
        const catLower = item.category.toLowerCase();
        const hasVendorTask = tasks.some(
          (t) =>
            t.is_vendor_checklist ||
            t.title.toLowerCase().includes(catLower) ||
            t.title.toLowerCase().includes("venue") ||
            t.title.toLowerCase().includes("catering")
        );

        if (!hasVendorTask) {
          flaggedCategories.add(item.category);
          const slug = item.category.toLowerCase().replace(/[^a-z0-9]/g, "");

          risks.push({
            id: `risk-missing-vendor-checklist-${slug}`,
            category: "missing_checklist",
            severity: "medium",
            title: `Missing Vendor Checklist: ${item.category}`,
            explanation: `Major budget allocation logged for "${item.category}" (₹${Number(
              item.estimated_amount
            ).toLocaleString("en-IN")}), but no vendor checklist tasks exist.`,
            evidence: {
              category: item.category,
              estimatedAmount: Number(item.estimated_amount),
              isHeuristicWarning: true,
            },
            suggestedMitigation: `Add vendor contract, review, and verification checklist items for ${item.category}.`,
            detectedAt,
          });
        }
      }
    }
  }

  // ==========================================================================
  // DETERMINISTIC SORTING & SEVERITY AGGREGATION
  // ==========================================================================
  const severityRank: Record<RiskSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const categoryRank: Record<RiskCategory, number> = {
    budget_overrun: 0,
    overdue_tasks: 1,
    at_risk_tasks: 2,
    schedule_conflict: 3,
    missing_checklist: 4,
  };

  risks.sort((a, b) => {
    if (severityRank[a.severity] !== severityRank[b.severity]) {
      return severityRank[a.severity] - severityRank[b.severity];
    }
    if (categoryRank[a.category] !== categoryRank[b.category]) {
      return categoryRank[a.category] - categoryRank[b.category];
    }
    return a.id.localeCompare(b.id);
  });

  const counts: RiskSeverityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: risks.length,
  };

  for (const r of risks) {
    counts[r.severity]++;
  }

  // Determine overall risk level
  let overallRiskLevel: OverallRiskLevel = "healthy";
  if (counts.critical > 0) {
    overallRiskLevel = "critical";
  } else if (counts.high >= 2) {
    overallRiskLevel = "elevated";
  } else if (counts.high === 1 || counts.medium >= 2) {
    overallRiskLevel = "moderate";
  }

  return {
    overallRiskLevel,
    risks,
    counts,
    assessedAt: detectedAt,
  };
}
