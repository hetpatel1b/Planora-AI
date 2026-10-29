import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventSchema, type EventRow } from "@/lib/validations/event";
import { createBudgetItemSchema, type BudgetItemRow } from "@/lib/validations/budget";
import { createTaskSchema, type TaskRow } from "@/lib/validations/task";
import { calculateBudgetSummary } from "@/lib/budget-math";
import { evaluateEventRisks } from "@/lib/risk-engine";
import { simulateBudgetScenario } from "@/lib/budget-simulator";

describe("Cross-Module Integration: Event Lifecycle & Mathematical Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validEventInput = {
    name: "Autonomous AI Summit 2027",
    event_type: "Conference",
    event_date: "2027-11-15T09:00:00.000Z",
    location: "Moscone Center West, San Francisco",
    guest_count: 500,
    budget: 75000,
    preferences: "Keynote live stream, plant-based catering",
    constraints: "Sound curfew at 10 PM",
    cultural_requirements: "Quiet contemplation lounge",
  };

  it("completes full validation and initialization cycle for an event", () => {
    // 1. Validate Event
    const parsedEvent = createEventSchema.safeParse(validEventInput);
    expect(parsedEvent.success).toBe(true);
    if (!parsedEvent.success) return;

    const eventRecord: EventRow = {
      id: "evt-integration-101",
      user_id: "usr-lead-architect",
      name: parsedEvent.data.name,
      event_type: parsedEvent.data.event_type,
      status: "planning",
      event_date: parsedEvent.data.event_date,
      location: parsedEvent.data.location ?? null,
      guest_count: parsedEvent.data.guest_count ?? null,
      budget: parsedEvent.data.budget ?? 0,
      preferences: parsedEvent.data.preferences ?? null,
      constraints: parsedEvent.data.constraints ?? null,
      cultural_requirements: parsedEvent.data.cultural_requirements ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 2. Validate and Add Budget Line Items
    const rawBudgetInputs = [
      {
        event_id: eventRecord.id,
        category: "Venue",
        item_name: "Moscone Main Hall",
        estimated_amount: 30000,
        actual_amount: 30000,
      },
      {
        event_id: eventRecord.id,
        category: "Catering",
        item_name: "Farm-to-Table Lunch",
        estimated_amount: 25000,
        actual_amount: 28000, // overspent by 3000
      },
    ];

    const budgetItems: BudgetItemRow[] = rawBudgetInputs.map((raw, idx) => {
      const parsed = createBudgetItemSchema.safeParse(raw);
      expect(parsed.success).toBe(true);
      return {
        id: `item-int-${idx + 1}`,
        event_id: raw.event_id,
        user_id: eventRecord.user_id,
        plan_revision_id: null,
        category: raw.category,
        item_name: raw.item_name,
        estimated_amount: raw.estimated_amount,
        actual_amount: raw.actual_amount,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // 3. Mathematical Budget Invariants
    const summary = calculateBudgetSummary(eventRecord.budget, budgetItems);
    expect(summary.totalEstimated).toBe(55000); // 30k + 25k
    expect(summary.totalActual).toBe(58000); // 30k + 28k
    expect(summary.remainingBudget).toBe(17000); // 75k - 58k
    expect(summary.hasOverspentItems).toBe(true);
    expect(summary.overspentCount).toBe(1);

    // 4. Validate and Seed Tasks
    const rawTaskInputs = [
      {
        event_id: eventRecord.id,
        title: "Sign Venue Lease Contract",
        priority: "urgent" as const,
        due_date: "2026-01-01T00:00:00.000Z", // overdue
        status: "pending" as const,
      },
      {
        event_id: eventRecord.id,
        title: "Select Catering Vendor",
        priority: "high" as const,
        due_date: "2027-10-01T00:00:00.000Z",
        status: "completed" as const,
      },
    ];

    let tasks: TaskRow[] = rawTaskInputs.map((raw, idx) => {
      const parsed = createTaskSchema.safeParse(raw);
      expect(parsed.success).toBe(true);
      return {
        id: `task-int-${idx + 1}`,
        event_id: raw.event_id,
        user_id: eventRecord.user_id,
        plan_revision_id: null,
        title: raw.title,
        description: null,
        priority: raw.priority,
        status: raw.status,
        due_date: raw.due_date,
        is_vendor_checklist: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // 5. Initial Threat Detection (Risk Engine)
    const initialAssessment = evaluateEventRisks({
      event: eventRecord,
      budgetItems,
      tasks,
    });

    // Overdue urgent task generates a critical risk
    expect(initialAssessment.counts.critical).toBeGreaterThanOrEqual(1);
    expect(initialAssessment.overallRiskLevel).toBe("critical");

    // 6. Complete the Overdue Urgent Task
    tasks = tasks.map((t) =>
      t.id === "task-int-1" ? { ...t, status: "completed" as const } : t
    );

    // 7. Risk Engine Re-evaluation
    const updatedAssessment = evaluateEventRisks({
      event: eventRecord,
      budgetItems,
      tasks,
    });

    // Overdue task threat resolved
    const overdueTaskRisks = updatedAssessment.risks.filter(
      (r) => r.category === "overdue_tasks"
    );
    expect(overdueTaskRisks.length).toBe(0);

    // 8. What-If Scenario Simulation
    const scenario = simulateBudgetScenario(
      eventRecord.budget,
      budgetItems,
      {
        id: "scenario-1",
        name: "Expanded Production Scenario",
        target_budget: 80000,
        new_items: [
          {
            tempId: "sim-candidate-1",
            category: "Marketing",
            item_name: "Keynote Livestream Production",
            estimated_amount: 10000,
            actual_amount: 0,
            notes: null,
          },
        ],
      }
    );

    expect(scenario.scenarioSummary.targetBudget).toBe(80000);
    expect(scenario.scenarioSummary.totalEstimated).toBe(65000); // 55k + 10k
    expect(scenario.scenarioSummary.unallocatedBudget).toBe(15000); // 80k - 65k
  });
});
