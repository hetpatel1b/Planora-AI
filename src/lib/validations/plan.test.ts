import { describe, it, expect } from "vitest";
import { extractPlanBlueprint, aiPlanBlueprintSchema } from "./plan";

describe("plan validations", () => {
  describe("extractPlanBlueprint", () => {
    it("returns null for null, undefined, or missing revision", () => {
      expect(extractPlanBlueprint(null)).toBeNull();
      expect(extractPlanBlueprint(undefined)).toBeNull();
      expect(extractPlanBlueprint({})).toBeNull();
      expect(extractPlanBlueprint({ structured_plan: null })).toBeNull();
      expect(extractPlanBlueprint({ structured_plan: undefined })).toBeNull();
    });

    it("returns null when structured_plan is not an object or is an array", () => {
      expect(extractPlanBlueprint({ structured_plan: "invalid" })).toBeNull();
      expect(extractPlanBlueprint({ structured_plan: 12345 })).toBeNull();
      expect(extractPlanBlueprint({ structured_plan: ["item1", "item2"] })).toBeNull();
    });

    it("returns the blueprint object when structured_plan is a valid object", () => {
      const mockBlueprint = {
        summary: "Tech Conference Planning Blueprint",
        themes: ["Modern", "Tech"],
        keyRecommendations: ["Book venue early"],
        scheduleMilestones: [],
        suggestedTasks: [],
        proposedBudgetItems: [],
      };

      const revision = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        event_id: "123e4567-e89b-12d3-a456-426614174001",
        user_id: "123e4567-e89b-12d3-a456-426614174002",
        revision_number: 1,
        summary: "Initial Plan",
        is_active: true,
        created_at: "2026-10-30T00:00:00.000Z",
        structured_plan: mockBlueprint,
      };

      const result = extractPlanBlueprint(revision);
      expect(result).toEqual(mockBlueprint);
      expect(result?.summary).toBe("Tech Conference Planning Blueprint");
      expect(result?.themes).toEqual(["Modern", "Tech"]);
    });
  });

  describe("aiPlanBlueprintSchema", () => {
    it("validates a compliant blueprint payload", () => {
      const valid = {
        summary: "Comprehensive event blueprint designed for high engagement and execution fidelity.",
        themes: ["Cutting-edge AI", "Cloud Infrastructure"],
        scheduleMilestones: [
          {
            title: "Venue finalized",
            timeframe: "3 months before",
            description: "Finalize and deposit payment for the conference venue",
            suggested_date: null,
          },
        ],
        suggestedTasks: [
          {
            title: "Reserve Main Auditorium",
            priority: "urgent" as const,
            category: "Venue",
            is_vendor_checklist: true,
            suggested_days_before: 90,
            description: null,
          },
        ],
        proposedBudgetItems: [
          {
            category: "Venue",
            item_name: "Venue Rental Fee",
            estimated_amount: 15000,
            notes: "Main stage and breakout rooms",
          },
        ],
        keyRecommendations: ["Early bird registration opening"],
        metadata: {
          source: "ai" as const,
          model: "groq-llama-3.3-70b",
          generatedAt: new Date().toISOString(),
          promptSummary: "Corporate tech summit",
        },
      };

      const parsed = aiPlanBlueprintSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });
  });
});
