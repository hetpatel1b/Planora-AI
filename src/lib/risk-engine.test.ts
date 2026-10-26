import { describe, it, expect } from "vitest";
import { evaluateEventRisks } from "@/lib/risk-engine";
import type { EventRow } from "@/lib/validations/event";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { TaskRow } from "@/lib/validations/task";
import type { PlanRevisionRow, AIPlanBlueprint } from "@/lib/validations/plan";

describe("Deterministic Event Risk Engine", () => {
  // Fixed reference timestamp: 2026-10-15T12:00:00.000Z
  const fixedRefTime = new Date("2026-10-15T12:00:00.000Z").getTime();

  const baseEvent: Pick<
    EventRow,
    "id" | "name" | "event_date" | "budget" | "status" | "guest_count"
  > = {
    id: "event-test-1",
    name: "Autumn Gala",
    event_date: "2026-11-20T18:00:00.000Z", // 36 days after refTime
    budget: 10000.0,
    status: "planning",
    guest_count: 150,
  };

  const sampleBudgetItems: BudgetItemRow[] = [
    {
      id: "b-1",
      event_id: "event-test-1",
      user_id: "u-1",
      plan_revision_id: null,
      category: "Venue & Facilities",
      item_name: "Reception Hall",
      estimated_amount: 4000.0,
      actual_amount: 3800.0,
      notes: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "b-2",
      event_id: "event-test-1",
      user_id: "u-1",
      plan_revision_id: null,
      category: "Catering & Bar",
      item_name: "Dinner Buffet",
      estimated_amount: 3000.0,
      actual_amount: 2900.0,
      notes: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  const sampleTasks: TaskRow[] = [
    {
      id: "t-1",
      event_id: "event-test-1",
      user_id: "u-1",
      plan_revision_id: null,
      title: "Confirm Catering Menu",
      description: "Taste test and sign off",
      due_date: "2026-11-01T12:00:00.000Z", // ~17 days ahead
      priority: "medium",
      status: "in_progress",
      is_vendor_checklist: true,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  it("returns healthy risk level when no risks are detected", () => {
    const res = evaluateEventRisks({
      event: baseEvent,
      budgetItems: sampleBudgetItems,
      tasks: sampleTasks,
      referenceTimestampMs: fixedRefTime,
    });

    expect(res.overallRiskLevel).toBe("healthy");
    expect(res.risks.length).toBe(0);
    expect(res.counts.total).toBe(0);
    expect(res.counts.critical).toBe(0);
  });

  describe("R1: Budget Overrun Rules", () => {
    it("flags critical risk when actual spending strictly exceeds event budget ceiling", () => {
      const overspentItems: BudgetItemRow[] = [
        {
          ...sampleBudgetItems[0],
          actual_amount: 7000.0,
        },
        {
          ...sampleBudgetItems[1],
          actual_amount: 4500.0, // total actual = 11,500 > 10,000 budget
        },
      ];

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: overspentItems,
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const actualOverrun = res.risks.find((r) => r.id === "risk-budget-actual-overrun");
      expect(actualOverrun).toBeDefined();
      expect(actualOverrun?.severity).toBe("critical");
      expect(actualOverrun?.evidence.overrunAmount).toBe(1500.0);
      expect(res.overallRiskLevel).toBe("critical");
    });

    it("flags high risk when estimated allocations exceed budget ceiling (while actual spend is under)", () => {
      const overallocatedItems: BudgetItemRow[] = [
        {
          ...sampleBudgetItems[0],
          estimated_amount: 8000.0,
        },
        {
          ...sampleBudgetItems[1],
          estimated_amount: 3500.0, // total est = 11,500 > 10,000
          actual_amount: 1000.0, // actual spend well within budget
        },
      ];

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: overallocatedItems,
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const estOverrun = res.risks.find(
        (r) => r.id === "risk-budget-estimated-overallocation"
      );
      expect(estOverrun).toBeDefined();
      expect(estOverrun?.severity).toBe("high");
      expect(estOverrun?.evidence.overallocationAmount).toBe(1500.0);
    });

    it("flags medium risk on significant individual line-item cost variance", () => {
      const shockItems: BudgetItemRow[] = [
        {
          ...sampleBudgetItems[0],
          item_name: "Sound & Stage Lighting",
          estimated_amount: 1000.0,
          actual_amount: 1600.0, // +$600 (60% overrun, >= $250 and >= 20%)
        },
      ];

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: shockItems,
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const lineRisk = res.risks.find((r) =>
        r.id.startsWith("risk-budget-item-overrun-")
      );
      expect(lineRisk).toBeDefined();
      expect(lineRisk?.severity).toBe("medium");
      expect(lineRisk?.evidence.varianceAmount).toBe(600.0);
      expect(lineRisk?.evidence.percentOver).toBe(60);
    });

    it("verifies exact boundary for line-item overrun (strictly > $250 AND strictly > 20%)", () => {
      const boundaryItems: BudgetItemRow[] = [
        // Case 1: Exactly $250 overrun (25% > 20%, but exactly 250 is not > 250) -> NOT flagged
        {
          ...sampleBudgetItems[0],
          id: "b-exact-250",
          estimated_amount: 1000.0,
          actual_amount: 1250.0,
        },
        // Case 2: Exactly 20% overrun ($300 > 250, but exactly 20% is not > 20%) -> NOT flagged
        {
          ...sampleBudgetItems[0],
          id: "b-exact-20pct",
          estimated_amount: 1500.0,
          actual_amount: 1800.0,
        },
        // Case 3: Strictly > $250 ($251) AND strictly > 20% (25.1%) -> FLAGGED
        {
          ...sampleBudgetItems[0],
          id: "b-over-threshold",
          estimated_amount: 1000.0,
          actual_amount: 1251.0,
        },
      ];

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: boundaryItems,
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.risks.some((r) => r.id === "risk-budget-item-overrun-b-exact-250")).toBe(false);
      expect(res.risks.some((r) => r.id === "risk-budget-item-overrun-b-exact-20pct")).toBe(false);
      expect(res.risks.some((r) => r.id === "risk-budget-item-overrun-b-over-threshold")).toBe(true);
    });
  });

  describe("R2: Overdue Tasks Rules", () => {
    it("flags overdue incomplete tasks with past due dates", () => {
      const overdueTasks: TaskRow[] = [
        {
          id: "t-overdue-1",
          event_id: "event-test-1",
          user_id: "u-1",
          plan_revision_id: null,
          title: "Book Photographer",
          description: null,
          due_date: "2026-10-10T12:00:00.000Z", // 5 days before fixedRefTime
          priority: "high", // > 3 days + high priority => high
          status: "pending",
          is_vendor_checklist: true,
          created_at: "",
          updated_at: "",
        },
      ];

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: overdueTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const overdueRisk = res.risks.find((r) => r.id === "risk-task-overdue-t-overdue-1");
      expect(overdueRisk).toBeDefined();
      expect(overdueRisk?.severity).toBe("high");
      expect(overdueRisk?.evidence.daysOverdue).toBe(5);
    });

    it("assigns critical severity to urgent overdue tasks or tasks strictly more than 7 days overdue", () => {
      const urgentOverdue: TaskRow = {
        id: "t-urgent-overdue",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Sign Venue Contract",
        description: null,
        due_date: "2026-10-14T12:00:00.000Z", // 1 day overdue, but priority is urgent
        priority: "urgent",
        status: "in_progress",
        is_vendor_checklist: true,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [urgentOverdue],
        referenceTimestampMs: fixedRefTime,
      });

      const r = res.risks.find((x) => x.id === "risk-task-overdue-t-urgent-overdue");
      expect(r?.severity).toBe("critical");
    });

    it("verifies exact boundary for overdue thresholds (strictly > 7 days for critical, strictly > 3 days for high)", () => {
      // fixedRefTime is 2026-10-15T12:00:00.000Z
      // Exactly 7 days overdue: 2026-10-08T12:00:00.000Z => daysOverdue = 7. Not > 7, but > 3 => severity is high
      const task7Days: TaskRow = {
        id: "t-7days",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Task Exactly 7 Days Overdue",
        description: null,
        due_date: "2026-10-08T12:00:00.000Z",
        priority: "medium", // medium priority
        status: "pending",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      // 8 days overdue: 2026-10-07T12:00:00.000Z => daysOverdue = 8. 8 > 7 => severity is critical
      const task8Days: TaskRow = {
        id: "t-8days",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Task 8 Days Overdue",
        description: null,
        due_date: "2026-10-07T12:00:00.000Z",
        priority: "medium",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      // Exactly 3 days overdue: 2026-10-12T12:00:00.000Z => daysOverdue = 3. Not > 3 => severity is medium
      const task3Days: TaskRow = {
        id: "t-3days",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Task Exactly 3 Days Overdue",
        description: null,
        due_date: "2026-10-12T12:00:00.000Z",
        priority: "medium",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      // 4 days overdue: 2026-10-11T12:00:00.000Z => daysOverdue = 4. 4 > 3 => severity is high
      const task4Days: TaskRow = {
        id: "t-4days",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Task 4 Days Overdue",
        description: null,
        due_date: "2026-10-11T12:00:00.000Z",
        priority: "medium",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [task7Days, task8Days, task3Days, task4Days],
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.risks.find((r) => r.id === "risk-task-overdue-t-7days")?.severity).toBe("high");
      expect(res.risks.find((r) => r.id === "risk-task-overdue-t-8days")?.severity).toBe("critical");
      expect(res.risks.find((r) => r.id === "risk-task-overdue-t-3days")?.severity).toBe("medium");
      expect(res.risks.find((r) => r.id === "risk-task-overdue-t-4days")?.severity).toBe("high");
    });

    it("strictly excludes completed tasks with past due dates from overdue risks", () => {
      const completedTask: TaskRow = {
        id: "t-completed",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Pay Venue Deposit",
        description: null,
        due_date: "2026-10-01T12:00:00.000Z",
        priority: "urgent",
        status: "completed", // Done
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [completedTask],
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.risks.some((r) => r.id.includes("t-completed"))).toBe(false);
    });

    it("strictly excludes cancelled tasks from overdue risks", () => {
      const cancelledTask: TaskRow = {
        id: "t-cancelled",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Fireworks Permit",
        description: null,
        due_date: "2026-10-05T12:00:00.000Z",
        priority: "high",
        status: "cancelled",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [cancelledTask],
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.risks.some((r) => r.id.includes("t-cancelled"))).toBe(false);
    });

    it("strictly excludes tasks with null due dates from overdue risks", () => {
      const unscheduledTask: TaskRow = {
        id: "t-unscheduled",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Draft Speech",
        description: null,
        due_date: null,
        priority: "urgent",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [unscheduledTask],
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.risks.some((r) => r.id.includes("t-unscheduled"))).toBe(false);
    });
  });

  describe("R3: At-Risk Tasks Rules", () => {
    it("flags pending tasks approaching deadline within 48 hours", () => {
      const imminentPendingTask: TaskRow = {
        id: "t-imminent",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Approve Menu Proofs",
        description: null,
        due_date: "2026-10-16T18:00:00.000Z", // ~30 hours from fixedRefTime
        priority: "high",
        status: "pending", // Unstarted!
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [imminentPendingTask],
        referenceTimestampMs: fixedRefTime,
      });

      const atRisk = res.risks.find((r) => r.id === "risk-task-imminent-pending-t-imminent");
      expect(atRisk).toBeDefined();
      expect(atRisk?.severity).toBe("high");
    });

    it("flags urgent tasks approaching deadline within 7 days", () => {
      const urgentWindowTask: TaskRow = {
        id: "t-urgent-window",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Finalize Audio Visual Equipment",
        description: null,
        due_date: "2026-10-20T12:00:00.000Z", // 5 days away (> 2 days, <= 7 days)
        priority: "urgent",
        status: "in_progress",
        is_vendor_checklist: true,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [urgentWindowTask],
        referenceTimestampMs: fixedRefTime,
      });

      const urgentRisk = res.risks.find(
        (r) => r.id === "risk-task-urgent-window-t-urgent-window"
      );
      expect(urgentRisk).toBeDefined();
      expect(urgentRisk?.severity).toBe("high");
    });
  });

  describe("R5: Supported Schedule Conflicts Rules", () => {
    it("flags pre-event task scheduled after event date", () => {
      const conflictingTask: TaskRow = {
        id: "t-late-setup",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Install Stage Lighting",
        description: "Primary setup",
        due_date: "2026-11-25T12:00:00.000Z", // 5 days AFTER baseEvent.event_date (Nov 20)
        priority: "high",
        status: "pending",
        is_vendor_checklist: true,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [conflictingTask],
        referenceTimestampMs: fixedRefTime,
      });

      const conflict = res.risks.find(
        (r) => r.id === "risk-schedule-post-event-conflict-t-late-setup"
      );
      expect(conflict).toBeDefined();
      expect(conflict?.category).toBe("schedule_conflict");
      expect(conflict?.severity).toBe("high");
    });

    it("permits legitimate post-event wrap-up tasks scheduled after event date", () => {
      const wrapupTask: TaskRow = {
        id: "t-wrapup",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Post-Event Debrief and Deposit Return",
        description: "Reconcile invoices and collect venue damage deposit",
        due_date: "2026-11-25T12:00:00.000Z", // AFTER event date
        priority: "medium",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [wrapupTask],
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.risks.some((r) => r.id.includes("t-wrapup"))).toBe(false);
    });

    it("flags deadline clumping when > 5 high/urgent priority tasks are due on identical date", () => {
      const clumpedTasks: TaskRow[] = Array.from({ length: 6 }).map((_, i) => ({
        id: `t-clump-${i}`,
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: `Deliverable ${i + 1}`,
        description: null,
        due_date: "2026-11-10T12:00:00.000Z", // identical day
        priority: i % 2 === 0 ? "urgent" : "high",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      }));

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: clumpedTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const clumpingRisk = res.risks.find((r) =>
        r.id.startsWith("risk-schedule-clumping-2026-11-10")
      );
      expect(clumpingRisk).toBeDefined();
      expect(clumpingRisk?.severity).toBe("medium");
      expect(clumpingRisk?.evidence.taskCount).toBe(6);
    });

    it("does not fabricate unsupported intra-day time overlap conflicts", () => {
      // Two tasks on same day with no clumping threshold exceeded
      const twoTasks: TaskRow[] = [
        {
          id: "t-am",
          event_id: "event-test-1",
          user_id: "u-1",
          plan_revision_id: null,
          title: "Morning Sound Check",
          description: null,
          due_date: "2026-11-10T09:00:00.000Z",
          priority: "high",
          status: "in_progress",
          is_vendor_checklist: false,
          created_at: "",
          updated_at: "",
        },
        {
          id: "t-pm",
          event_id: "event-test-1",
          user_id: "u-1",
          plan_revision_id: null,
          title: "Afternoon Rehearsal",
          description: null,
          due_date: "2026-11-10T14:00:00.000Z",
          priority: "high",
          status: "in_progress",
          is_vendor_checklist: false,
          created_at: "",
          updated_at: "",
        },
      ];

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: twoTasks,
        referenceTimestampMs: fixedRefTime,
      });

      // Must not invent time-of-day overlap
      expect(res.risks.some((r) => r.category === "schedule_conflict")).toBe(false);
    });
  });

  describe("R4: Missing Checklist Items Rules", () => {
    it("flags empty checklist on active upcoming event within 90 days", () => {
      const res = evaluateEventRisks({
        event: baseEvent, // 36 days away
        budgetItems: sampleBudgetItems,
        tasks: [], // Empty!
        referenceTimestampMs: fixedRefTime,
      });

      const emptyRisk = res.risks.find((r) => r.id === "risk-missing-checklist-empty");
      expect(emptyRisk).toBeDefined();
      expect(emptyRisk?.severity).toBe("high");
      expect(emptyRisk?.evidence.isHeuristicWarning).toBe(true);
    });

    it("flags omitted urgent tasks from active plan blueprint", () => {
      const activeBlueprint: AIPlanBlueprint = {
        summary: "Curated Autumn Gala Plan",
        themes: ["Classic Elegance"],
        scheduleMilestones: [
          {
            title: "Security & Licensing",
            timeframe: "1 Month Prior",
            description: "Obtain city permits",
            suggested_date: "2026-10-20",
          },
        ],
        suggestedTasks: [
          {
            title: "Obtain Municipal Event Permit",
            description: "City hall filing",
            priority: "urgent", // Urgent!
            category: "Logistics & Rentals",
            is_vendor_checklist: false,
            suggested_days_before: 30,
          },
        ],
        proposedBudgetItems: [
          {
            category: "Other",
            item_name: "Permit Fee",
            estimated_amount: 150,
          },
        ],
        keyRecommendations: [],
        metadata: {
          source: "deterministic",
          generatedAt: "2026-10-01T00:00:00Z",
        },
      };

      const mockPlanRevision: PlanRevisionRow = {
        id: "plan-rev-1",
        event_id: "event-test-1",
        user_id: "u-1",
        revision_number: 1,
        structured_plan: activeBlueprint as unknown as PlanRevisionRow["structured_plan"],
        summary: "Plan summary",
        is_active: true,
        created_at: "2026-10-01T00:00:00Z",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: sampleTasks, // Does NOT contain "Obtain Municipal Event Permit"
        activePlanRevision: mockPlanRevision,
        referenceTimestampMs: fixedRefTime,
      });

      const omittedRisk = res.risks.find((r) =>
        r.id.includes("obtainmunicipaleventpermit")
      );
      expect(omittedRisk).toBeDefined();
      expect(omittedRisk?.severity).toBe("medium");
      expect(omittedRisk?.evidence.isVerifiedOmission).toBe(true);
    });

    it("does not flag false omission when equivalent saved task exists", () => {
      const activeBlueprint: AIPlanBlueprint = {
        summary: "Plan",
        themes: ["Elegance"],
        scheduleMilestones: [
          {
            title: "Catering",
            timeframe: "30 days",
            description: "Desc",
            suggested_date: "2026-10-20",
          },
        ],
        suggestedTasks: [
          {
            title: "Confirm Catering Menu Selection",
            description: null,
            priority: "urgent",
            category: "Catering & Bar",
            is_vendor_checklist: true,
            suggested_days_before: 20,
          },
        ],
        proposedBudgetItems: [
          {
            category: "Catering & Bar",
            item_name: "Food",
            estimated_amount: 2000,
          },
        ],
        keyRecommendations: [],
        metadata: {
          source: "deterministic",
          generatedAt: "2026-10-01T00:00:00Z",
        },
      };

      const mockPlanRevision: PlanRevisionRow = {
        id: "plan-rev-1",
        event_id: "event-test-1",
        user_id: "u-1",
        revision_number: 1,
        structured_plan: activeBlueprint as unknown as PlanRevisionRow["structured_plan"],
        summary: "Plan",
        is_active: true,
        created_at: "2026-10-01T00:00:00Z",
      };

      // sampleTasks has "Confirm Catering Menu" which matches via substring
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: sampleTasks,
        activePlanRevision: mockPlanRevision,
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.risks.some((r) => r.id.includes("catering"))).toBe(false);
    });
  });

  describe("Deterministic Health, Aggregation and Immutability", () => {
    it("produces stable risk IDs and identical output for repeated calls", () => {
      const context = {
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      };

      const res1 = evaluateEventRisks(context);
      const res2 = evaluateEventRisks(context);

      expect(res1).toEqual(res2);
    });

    it("ensures aggregate counts accurately reflect returned risks array", () => {
      // Construct a scenario with multiple risks
      const complexContext = {
        event: {
          ...baseEvent,
          budget: 5000.0, // smaller budget
        },
        budgetItems: [
          {
            ...sampleBudgetItems[0],
            actual_amount: 6000.0, // Critical actual overrun
          },
        ],
        tasks: [
          {
            id: "t-overdue",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            title: "Task 1",
            description: null,
            due_date: "2026-10-01T12:00:00.000Z",
            priority: "high" as const, // High overdue
            status: "pending" as const,
            is_vendor_checklist: false,
            created_at: "",
            updated_at: "",
          },
        ],
        referenceTimestampMs: fixedRefTime,
      };

      const res = evaluateEventRisks(complexContext);
      const { counts, risks } = res;

      expect(counts.total).toBe(risks.length);
      expect(counts.critical + counts.high + counts.medium + counts.low).toBe(risks.length);
      expect(res.overallRiskLevel).toBe("critical");
    });

    it("never mutates input arrays or objects", () => {
      const eventClone = { ...baseEvent };
      const budgetClone = [...sampleBudgetItems];
      const tasksClone = [...sampleTasks];

      evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      expect(baseEvent).toEqual(eventClone);
      expect(sampleBudgetItems).toEqual(budgetClone);
      expect(sampleTasks).toEqual(tasksClone);
    });

    it("evaluates overall risk level as elevated when multiple high risks exist without critical", () => {
      const res = evaluateEventRisks({
        event: { ...baseEvent, budget: 1000 },
        budgetItems: [
          {
            ...sampleBudgetItems[0],
            estimated_amount: 5000, // High risk: projected budget overallocation
            actual_amount: 500,
          },
        ],
        tasks: [
          {
            id: "t-high-1",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            title: "Task 1",
            description: null,
            due_date: "2026-10-10T12:00:00.000Z", // Overdue > 3 days with high priority => high risk
            priority: "high",
            status: "pending",
            is_vendor_checklist: false,
            created_at: "",
            updated_at: "",
          },
        ],
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.counts.critical).toBe(0);
      expect(res.counts.high).toBe(2);
      expect(res.overallRiskLevel).toBe("elevated");
    });

    it("evaluates R4.3 heuristic when high-spend vendor category exists without vendor checklist", () => {
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: [
          {
            id: "b-uncovered-venue",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            category: "Venue & Facilities",
            item_name: "Venue Contract",
            estimated_amount: 4000.0,
            actual_amount: 0,
            notes: null,
            created_at: "",
            updated_at: "",
          },
        ],
        tasks: [
          {
            id: "t-general",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            title: "General Planning Meeting",
            description: null,
            due_date: "2026-11-01T12:00:00.000Z",
            priority: "medium",
            status: "pending",
            is_vendor_checklist: false,
            created_at: "",
            updated_at: "",
          },
        ],
        activePlanRevision: null, // No blueprint
        referenceTimestampMs: fixedRefTime,
      });

      const vendorRisk = res.risks.find((r) =>
        r.id.startsWith("risk-missing-vendor-checklist-venuefacilities")
      );
      expect(vendorRisk).toBeDefined();
      expect(vendorRisk?.severity).toBe("medium");
      expect(vendorRisk?.evidence.isHeuristicWarning).toBe(true);
    });

    it("handles item with 0 estimated amount and positive actual amount gracefully", () => {
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: [
          {
            id: "b-zero-est",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            category: "Other",
            item_name: "Unplanned Fee",
            estimated_amount: 0,
            actual_amount: 300,
            notes: null,
            created_at: "",
            updated_at: "",
          },
        ],
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const lineRisk = res.risks.find((r) => r.id === "risk-budget-item-overrun-b-zero-est");
      expect(lineRisk).toBeDefined();
      expect(lineRisk?.evidence.percentOver).toBe(100);
    });

    it("gracefully ignores tasks with unparseable due date strings", () => {
      const invalidDateTask: TaskRow = {
        id: "t-invalid-date",
        event_id: "event-test-1",
        user_id: "u-1",
        plan_revision_id: null,
        title: "Task with bad date",
        description: null,
        due_date: "invalid-date-string",
        priority: "high",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "",
        updated_at: "",
      };

      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [invalidDateTask],
        referenceTimestampMs: fixedRefTime,
      });

      expect(res.risks.some((r) => r.id.includes("t-invalid-date"))).toBe(false);
    });
  });

  describe("Strict Threshold Boundary Verifications (F08)", () => {
    it("does NOT trigger line-item overrun when excess is exactly $250.00 (must be strictly > $250)", () => {
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: [
          {
            id: "b-exact-250",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            category: "Catering & Bar",
            item_name: "Appetizers",
            estimated_amount: 1000.0,
            actual_amount: 1250.0, // delta = exactly $250.00, percent = 25% > 20%
            notes: null,
            created_at: "",
            updated_at: "",
          },
        ],
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const overrunRisk = res.risks.find((r) => r.id.includes("b-exact-250"));
      expect(overrunRisk).toBeUndefined();
    });

    it("DOES trigger line-item overrun when excess is strictly > $250.00 ($250.01)", () => {
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: [
          {
            id: "b-strictly-over-250",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            category: "Catering & Bar",
            item_name: "Appetizers",
            estimated_amount: 1000.0,
            actual_amount: 1250.01, // delta = $250.01 (> $250), percent = 25.001% (> 20%)
            notes: null,
            created_at: "",
            updated_at: "",
          },
        ],
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const overrunRisk = res.risks.find((r) => r.id.includes("b-strictly-over-250"));
      expect(overrunRisk).toBeDefined();
      expect(overrunRisk?.category).toBe("budget_overrun");
    });

    it("does NOT trigger line-item overrun when percentage is exactly 20.00% (must be strictly > 20%)", () => {
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: [
          {
            id: "b-exact-20-pct",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            category: "Venue & Facilities",
            item_name: "Security",
            estimated_amount: 2000.0,
            actual_amount: 2400.0, // delta = $400 (> $250), percent = exactly 20.00%
            notes: null,
            created_at: "",
            updated_at: "",
          },
        ],
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const overrunRisk = res.risks.find((r) => r.id.includes("b-exact-20-pct"));
      expect(overrunRisk).toBeUndefined();
    });

    it("DOES trigger line-item overrun when percentage is strictly > 20% (e.g. 20.05%)", () => {
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: [
          {
            id: "b-over-20-pct",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            category: "Venue & Facilities",
            item_name: "Security",
            estimated_amount: 2000.0,
            actual_amount: 2401.0, // delta = $401 (> $250), percent = 20.05% (> 20%)
            notes: null,
            created_at: "",
            updated_at: "",
          },
        ],
        tasks: sampleTasks,
        referenceTimestampMs: fixedRefTime,
      });

      const overrunRisk = res.risks.find((r) => r.id.includes("b-over-20-pct"));
      expect(overrunRisk).toBeDefined();
    });

    it("assigns medium severity when task is exactly 3 days overdue with medium priority", () => {
      // 3 days before fixedRefTime (2026-10-15T12:00:00.000Z) is 2026-10-12T12:00:00.000Z
      const exact3DaysDue = new Date(fixedRefTime - 3 * 24 * 60 * 60 * 1000).toISOString();
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [
          {
            id: "t-exact-3d",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            title: "Order signs",
            description: null,
            due_date: exact3DaysDue,
            priority: "medium", // not high or urgent
            status: "pending",
            is_vendor_checklist: false,
            created_at: "",
            updated_at: "",
          },
        ],
        referenceTimestampMs: fixedRefTime,
      });

      const taskRisk = res.risks.find((r) => r.id === "risk-task-overdue-t-exact-3d");
      expect(taskRisk).toBeDefined();
      expect(taskRisk?.severity).toBe("medium"); // strictly > 3 needed for high
    });

    it("assigns high severity when task is strictly > 3 days overdue (4 days) with medium priority", () => {
      const fourDaysDue = new Date(fixedRefTime - 4 * 24 * 60 * 60 * 1000).toISOString();
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [
          {
            id: "t-4d",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            title: "Order signs",
            description: null,
            due_date: fourDaysDue,
            priority: "medium",
            status: "pending",
            is_vendor_checklist: false,
            created_at: "",
            updated_at: "",
          },
        ],
        referenceTimestampMs: fixedRefTime,
      });

      const taskRisk = res.risks.find((r) => r.id === "risk-task-overdue-t-4d");
      expect(taskRisk).toBeDefined();
      expect(taskRisk?.severity).toBe("high");
    });

    it("assigns high severity when task is exactly 7 days overdue with medium priority", () => {
      const exact7DaysDue = new Date(fixedRefTime - 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [
          {
            id: "t-exact-7d",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            title: "Order badges",
            description: null,
            due_date: exact7DaysDue,
            priority: "medium",
            status: "pending",
            is_vendor_checklist: false,
            created_at: "",
            updated_at: "",
          },
        ],
        referenceTimestampMs: fixedRefTime,
      });

      const taskRisk = res.risks.find((r) => r.id === "risk-task-overdue-t-exact-7d");
      expect(taskRisk).toBeDefined();
      expect(taskRisk?.severity).toBe("high"); // strictly > 7 needed for critical
    });

    it("assigns critical severity when task is strictly > 7 days overdue (8 days) with medium priority", () => {
      const eightDaysDue = new Date(fixedRefTime - 8 * 24 * 60 * 60 * 1000).toISOString();
      const res = evaluateEventRisks({
        event: baseEvent,
        budgetItems: sampleBudgetItems,
        tasks: [
          {
            id: "t-8d",
            event_id: "event-test-1",
            user_id: "u-1",
            plan_revision_id: null,
            title: "Order badges",
            description: null,
            due_date: eightDaysDue,
            priority: "medium",
            status: "pending",
            is_vendor_checklist: false,
            created_at: "",
            updated_at: "",
          },
        ],
        referenceTimestampMs: fixedRefTime,
      });

      const taskRisk = res.risks.find((r) => r.id === "risk-task-overdue-t-8d");
      expect(taskRisk).toBeDefined();
      expect(taskRisk?.severity).toBe("critical");
    });
  });
});
