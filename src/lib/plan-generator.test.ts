import { describe, it, expect } from "vitest";
import { generateEventPlan, type EventPlanInput } from "./plan-generator";
import { aiPlanBlueprintSchema } from "@/lib/validations/plan";

describe("plan-generator", () => {
  const FIXED_REF_DATE = new Date("2026-06-01T12:00:00.000Z");

  // All 7 supported classifications in the TEMPLATES map, plus generic fallback
  const supportedTypes = [
    { type: "wedding", expectedCategory: "Wedding & Reception" },
    { type: "conference", expectedCategory: "Conference & Summit" },
    { type: "corporate", expectedCategory: "Corporate Offsite & Summit" },
    { type: "gala", expectedCategory: "Gala & Fundraiser" },
    { type: "social", expectedCategory: "Social Celebration & Birthday Party" },
    { type: "meetup", expectedCategory: "Community Meetup & Workshop" },
    { type: "exhibition", expectedCategory: "Exhibition & Trade Show" },
    { type: "custom-unmapped-type", expectedCategory: "Special Event" }, // generic template category is "Special Event"
  ];

  describe("supported event classifications", () => {
    for (const { type, expectedCategory } of supportedTypes) {
      it(`generates a valid schema-compliant blueprint for classification: '${type}'`, () => {
        const input: EventPlanInput = {
          name: `Sample ${type} Event`,
          event_type: type,
          event_date: "2026-12-15",
          location: "Metropolitan Hall",
          guest_count: 150,
          budget: 25000,
          preferences: "Elegant and streamlined",
          constraints: "Strict 11 PM venue curfew",
          cultural_requirements: "Kosher catering options required",
        };

        const plan = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });

        // Must validate against official Zod schema
        const parseResult = aiPlanBlueprintSchema.safeParse(plan);
        expect(parseResult.success).toBe(true);

        expect(plan.summary).toContain(input.name);
        expect(plan.themes.length).toBeGreaterThan(0);
        expect(plan.scheduleMilestones.length).toBeGreaterThan(0);
        expect(plan.suggestedTasks.length).toBeGreaterThan(0);
        expect(plan.proposedBudgetItems.length).toBeGreaterThan(0);
        expect(plan.keyRecommendations.length).toBeGreaterThan(0);
        expect(plan.metadata.source).toBe("deterministic");
        expect(plan.metadata.promptSummary).toContain(expectedCategory);
      });
    }
  });

  describe("determinism and stability", () => {
    it("produces identical output for identical inputs and reference dates", () => {
      const input: EventPlanInput = {
        name: "Annual Developer Summit",
        event_type: "conference",
        event_date: "2026-11-20",
        budget: 50000,
        guest_count: 300,
      };

      const planA = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });
      const planB = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });

      expect(planA).toEqual(planB);
    });
  });

  describe("budget allocation arithmetic and rounding", () => {
    it("allocates budget items such that their exact sum matches the target budget", () => {
      const input: EventPlanInput = {
        name: "Corporate Gala",
        event_type: "gala",
        event_date: "2026-10-01",
        budget: 33333.33, // tricky decimal amount with fractional cent distribution
      };

      const plan = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });

      const sumInCents = plan.proposedBudgetItems.reduce((acc, item) => {
        return acc + Math.round(item.estimated_amount * 100);
      }, 0);

      const targetInCents = Math.round(33333.33 * 100);
      expect(sumInCents).toBe(targetInCents);

      // Verify each item is rounded to 2 decimals
      for (const item of plan.proposedBudgetItems) {
        expect(Number(item.estimated_amount.toFixed(2))).toBe(item.estimated_amount);
        expect(item.estimated_amount).toBeGreaterThanOrEqual(0);
      }
    });

    it("handles zero target budget ($0.00) without negative numbers or division errors", () => {
      const input: EventPlanInput = {
        name: "Free Community Meetup",
        event_type: "meetup",
        budget: 0,
      };

      const plan = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });

      for (const item of plan.proposedBudgetItems) {
        expect(item.estimated_amount).toBe(0);
        expect(item.notes).toContain("Estimated cost pending quote or target budget allocation.");
      }
    });

    it("handles null and negative budgets gracefully by flooring to 0", () => {
      const inputNegative: EventPlanInput = {
        name: "Negative Budget Event",
        event_type: "social",
        budget: -5000,
      };

      const plan = generateEventPlan(inputNegative, { referenceDate: FIXED_REF_DATE });
      const totalAllocated = plan.proposedBudgetItems.reduce((sum, item) => sum + item.estimated_amount, 0);
      expect(totalAllocated).toBe(0);

      const inputNull: EventPlanInput = {
        name: "Null Budget Event",
        event_type: "social",
        budget: null,
      };

      const planNull = generateEventPlan(inputNull, { referenceDate: FIXED_REF_DATE });
      expect(planNull.summary).toContain("budget parameters are finalized");
    });
  });

  describe("timeline milestones and date boundary handling", () => {
    it("suggests milestone dates in chronological progression before the event date", () => {
      const input: EventPlanInput = {
        name: "Future Wedding",
        event_type: "wedding",
        event_date: "2027-06-01",
      };

      const plan = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });

      for (const milestone of plan.scheduleMilestones) {
        expect(milestone.suggested_date).toBeDefined();
        if (milestone.suggested_date) {
          // Must not exceed event date
          expect(new Date(milestone.suggested_date).getTime()).toBeLessThanOrEqual(
            new Date(input.event_date!).getTime()
          );
          // Must not precede reference date
          expect(new Date(milestone.suggested_date).getTime()).toBeGreaterThanOrEqual(
            FIXED_REF_DATE.getTime()
          );
        }
      }
    });

    it("handles event dates in the past or on the same day by anchoring to the event date", () => {
      const pastInput: EventPlanInput = {
        name: "Past Event",
        event_type: "meetup",
        event_date: "2026-01-01", // before FIXED_REF_DATE 2026-06-01
      };

      const plan = generateEventPlan(pastInput, { referenceDate: FIXED_REF_DATE });

      for (const milestone of plan.scheduleMilestones) {
        expect(milestone.suggested_date).toBe("2026-01-01");
      }
    });

    it("handles leap-year event date (2028-02-29) correctly", () => {
      const leapInput: EventPlanInput = {
        name: "Leap Day Gala",
        event_type: "gala",
        event_date: "2028-02-29",
      };

      const plan = generateEventPlan(leapInput, {
        referenceDate: new Date("2027-02-28T12:00:00Z"),
      });

      expect(plan.scheduleMilestones.length).toBeGreaterThan(0);
      const eventDayMilestone = plan.scheduleMilestones.find((m) => m.timeframe === "Event Day");
      expect(eventDayMilestone?.suggested_date).toBe("2028-02-29");
    });

    it("returns null suggested_date when event_date is missing or invalid", () => {
      const noDateInput: EventPlanInput = {
        name: "Unscheduled Event",
        event_type: "corporate",
        event_date: null,
      };

      const plan = generateEventPlan(noDateInput, { referenceDate: FIXED_REF_DATE });

      for (const milestone of plan.scheduleMilestones) {
        expect(milestone.suggested_date).toBeNull();
      }

      const invalidDateInput: EventPlanInput = {
        name: "Invalid Date Event",
        event_type: "corporate",
        event_date: "not-a-valid-date",
      };

      const planInvalid = generateEventPlan(invalidDateInput, { referenceDate: FIXED_REF_DATE });
      for (const milestone of planInvalid.scheduleMilestones) {
        expect(milestone.suggested_date).toBeNull();
      }
    });
  });

  describe("contextual recommendations and scale adaptation", () => {
    it("adds high-volume registration and beverage recommendation when guest_count >= 200", () => {
      const input: EventPlanInput = {
        name: "Large Exhibition",
        event_type: "exhibition",
        guest_count: 500,
      };

      const plan = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });
      const rec = plan.keyRecommendations.find((r) => r.includes("500 attendees anticipated"));
      expect(rec).toBeDefined();
      expect(rec).toContain("zoned registration");
    });

    it("adds intimate single-table recommendation when guest_count <= 30", () => {
      const input: EventPlanInput = {
        name: "Intimate Dinner",
        event_type: "social",
        guest_count: 20,
      };

      const plan = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });
      const rec = plan.keyRecommendations.find((r) => r.includes("intimate group of 20 guests"));
      expect(rec).toBeDefined();
      expect(rec).toContain("single-table seating");
    });

    it("incorporates cultural requirements and constraints into recommendations and summary", () => {
      const input: EventPlanInput = {
        name: "Multi-faith Gathering",
        event_type: "social",
        cultural_requirements: "Halal certified food only",
        constraints: "Loading dock closes at 3 PM",
        preferences: "Mid-century modern aesthetic",
      };

      const plan = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });

      expect(plan.summary).toContain("Mid-century modern aesthetic");
      expect(plan.summary).toContain("Loading dock closes at 3 PM");

      const culturalRec = plan.keyRecommendations.find((r) => r.includes("Halal certified food only"));
      expect(culturalRec).toBeDefined();

      const constraintRec = plan.keyRecommendations.find((r) => r.includes("Loading dock closes at 3 PM"));
      expect(constraintRec).toBeDefined();
    });

    it("bounds recommendations count to at most 10 items conforming to schema", () => {
      const input: EventPlanInput = {
        name: "Exhibition",
        event_type: "exhibition",
        guest_count: 500,
        cultural_requirements: "Cultural needs",
        constraints: "Venue constraints",
      };

      const plan = generateEventPlan(input, { referenceDate: FIXED_REF_DATE });
      expect(plan.keyRecommendations.length).toBeLessThanOrEqual(10);
    });
  });
});
