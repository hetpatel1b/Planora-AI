import { describe, it, expect } from "vitest";
import {
  scenarioItemOverrideSchema,
  scenarioNewItemSchema,
  applyBudgetScenarioInputSchema,
} from "@/lib/validations/simulator";

describe("Simulator Validations", () => {
  const validUUID = "a1111111-b222-4333-8444-c55555555555";
  const validUUID2 = "b2222222-c333-4444-8555-d66666666666";

  describe("scenarioItemOverrideSchema", () => {
    it("validates valid estimated_amount modification", () => {
      const res = scenarioItemOverrideSchema.safeParse({
        id: validUUID,
        estimated_amount: 1500.5,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe(validUUID);
        expect(res.data.estimated_amount).toBe(1500.5);
        expect(res.data.is_deleted).toBe(false);
      }
    });

    it("validates valid item deletion", () => {
      const res = scenarioItemOverrideSchema.safeParse({
        id: validUUID,
        is_deleted: true,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.is_deleted).toBe(true);
      }
    });

    it("rejects invalid UUID item ID", () => {
      const res = scenarioItemOverrideSchema.safeParse({
        id: "not-a-uuid",
        estimated_amount: 100,
      });
      expect(res.success).toBe(false);
    });

    it("rejects negative amounts", () => {
      const res = scenarioItemOverrideSchema.safeParse({
        id: validUUID,
        estimated_amount: -50,
      });
      expect(res.success).toBe(false);
    });

    it("rejects more than 2 decimal places", () => {
      const res = scenarioItemOverrideSchema.safeParse({
        id: validUUID,
        estimated_amount: 100.999,
      });
      expect(res.success).toBe(false);
    });

    it("rejects empty override with no modifications and is_deleted=false", () => {
      const res = scenarioItemOverrideSchema.safeParse({
        id: validUUID,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("scenarioNewItemSchema", () => {
    it("validates a complete new candidate expense item", () => {
      const res = scenarioNewItemSchema.safeParse({
        tempId: "temp-shuttle-1",
        category: "Logistics & Rentals",
        item_name: "Guest Shuttle Bus",
        estimated_amount: 850.0,
        actual_amount: 0,
        notes: "Charter service for 50 guests",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.item_name).toBe("Guest Shuttle Bus");
        expect(res.data.estimated_amount).toBe(850.0);
      }
    });

    it("rejects new item missing estimated_amount", () => {
      const res = scenarioNewItemSchema.safeParse({
        tempId: "temp-item-2",
        category: "Decor & Styling",
        item_name: "Floral Arch",
      });
      expect(res.success).toBe(false);
    });

    it("rejects empty category or item_name", () => {
      const res = scenarioNewItemSchema.safeParse({
        tempId: "temp-3",
        category: "   ",
        item_name: "",
        estimated_amount: 200,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("applyBudgetScenarioInputSchema", () => {
    it("accepts a valid scenario application payload", () => {
      const payload = {
        eventId: validUUID,
        scenarioName: "Negotiated Venue Discount",
        target_budget: 12000,
        item_overrides: [
          {
            id: validUUID2,
            estimated_amount: 4200,
          },
        ],
        new_items: [
          {
            tempId: "temp-decor-1",
            category: "Decor & Styling",
            item_name: "Ambient Lighting",
            estimated_amount: 600,
          },
        ],
      };

      const res = applyBudgetScenarioInputSchema.safeParse(payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.eventId).toBe(validUUID);
        expect(res.data.item_overrides.length).toBe(1);
        expect(res.data.new_items.length).toBe(1);
      }
    });

    it("rejects duplicate item overrides for the same budget item ID", () => {
      const payload = {
        eventId: validUUID,
        item_overrides: [
          { id: validUUID2, estimated_amount: 500 },
          { id: validUUID2, estimated_amount: 600 },
        ],
      };

      const res = applyBudgetScenarioInputSchema.safeParse(payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("Duplicate item override"))).toBe(true);
      }
    });

    it("rejects duplicate temporary IDs in new items", () => {
      const payload = {
        eventId: validUUID,
        new_items: [
          {
            tempId: "temp-same-id",
            category: "Other",
            item_name: "Item 1",
            estimated_amount: 100,
          },
          {
            tempId: "temp-same-id",
            category: "Other",
            item_name: "Item 2",
            estimated_amount: 200,
          },
        ],
      };

      const res = applyBudgetScenarioInputSchema.safeParse(payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("Duplicate temporary ID"))).toBe(true);
      }
    });

    it("rejects empty no-op scenario with zero changes", () => {
      const payload = {
        eventId: validUUID,
        item_overrides: [],
        new_items: [],
      };

      const res = applyBudgetScenarioInputSchema.safeParse(payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(
          res.error.issues.some((i) =>
            i.message.includes("Scenario contains no modifications")
          )
        ).toBe(true);
      }
    });

    it("rejects unknown extra properties (strict mode prevents untrusted totals injection)", () => {
      const payload = {
        eventId: validUUID,
        item_overrides: [{ id: validUUID2, estimated_amount: 300 }],
        untrustedClaimedTotal: 100, // Client attempting to claim forged total
        untrustedClaimedSavings: 5000,
      };

      const res = applyBudgetScenarioInputSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });

    it("rejects invalid event UUID", () => {
      const payload = {
        eventId: "not-a-valid-uuid",
        target_budget: 10000,
      };

      const res = applyBudgetScenarioInputSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });
  });
});
