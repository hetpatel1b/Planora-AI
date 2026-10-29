import { describe, it, expect } from "vitest";
import { normalizeEventType, TEMPLATES } from "./plan-templates";
import { TASK_PRIORITIES } from "@/lib/validations/task";

describe("plan-templates", () => {
  describe("normalizeEventType", () => {
    it("maps keywords correctly to supported event template keys", () => {
      expect(normalizeEventType("wedding")).toBe("wedding");
      expect(normalizeEventType("Royal Wedding & Reception")).toBe("wedding");
      expect(normalizeEventType("Global AI Conference")).toBe("conference");
      expect(normalizeEventType("Tech Summit 2026")).toBe("conference");
      expect(normalizeEventType("Corporate Offsite")).toBe("corporate");
      expect(normalizeEventType("Quarterly Team Meeting")).toBe("corporate");
      expect(normalizeEventType("Charity Gala")).toBe("gala");
      expect(normalizeEventType("Fundraising Dinner")).toBe("gala");
      expect(normalizeEventType("50th Birthday Party")).toBe("birthday");
      expect(normalizeEventType("Kid's Birthday Celebration")).toBe("birthday");
      expect(normalizeEventType("Community Cultural Fair")).toBe("community");
      expect(normalizeEventType("Neighborhood Block Party")).toBe("community");
      expect(normalizeEventType("Civic Gathering")).toBe("community");
      expect(normalizeEventType("Anniversary Dinner")).toBe("social");
      expect(normalizeEventType("Developer Meetup")).toBe("meetup");
      expect(normalizeEventType("Workshop & Training")).toBe("meetup");
      expect(normalizeEventType("Art Exhibition")).toBe("exhibition");
      expect(normalizeEventType("Trade Expo")).toBe("exhibition");
    });

    it("falls back to generic for unknown event types", () => {
      expect(normalizeEventType("Unknown Custom Gathering")).toBe("generic");
      expect(normalizeEventType("")).toBe("generic");
      expect(normalizeEventType("   ")).toBe("generic");
    });
  });

  describe("TEMPLATES integrity", () => {
    const requiredKeys = [
      "wedding",
      "birthday",
      "community",
      "conference",
      "corporate",
      "gala",
      "social",
      "meetup",
      "exhibition",
      "generic",
    ];

    it("defines all expected event category templates", () => {
      for (const key of requiredKeys) {
        expect(TEMPLATES[key]).toBeDefined();
        expect(TEMPLATES[key].category).toBeTruthy();
        expect(TEMPLATES[key].themes.length).toBeGreaterThan(0);
        expect(TEMPLATES[key].milestones.length).toBeGreaterThan(0);
        expect(TEMPLATES[key].tasks.length).toBeGreaterThan(0);
        expect(TEMPLATES[key].budgetDistribution.length).toBeGreaterThan(0);
        expect(TEMPLATES[key].recommendations.length).toBeGreaterThan(0);
      }
    });

    it("ensures all task priorities are strictly valid", () => {
      for (const [, template] of Object.entries(TEMPLATES)) {
        for (const task of template.tasks) {
          expect(TASK_PRIORITIES).toContain(task.priority);
          expect(task.title).toBeTruthy();
          expect(task.category).toBeTruthy();
          expect(task.daysBefore).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("ensures all budget ratios sum to 100 for each template", () => {
      for (const [, template] of Object.entries(TEMPLATES)) {
        const totalRatio = template.budgetDistribution.reduce(
          (acc, item) => acc + item.ratio,
          0
        );
        expect(totalRatio).toBe(100);
      }
    });
  });
});
