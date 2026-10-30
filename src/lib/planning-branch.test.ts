import { describe, it, expect } from "vitest";
import { generateEventPlan, type EventPlanInput } from "./plan-generator";
import { evaluateEventRisks } from "./risk-engine";
import type { EventRow } from "./validations/event";
import type { TaskRow } from "./validations/task";

describe("Planning & Risk Engine Edge Branch Coverage", () => {
  describe("plan-generator.ts edge branches", () => {
    it("handles unbroken text in truncateExcerpt and guest count without location", () => {
      const longUnbrokenText = "A".repeat(500); // No spaces to break on
      const input: EventPlanInput = {
        name: "Gala Event",
        event_type: "gala",
        guest_count: 500,
        // location omitted to trigger guest-count-only branch in buildEventSummary
        location: null,
        budget: 100000,
        preferences: longUnbrokenText,
      };

      const plan = generateEventPlan(input);
      expect(plan.summary).toContain("The gathering is planned to host approximately 500 attendees.");
      expect(plan.summary).toContain("A".repeat(50));
      expect(plan.summary.length).toBeLessThanOrEqual(2000);
    });

    it("handles fallback to generic template for unknown event type and zero budget", () => {
      const input: EventPlanInput = {
        name: "Mysterious Space Gathering",
        event_type: "unrecognized_custom_alien_gathering",
        budget: 0,
        guest_count: 0,
        event_date: null,
      };

      const plan = generateEventPlan(input);
      expect(plan.themes).toBeDefined();
      expect(plan.scheduleMilestones.length).toBeGreaterThan(0);
      expect(plan.suggestedTasks.length).toBeGreaterThan(0);
      // All budget items should have 0 estimated_amount
      expect(plan.proposedBudgetItems.every((b) => b.estimated_amount === 0)).toBe(true);
    });

    it("enforces 2000 character maximum ceiling when summary text is exceptionally large", () => {
      // Name under 400 characters to respect metadata.promptSummary schema <= 500
      const longName = "Grand International Royal Gala ".repeat(12).trim(); // ~380 chars
      const longLocation = "Historic Heritage Palace Grounds, Northern Wing, Rajasthan, India ".repeat(8).trim(); // ~520 chars
      const longPreferences = "Exclusive orchestral arrangements, bespoke floral sculptures ".repeat(10); // ~600 chars
      const longConstraints = "Strict heritage preservation zoning, silent fireworks only ".repeat(10); // ~600 chars

      const input: EventPlanInput = {
        name: longName,
        event_type: "wedding",
        budget: 250000,
        guest_count: 800,
        location: longLocation,
        preferences: longPreferences,
        constraints: longConstraints,
      };

      const plan = generateEventPlan(input);
      expect(plan.summary.length).toBeLessThanOrEqual(2000);
      expect(plan.summary.endsWith("…")).toBe(true);
    });
  });

  describe("risk-engine.ts edge branches", () => {
    const baseEvent: EventRow = {
      id: "ev-1",
      user_id: "user-1",
      name: "Corporate Offsite",
      event_type: "offsite",
      event_date: null, // Test null event_date branch
      location: null,
      guest_count: 50,
      budget: null as unknown as number, // Test null budget branch
      preferences: null,
      constraints: null,
      cultural_requirements: null,
      status: "planning",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    };

    it("evaluates risks when event_date and budget are null without throwing", () => {
      const assessment = evaluateEventRisks({
        event: baseEvent,
        budgetItems: [],
        tasks: [],
      });

      expect(assessment.risks).toBeDefined();
      expect(assessment.overallRiskLevel).toBeDefined();
      expect(assessment.counts.total).toBe(assessment.risks.length);
    });

    it("triggers medium severity for imminent pending task with low priority", () => {
      const refTime = new Date("2026-11-01T12:00:00.000Z").getTime();
      const taskDueSoon: TaskRow = {
        id: "task-soon-low",
        event_id: baseEvent.id,
        user_id: "user-1",
        plan_revision_id: null,
        title: "Print Name Badges",
        description: null,
        due_date: "2026-11-02T10:00:00.000Z", // Due in 22 hours (< 48h)
        priority: "low", // Low priority branch -> severity "medium"
        status: "pending",
        is_vendor_checklist: false,
        created_at: "2026-10-20T00:00:00Z",
        updated_at: "2026-10-20T00:00:00Z",
      };

      const assessment = evaluateEventRisks({
        event: {
          ...baseEvent,
          event_date: "2026-11-15T00:00:00.000Z",
        },
        budgetItems: [],
        tasks: [taskDueSoon],
        referenceTimestampMs: refTime,
      });

      const imminentRisk = assessment.risks.find(
        (r) => r.category === "at_risk_tasks" && r.relatedItemId === "task-soon-low"
      );
      expect(imminentRisk).toBeDefined();
      expect(imminentRisk?.severity).toBe("medium");
    });

    it("triggers missing checklist risk for upcoming event with event date", () => {
      const refTime = new Date("2026-11-01T12:00:00.000Z").getTime();
      const upcomingEvent: EventRow = {
        ...baseEvent,
        event_date: "2026-11-10T18:00:00.000Z",
      };

      const assessment = evaluateEventRisks({
        event: upcomingEvent,
        budgetItems: [],
        tasks: [], // No tasks
        referenceTimestampMs: refTime,
      });

      const missingChecklist = assessment.risks.find(
        (r) => r.category === "missing_checklist" && r.id === "risk-missing-checklist-empty"
      );
      expect(missingChecklist).toBeDefined();
      expect(missingChecklist?.explanation).toContain("days away");
    });
  });
});
