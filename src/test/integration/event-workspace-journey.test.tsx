/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from "vitest";
import { createEventSchema, type EventRow } from "@/lib/validations/event";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { TaskRow } from "@/lib/validations/task";
import { calculateBudgetSummary } from "@/lib/budget-math";
import { simulateBudgetScenario } from "@/lib/budget-simulator";
import { evaluateEventRisks } from "@/lib/risk-engine";
import { generateEventPlan } from "@/lib/plan-generator";
import { generateBudgetCsv, generateTasksCsv } from "@/lib/export-csv";
import { parseMarkdownBlocks } from "@/lib/markdown-utils";

describe("Integrated Event Workspace Journey — Full Invariant Lifecycle", () => {
  const eventInceptionDate = new Date("2027-06-15T18:00:00.000Z");

  it("executes the complete planning lifecycle across all core engines with mathematical and security invariants", () => {
    // -------------------------------------------------------------
    // STAGE 1: Event Creation & Schema Conformance
    // -------------------------------------------------------------
    const rawEventPayload = {
      name: "Diya & Aarav Grand Wedding Gala",
      event_type: "wedding",
      event_date: eventInceptionDate.toISOString(),
      location: "Royal Palace Grounds, Jaipur",
      guest_count: 350,
      budget: 85000,
      preferences: "Traditional ceremonies, floral mandap, organic vegetarian banquet",
      constraints: "Sound restrictions after 10:30 PM",
      cultural_requirements: "Sangeet stage, baraat processional route",
    };

    const parsedEvent = createEventSchema.safeParse(rawEventPayload);
    expect(parsedEvent.success).toBe(true);
    if (!parsedEvent.success) return;

    const eventRecord: EventRow = {
      id: "evt-jaipur-gala-2027",
      user_id: "usr-wedding-planner-01",
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

    expect(eventRecord.budget).toBe(85000);
    expect(eventRecord.guest_count).toBe(350);

    // -------------------------------------------------------------
    // STAGE 2: Deterministic AI Plan Generation
    // -------------------------------------------------------------
    const generatedBlueprint = generateEventPlan(
      {
        name: eventRecord.name,
        event_type: eventRecord.event_type,
        event_date: eventRecord.event_date,
        location: eventRecord.location,
        guest_count: eventRecord.guest_count,
        budget: eventRecord.budget,
        preferences: eventRecord.preferences,
        constraints: eventRecord.constraints,
        cultural_requirements: eventRecord.cultural_requirements,
      },
      { referenceDate: new Date("2027-01-01T00:00:00.000Z") }
    );

    expect(generatedBlueprint.summary.length).toBeGreaterThan(50);
    expect(generatedBlueprint.scheduleMilestones.length).toBeGreaterThanOrEqual(3);
    expect(generatedBlueprint.suggestedTasks.length).toBeGreaterThanOrEqual(4);
    expect(generatedBlueprint.proposedBudgetItems.length).toBeGreaterThanOrEqual(3);

    // Verify milestone dates precede the event date
    for (const milestone of generatedBlueprint.scheduleMilestones) {
      if (milestone.suggested_date) {
        expect(new Date(milestone.suggested_date).getTime()).toBeLessThanOrEqual(
          eventInceptionDate.getTime()
        );
      }
    }

    // -------------------------------------------------------------
    // STAGE 3: Budget Ledger Population & Variance Tracking
    // -------------------------------------------------------------
    const initialBudgetItems: BudgetItemRow[] = [
      {
        id: "b-venue",
        event_id: eventRecord.id,
        user_id: eventRecord.user_id,
        category: "Venue",
        item_name: "Palace Courtyard & Mandap Setup",
        estimated_amount: 35000,
        actual_amount: 38000, // +3000 variance
        notes: "Deposit paid; power backup included",
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "b-catering",
        event_id: eventRecord.id,
        user_id: eventRecord.user_id,
        category: "Catering",
        item_name: "Gourmet Vegetarian Feast (350 pax)",
        estimated_amount: 25000,
        actual_amount: 24000, // -1000 variance
        notes: "Live chaat counters and desserts included",
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "b-decor",
        event_id: eventRecord.id,
        user_id: eventRecord.user_id,
        category: "Decoration",
        item_name: "Marigold Floral Canopies & Architectural Lighting",
        estimated_amount: 15000,
        actual_amount: 15000,
        notes: "Fairylights and entryway floral torans",
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "b-photography",
        event_id: eventRecord.id,
        user_id: eventRecord.user_id,
        category: "Photography",
        item_name: "Cinematic Drone & Candid Team",
        estimated_amount: 10000,
        actual_amount: 10000,
        notes: "Two-day traditional coverage",
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const budgetSummary = calculateBudgetSummary(
      Number(eventRecord.budget),
      initialBudgetItems
    );

    // Mathematical Invariants:
    // Total Estimated = 35000 + 25000 + 15000 + 10000 = 85000
    expect(budgetSummary.totalEstimated).toBe(85000);
    // Total Actual = 38000 + 24000 + 15000 + 10000 = 87000
    expect(budgetSummary.totalActual).toBe(87000);
    // Variance = 87000 - 85000 = 2000 (Overspent)
    expect(budgetSummary.variance).toBe(2000);
    // Remaining Budget relative to total allocated cap: 85000 - 87000 = -2000
    expect(budgetSummary.remainingBudget).toBe(-2000);

    // -------------------------------------------------------------
    // STAGE 4: What-If Simulator Scenario Exploration
    // -------------------------------------------------------------
    // Model an aggressive optimization scenario:
    // Scale Venue down to 31500, override photography to 8500, remove decor, add live music
    const whatIfSimulation = simulateBudgetScenario(
      Number(eventRecord.budget),
      initialBudgetItems,
      {
        id: "scenario-containment-1",
        name: "Cost Containment Plan",
        item_overrides: [
          { id: "b-venue", estimated_amount: 31500 },
          { id: "b-photography", estimated_amount: 8500 },
          { id: "b-decor", is_deleted: true },
        ],
        new_items: [
          {
            tempId: "new-entertainment-1",
            item_name: "Acoustic Sangeet Troupe",
            category: "Entertainment",
            estimated_amount: 6000,
          },
        ],
      }
    );

    // Venue was 31500
    // Catering remains 25000
    // Photography overridden to 8500
    // Decor removed (0)
    // New item added (+6000)
    // Hypothetical total = 31500 + 25000 + 8500 + 6000 = 71000
    expect(whatIfSimulation.scenarioSummary.totalEstimated).toBe(71000);
    // Baseline total was 85000. Delta = 71000 - 85000 = -14000
    expect(whatIfSimulation.deltaEstimatedTotal).toBe(-14000);
    // Projected savings = 14000
    expect(whatIfSimulation.projectedSavings).toBe(14000);

    // -------------------------------------------------------------
    // STAGE 5: Task Management & Vendor Checklist Filtering
    // -------------------------------------------------------------
    const taskRecords: TaskRow[] = [
      {
        id: "tsk-1",
        event_id: eventRecord.id,
        user_id: eventRecord.user_id,
        title: "Sign Venue Contract & Deposit",
        description: "Review sound curfew clause and confirm power generator backup.",
        due_date: "2027-02-15",
        status: "completed",
        priority: "urgent",
        is_vendor_checklist: true,
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "tsk-2",
        event_id: eventRecord.id,
        user_id: eventRecord.user_id,
        title: "Catering Menu Tasting Session",
        description: "Taste sample menu with primary families.",
        due_date: "2027-03-01",
        status: "in_progress",
        priority: "high",
        is_vendor_checklist: true,
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "tsk-3",
        event_id: eventRecord.id,
        user_id: eventRecord.user_id,
        title: "Family Sangeet Choreography Practice",
        description: "Coordinate weekend practice sessions.",
        due_date: "2027-05-10",
        status: "pending",
        priority: "medium",
        is_vendor_checklist: false,
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Filter vendor checklist tasks
    const vendorChecklist = taskRecords.filter((t) => t.is_vendor_checklist);
    expect(vendorChecklist.length).toBe(2);
    expect(vendorChecklist.every((t) => t.is_vendor_checklist)).toBe(true);

    // -------------------------------------------------------------
    // STAGE 6: Risk Radar Automated Assessment
    // -------------------------------------------------------------
    const assessment = evaluateEventRisks({
      event: eventRecord,
      budgetItems: initialBudgetItems,
      tasks: taskRecords,
      activePlanRevision: null,
      referenceTimestampMs: new Date("2027-01-15T00:00:00.000Z").getTime(),
    });

    // We have an actual budget overspend (87000 vs 85000 cap)
    const budgetOverrunRisk = assessment.risks.find(
      (r) => r.category === "budget_overrun"
    );
    expect(budgetOverrunRisk).toBeDefined();
    expect(budgetOverrunRisk?.severity).toBe("critical");

    // -------------------------------------------------------------
    // STAGE 7: RFC 4180 / CWE-1236 Sanitized Export Verification
    // -------------------------------------------------------------
    // Add potentially dangerous injection payloads into item names and descriptions
    const injectionBudgetItems: BudgetItemRow[] = [
      ...initialBudgetItems,
      {
        id: "b-malicious",
        event_id: eventRecord.id,
        user_id: eventRecord.user_id,
        category: "Security",
        item_name: "=cmd|' /C calc'!A0", // OWASP formula injection attempt
        estimated_amount: 1500,
        actual_amount: -500, // Legitimate negative value should NOT be sanitized as a formula
        notes: "+441234567890 Phone Number", // Starts with +
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const budgetCsv = generateBudgetCsv(injectionBudgetItems);

    // Verify CSV starts with Excel UTF-8 BOM
    expect(budgetCsv.startsWith("\uFEFF")).toBe(true);

    // Verify formula characters at start of string are escaped with single quote
    expect(budgetCsv).toContain("'=cmd");
    expect(budgetCsv).toContain("'+441234567890");

    // Verify legitimate numeric values are NOT prefixed with a quote
    expect(budgetCsv).toContain("-500.00");
    expect(budgetCsv).not.toContain("'-500.00");

    // Verify Tasks CSV generation
    const tasksCsv = generateTasksCsv(taskRecords);
    expect(tasksCsv.startsWith("\uFEFF")).toBe(true);
    expect(tasksCsv).toContain("Sign Venue Contract & Deposit");
    expect(tasksCsv).toContain("Vendor Checklist");
    expect(tasksCsv).toContain("Yes");
    expect(tasksCsv).toContain("No");

    // -------------------------------------------------------------
    // STAGE 8: Markdown Parsing & Formatting for Generated Blueprint
    // -------------------------------------------------------------
    const markdownContent = `## Executive Blueprint
- **Event:** ${eventRecord.name}
- **Target Date:** ${eventRecord.event_date}
- **Allocated Budget:** ₹${eventRecord.budget}

### Milestones
1. Book Royal Heritage Venue
2. Confirm Jaipur Culinary Masters tasting`;

    const parsedBlocks = parseMarkdownBlocks(markdownContent);
    expect(parsedBlocks.length).toBeGreaterThanOrEqual(4);

    const headingBlock = parsedBlocks.find((b) => b.type === "heading" && b.level === 2);
    expect(headingBlock).toBeDefined();
    expect(headingBlock?.text).toBe("Executive Blueprint");

    const bulletBlock = parsedBlocks.find((b) => b.type === "bullet-list");
    expect(bulletBlock).toBeDefined();
    expect(bulletBlock?.items?.length).toBe(3);

    const orderedBlock = parsedBlocks.find((b) => b.type === "ordered-list");
    expect(orderedBlock).toBeDefined();
    expect(orderedBlock?.items?.length).toBe(2);
  });
});
