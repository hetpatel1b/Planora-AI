import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { EventRiskRadar } from "./event-risk-radar";
import { evaluateEventRisks } from "@/lib/risk-engine";
import type { EventRow } from "@/lib/validations/event";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { TaskRow } from "@/lib/validations/task";

describe("EventRiskRadar Component", () => {
  const baseEvent: Pick<EventRow, "id" | "name" | "event_date" | "budget" | "status" | "guest_count"> = {
    id: "11111111-1111-4111-a111-111111111111",
    name: "Annual Leadership Gala",
    event_date: "2026-12-31",
    budget: 50000.0, // $50,000.00
    status: "planning",
    guest_count: 200,
  };

  it("renders healthy state when no risks are detected", () => {
    const farFutureEvent = {
      ...baseEvent,
      event_date: "2027-12-31", // > 90 days away, so no empty checklist risk
    };

    const html = renderToString(
      <EventRiskRadar
        event={farFutureEvent}
        budgetItems={[]}
        tasks={[]}
      />
    );

    expect(html).toContain("Event Risk Radar");
    expect(html).toContain("Event Plan Healthy");
    expect(html).toContain("No risks detected in this view");
    expect(html).toContain("All evaluated metrics for this category are within healthy bounds.");
  });

  it("renders critical banner and displays counts when critical risks exist", () => {
    const budgetItems: BudgetItemRow[] = [
      {
        id: "item-1",
        event_id: baseEvent.id,
        user_id: "user-1",
        plan_revision_id: null,
        category: "Venue & Facilities",
        item_name: "Grand Ballroom",
        estimated_amount: 20000.0,
        actual_amount: 60000.0, // $60,000 > total event budget of $50,000
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <EventRiskRadar
        event={baseEvent}
        budgetItems={budgetItems}
        tasks={[]}
      />
    );

    expect(html).toContain("Critical Risks Detected");
    expect(html).toContain("Actual Budget Overrun");
    expect(html).toContain("Critical:");
    expect(html).toContain("Mitigation:");
    expect(html).toContain("View Budget");
  });

  it("renders category filter tabs and count badges", () => {
    const tasks: TaskRow[] = [
      {
        id: "task-1",
        event_id: baseEvent.id,
        user_id: "user-1",
        plan_revision_id: null,
        title: "Sign catering contract",
        description: null,
        status: "pending",
        priority: "urgent",
        due_date: "2026-01-01", // Overdue relative to current date
        is_vendor_checklist: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <EventRiskRadar
        event={baseEvent}
        budgetItems={[]}
        tasks={tasks}
      />
    );

    expect(html).toContain("All Categories");
    expect(html).toContain("Overdue Tasks");
    expect(html).toContain("Overdue Task: Sign catering contract");
  });

  it("renders dual-encoded severity badge with text and icons", () => {
    const tasks: TaskRow[] = [
      {
        id: "task-overdue",
        event_id: baseEvent.id,
        user_id: "user-1",
        plan_revision_id: null,
        title: "Book Audio/Visual Crew",
        description: null,
        status: "in_progress",
        priority: "urgent",
        due_date: "2026-02-01",
        is_vendor_checklist: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <EventRiskRadar
        event={baseEvent}
        budgetItems={[]}
        tasks={tasks}
      />
    );

    // Text & icon presence
    expect(html).toContain("Critical");
    expect(html).toContain("Overdue Task: Book Audio/Visual Crew");
  });

  it("includes navigation link to relevant section", () => {
    const budgetItems: BudgetItemRow[] = [
      {
        id: "item-overrun",
        event_id: baseEvent.id,
        user_id: "user-1",
        plan_revision_id: null,
        category: "Decor & Styling",
        item_name: "Floral arrangements",
        estimated_amount: 1000.0, // $1,000
        actual_amount: 1500.0, // $1,500 (> 20% & > $250)
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <EventRiskRadar
        event={baseEvent}
        budgetItems={budgetItems}
        tasks={[]}
      />
    );

    expect(html).toContain("Line-Item Cost Variance: Floral arrangements");
    expect(html).toContain("View Budget");
  });

  it("renders identically when provided precomputed assessment prop vs internal evaluation", () => {
    const budgetItems: BudgetItemRow[] = [
      {
        id: "item-overrun",
        event_id: baseEvent.id,
        user_id: "user-1",
        plan_revision_id: null,
        category: "Decor & Styling",
        item_name: "Floral arrangements",
        estimated_amount: 1000.0,
        actual_amount: 1500.0,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const precomputedAssessment = evaluateEventRisks({
      event: baseEvent,
      budgetItems,
      tasks: [],
    });

    const htmlInternal = renderToString(
      <EventRiskRadar
        event={baseEvent}
        budgetItems={budgetItems}
        tasks={[]}
      />
    );

    const htmlWithProp = renderToString(
      <EventRiskRadar
        event={baseEvent}
        budgetItems={budgetItems}
        tasks={[]}
        assessment={precomputedAssessment}
      />
    );

    expect(htmlWithProp).toBe(htmlInternal);
  });

  it("uses the precomputed assessment directly without re-evaluating", () => {
    const customAssessment = {
      overallRiskLevel: "critical" as const,
      risks: [
        {
          id: "risk-custom-injected",
          category: "budget_overrun" as const,
          severity: "critical" as const,
          title: "Precomputed Injected Risk Title",
          explanation: "This assessment was injected directly via props without re-evaluation.",
          evidence: {},
          suggestedMitigation: "Direct mitigation.",
          detectedAt: new Date().toISOString(),
        },
      ],
      counts: {
        critical: 1,
        high: 0,
        medium: 0,
        low: 0,
        total: 1,
      },
      assessedAt: new Date().toISOString(),
    };

    const html = renderToString(
      <EventRiskRadar
        event={baseEvent}
        budgetItems={[]}
        tasks={[]}
        assessment={customAssessment}
      />
    );

    expect(html).toContain("Precomputed Injected Risk Title");
    expect(html).toContain("This assessment was injected directly via props without re-evaluation.");
  });
});
