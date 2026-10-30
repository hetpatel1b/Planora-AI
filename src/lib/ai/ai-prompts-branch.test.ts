import { describe, it, expect } from "vitest";
import {
  buildCopilotSystemPrompt,
  type CopilotEventContext,
} from "./copilot-prompt";
import {
  buildPlanGenerationMessages,
  parsePlanBlueprintResponse,
} from "./plan-prompt";
import type { EventPlanInput } from "@/lib/plan-generator";

describe("AI Prompts Edge Branch Coverage", () => {
  describe("copilot-prompt.ts branches", () => {
    it("handles whitespace-only text fields falling back to defaults", () => {
      const whitespaceContext: CopilotEventContext = {
        name: "   \t\n  ",
        eventType: "   ",
        location: "    ",
        preferences: "   ",
        constraints: "   ",
        culturalRequirements: "   ",
      };

      const prompt = buildCopilotSystemPrompt(whitespaceContext);
      expect(prompt).toContain("Event Name: Untitled Event");
      expect(prompt).toContain("Event Type: General Event");
      expect(prompt).toContain("Location: Location not specified");
      expect(prompt).not.toContain("Styling & Preferences:");
      expect(prompt).not.toContain("Operational Constraints:");
      expect(prompt).not.toContain("Cultural & Dietary Requirements:");
    });

    it("handles budget summary with missing categories and task summary with missing urgent tasks", () => {
      const context: CopilotEventContext = {
        name: "Gala 2026",
        eventType: "gala",
        budgetSummary: {
          targetBudget: 50000,
          totalEstimated: 45000,
          totalActual: 20000,
          variance: 5000,
          // categories missing/undefined
        },
        taskSummary: {
          totalTasks: 10,
          completedTasks: 5,
          pendingTasks: 5,
          vendorTasksCount: 4,
          completedVendorTasksCount: undefined, // nullish coalescing to 0
          // urgentOrHighTasks missing
        },
      };

      const prompt = buildCopilotSystemPrompt(context);
      expect(prompt).toContain("Target Budget: ₹50,000.00");
      expect(prompt).not.toContain("Top Category Allocations:");
      expect(prompt).toContain("Vendor Checklist: 0 of 4 vendor deliverables confirmed");
      expect(prompt).not.toContain("Urgent / High Priority Tasks:");
    });

    it("handles task summary urgent tasks without due dates", () => {
      const context: CopilotEventContext = {
        name: "Gala 2026",
        eventType: "gala",
        taskSummary: {
          totalTasks: 2,
          completedTasks: 0,
          pendingTasks: 2,
          urgentOrHighTasks: [
            {
              title: "Book Audio Engineer",
              priority: "high",
              dueDate: undefined, // test falsy dueDate branch
            },
          ],
        },
      };

      const prompt = buildCopilotSystemPrompt(context);
      expect(prompt).toContain("- [HIGH] Book Audio Engineer");
      expect(prompt).not.toContain("(Due:");
    });

    it("handles activePlanSummary with missing summary, empty themes, and non-number milestones", () => {
      const context: CopilotEventContext = {
        name: "Gala 2026",
        eventType: "gala",
        activePlanSummary: {
          summary: undefined as unknown as string,
          themes: [],
          milestonesCount: undefined as unknown as number,
        },
      };

      const prompt = buildCopilotSystemPrompt(context);
      expect(prompt).toContain("[Active Plan Blueprint]");
    });
  });

  describe("plan-prompt.ts branches", () => {
    const validEvent: EventPlanInput = {
      name: "Summit 2026",
      event_type: "conference",
      event_date: "2026-10-15T09:00:00.000Z",
      location: "San Francisco",
      budget: 50000,
      guest_count: 200,
    };

    const validBlueprintPayload = {
      summary: "Comprehensive operational plan designed for high engagement and execution fidelity.",
      themes: ["Innovation & Technology"],
      scheduleMilestones: [
        {
          title: "Venue reservation confirmed",
          timeframe: "3 months prior",
          description: "Finalize and deposit payment for main facility hall",
          suggested_date: null,
        },
      ],
      suggestedTasks: [
        {
          title: "Book Main Auditorium",
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
          item_name: "Auditorium Rental",
          estimated_amount: 15000.5,
          notes: "Full facility booking",
        },
      ],
      keyRecommendations: ["Early access for speakers"],
    };

    it("handles whitespace and empty inputs in buildPlanGenerationMessages", () => {
      const emptyEvent: EventPlanInput = {
        name: "   ",
        event_type: "   ",
        event_date: null,
        location: "   ",
        budget: "invalid-number" as unknown as number,
        guest_count: -5,
      };

      const messages = buildPlanGenerationMessages(emptyEvent);
      expect(messages[1].content).toContain("Event Name: Untitled Event");
      expect(messages[1].content).toContain("Event Type: general");
      expect(messages[1].content).toContain("Target Date: Not yet scheduled");
      expect(messages[1].content).toContain("Location / Venue Context: Location not specified");
      expect(messages[1].content).toContain("Target Budget: ₹0 (INR ₹)");
      expect(messages[1].content).toContain("Anticipated Guests: Unspecified");
    });

    it("rejects empty or whitespace-only rawContent in parsePlanBlueprintResponse", () => {
      const res = parsePlanBlueprintResponse("   \n\t  ", validEvent);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("AI response was empty.");
      }
    });

    it("handles code block extraction and outermost bracket search fallbacks", () => {
      // 1. Valid JSON inside markdown code fence
      const fenced = `
Here is your plan:
\`\`\`json
${JSON.stringify(validBlueprintPayload)}
\`\`\`
      `;
      const res1 = parsePlanBlueprintResponse(fenced, validEvent);
      expect(res1.success).toBe(true);

      // 2. Valid JSON embedded in conversational prose without code fences
      const conversational = `Certainly! Here is the plan: ${JSON.stringify(validBlueprintPayload)} Let me know if you need changes.`;
      const res2 = parsePlanBlueprintResponse(conversational, validEvent);
      expect(res2.success).toBe(true);
    });

    it("fails when no valid JSON brackets exist in the response", () => {
      const res = parsePlanBlueprintResponse("Just plain text with no braces at all", validEvent);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("Could not extract valid JSON from AI response.");
      }
    });

    it("coerces string and missing estimated_amount in proposedBudgetItems", () => {
      const raw = JSON.stringify({
        ...validBlueprintPayload,
        proposedBudgetItems: [
          {
            category: "Venue",
            item_name: "Grand Ballroom",
            estimated_amount: "15000.50",
          },
          {
            category: "Catering",
            item_name: "Buffet Dinner",
            estimated_amount: 0,
          },
        ],
      });

      const res = parsePlanBlueprintResponse(raw, validEvent);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.blueprint.proposedBudgetItems[0].estimated_amount).toBe(15000.5);
        expect(res.blueprint.proposedBudgetItems[1].estimated_amount).toBe(0);
      }
    });

    it("returns schema error summary when candidate object violates schema requirements", () => {
      const raw = JSON.stringify({
        summary: "Too short", // Violates min length (10 chars)
        scheduleMilestones: "invalid-type",
      });

      const res = parsePlanBlueprintResponse(raw, validEvent);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain("AI plan failed schema validation");
      }
    });
  });
});
