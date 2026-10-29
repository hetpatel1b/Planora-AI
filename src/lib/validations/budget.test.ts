import { describe, it, expect } from "vitest";
import {
  budgetItemIdSchema,
  eventIdSchema,
  categorySchema,
  itemNameSchema,
  currencyAmountSchema,
  createBudgetItemSchema,
  updateBudgetItemSchema,
  BUDGET_CATEGORIES,
} from "./budget";

describe("budget validations", () => {
  describe("constants", () => {
    it("exports all standard budget category presets", () => {
      expect(BUDGET_CATEGORIES).toContain("Venue & Facilities");
      expect(BUDGET_CATEGORIES).toContain("Catering & Bar");
      expect(BUDGET_CATEGORIES).toContain("Decor & Styling");
      expect(BUDGET_CATEGORIES).toContain("Entertainment & AV");
      expect(BUDGET_CATEGORIES).toContain("Photography & Video");
      expect(BUDGET_CATEGORIES).toContain("Logistics & Rentals");
      expect(BUDGET_CATEGORIES).toContain("Staffing & Security");
      expect(BUDGET_CATEGORIES).toContain("Marketing & Collateral");
      expect(BUDGET_CATEGORIES).toContain("Favors & Gifts");
      expect(BUDGET_CATEGORIES).toContain("Contingency");
      expect(BUDGET_CATEGORIES).toContain("Other");
    });
  });

  describe("ID schemas", () => {
    it("validates well-formed UUIDs for budgetItemIdSchema", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      expect(budgetItemIdSchema.parse(validUuid)).toBe(validUuid);
    });

    it("rejects non-UUID strings for budgetItemIdSchema", () => {
      expect(budgetItemIdSchema.safeParse("not-a-uuid").success).toBe(false);
      expect(budgetItemIdSchema.safeParse("").success).toBe(false);
    });

    it("validates well-formed UUIDs for eventIdSchema", () => {
      const validUuid = "223e4567-e89b-12d3-a456-426614174001";
      expect(eventIdSchema.parse(validUuid)).toBe(validUuid);
    });

    it("rejects non-UUID strings for eventIdSchema", () => {
      expect(eventIdSchema.safeParse("invalid-event-id").success).toBe(false);
      expect(eventIdSchema.safeParse(null).success).toBe(false);
    });
  });

  describe("categorySchema", () => {
    it("accepts valid category names and trims whitespace", () => {
      expect(categorySchema.parse("Venue & Facilities")).toBe("Venue & Facilities");
      expect(categorySchema.parse("  Custom Category  ")).toBe("Custom Category");
    });

    it("rejects empty or whitespace-only category", () => {
      const resEmpty = categorySchema.safeParse("");
      expect(resEmpty.success).toBe(false);
      if (!resEmpty.success) {
        expect(resEmpty.error.issues[0].message).toContain("Category is required");
      }

      const resWhitespace = categorySchema.safeParse("   ");
      expect(resWhitespace.success).toBe(false);
    });

    it("rejects categories exceeding 100 characters", () => {
      const resLong = categorySchema.safeParse("C".repeat(101));
      expect(resLong.success).toBe(false);
      if (!resLong.success) {
        expect(resLong.error.issues[0].message).toContain("must not exceed 100 characters");
      }
    });

    it("accepts category at boundaries (1 and 100 chars)", () => {
      expect(categorySchema.safeParse("C").success).toBe(true);
      expect(categorySchema.safeParse("C".repeat(100)).success).toBe(true);
    });
  });

  describe("itemNameSchema", () => {
    it("accepts valid item names and trims whitespace", () => {
      expect(itemNameSchema.parse("Main Ballroom Deposit")).toBe("Main Ballroom Deposit");
      expect(itemNameSchema.parse("  Sound System Rental  ")).toBe("Sound System Rental");
    });

    it("rejects empty or whitespace-only item name", () => {
      const resEmpty = itemNameSchema.safeParse("");
      expect(resEmpty.success).toBe(false);
      if (!resEmpty.success) {
        expect(resEmpty.error.issues[0].message).toContain("Item name is required");
      }

      const resWhitespace = itemNameSchema.safeParse("   ");
      expect(resWhitespace.success).toBe(false);
    });

    it("rejects item names exceeding 150 characters", () => {
      const resLong = itemNameSchema.safeParse("I".repeat(151));
      expect(resLong.success).toBe(false);
      if (!resLong.success) {
        expect(resLong.error.issues[0].message).toContain("must not exceed 150 characters");
      }
    });

    it("accepts item name at boundaries (1 and 150 chars)", () => {
      expect(itemNameSchema.safeParse("I").success).toBe(true);
      expect(itemNameSchema.safeParse("I".repeat(150)).success).toBe(true);
    });
  });

  describe("currencyAmountSchema in budget context", () => {
    it("accepts valid non-negative numbers and numeric strings", () => {
      expect(currencyAmountSchema.parse(5000)).toBe(5000);
      expect(currencyAmountSchema.parse("250.75")).toBe(250.75);
      expect(currencyAmountSchema.parse(0)).toBe(0);
    });

    it("maps empty strings, whitespace, and null to 0 for form compatibility", () => {
      expect(currencyAmountSchema.parse("")).toBe(0);
      expect(currencyAmountSchema.parse("   ")).toBe(0);
      expect(currencyAmountSchema.parse(null)).toBe(0);
    });

    it("preserves undefined when omitted", () => {
      expect(currencyAmountSchema.parse(undefined)).toBeUndefined();
    });

    it("rejects negative amounts", () => {
      const res = currencyAmountSchema.safeParse(-50);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot be negative");
      }
    });

    it("rejects amounts with more than 2 decimal places", () => {
      const res = currencyAmountSchema.safeParse(12.345);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot have more than 2 decimal places");
      }
    });

    it("rejects amounts exceeding 9,999,999,999.99 ceiling", () => {
      const res = currencyAmountSchema.safeParse(10_000_000_000);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 9,999,999,999.99");
      }
    });

    it("accepts boundary amount 9,999,999,999.99", () => {
      expect(currencyAmountSchema.parse(9_999_999_999.99)).toBe(9_999_999_999.99);
    });

    it("rejects non-numeric strings, NaN, and Infinity", () => {
      expect(currencyAmountSchema.safeParse("free").success).toBe(false);
      expect(currencyAmountSchema.safeParse(NaN).success).toBe(false);
      expect(currencyAmountSchema.safeParse(Infinity).success).toBe(false);
    });
  });

  describe("createBudgetItemSchema", () => {
    const validPayload = {
      category: "Catering & Bar",
      item_name: "Five-Course Plated Dinner",
      estimated_amount: 12500,
      actual_amount: 11800,
      notes: "Tasting scheduled for next Tuesday",
    };

    it("successfully parses valid budget item creation payload", () => {
      const parsed = createBudgetItemSchema.parse(validPayload);
      expect(parsed.category).toBe("Catering & Bar");
      expect(parsed.item_name).toBe("Five-Course Plated Dinner");
      expect(parsed.estimated_amount).toBe(12500);
      expect(parsed.actual_amount).toBe(11800);
      expect(parsed.notes).toBe("Tasting scheduled for next Tuesday");
    });

    it("applies default values for estimated_amount, actual_amount, and notes when omitted", () => {
      const parsed = createBudgetItemSchema.parse({
        category: "Venue & Facilities",
        item_name: "Main Hall Deposit",
      });
      expect(parsed.estimated_amount).toBe(0);
      expect(parsed.actual_amount).toBe(0);
      expect(parsed.notes).toBeNull();
    });

    it("trims notes and converts empty string notes to null", () => {
      const parsed = createBudgetItemSchema.parse({
        category: "Entertainment & AV",
        item_name: "DJ Booking",
        notes: "   ",
      });
      expect(parsed.notes).toBeNull();
    });

    it("rejects missing category or item_name", () => {
      expect(createBudgetItemSchema.safeParse({ item_name: "Test" }).success).toBe(false);
      expect(createBudgetItemSchema.safeParse({ category: "Test" }).success).toBe(false);
      expect(createBudgetItemSchema.safeParse({}).success).toBe(false);
    });

    it("rejects negative amounts", () => {
      expect(
        createBudgetItemSchema.safeParse({
          category: "Decor",
          item_name: "Flowers",
          estimated_amount: -50,
        }).success
      ).toBe(false);

      expect(
        createBudgetItemSchema.safeParse({
          category: "Decor",
          item_name: "Flowers",
          actual_amount: -25,
        }).success
      ).toBe(false);
    });

    it("rejects notes exceeding 1000 characters", () => {
      const res = createBudgetItemSchema.safeParse({
        category: "Decor",
        item_name: "Flowers",
        notes: "N".repeat(1001),
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Notes must not exceed 1000 characters");
      }
    });

    it("accepts notes at exact 1000 character boundary", () => {
      expect(
        createBudgetItemSchema.safeParse({
          category: "Decor",
          item_name: "Flowers",
          notes: "N".repeat(1000),
        }).success
      ).toBe(true);
    });
  });

  describe("updateBudgetItemSchema", () => {
    it("accepts partial updates for single fields without injecting defaults", () => {
      const updateActual = updateBudgetItemSchema.parse({ actual_amount: 15000 });
      expect(updateActual).toEqual({ actual_amount: 15000 });
      expect((updateActual as Record<string, unknown>).estimated_amount).toBeUndefined();
      expect((updateActual as Record<string, unknown>).category).toBeUndefined();

      const updateCategory = updateBudgetItemSchema.parse({ category: "Other" });
      expect(updateCategory).toEqual({ category: "Other" });

      const updateNotes = updateBudgetItemSchema.parse({ notes: "Paid via invoice #1024" });
      expect(updateNotes).toEqual({ notes: "Paid via invoice #1024" });
    });

    it("accepts multi-field updates", () => {
      const multi = updateBudgetItemSchema.parse({
        item_name: "Grand Ballroom Deposit - Final",
        estimated_amount: 16000,
        actual_amount: 16000,
      });
      expect(multi).toEqual({
        item_name: "Grand Ballroom Deposit - Final",
        estimated_amount: 16000,
        actual_amount: 16000,
      });
    });

    it("rejects empty update object ({})", () => {
      const res = updateBudgetItemSchema.safeParse({});
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("At least one field must be provided");
      }
    });

    it("rejects invalid partial field values", () => {
      expect(updateBudgetItemSchema.safeParse({ category: "" }).success).toBe(false);
      expect(updateBudgetItemSchema.safeParse({ item_name: "" }).success).toBe(false);
      expect(updateBudgetItemSchema.safeParse({ estimated_amount: -100 }).success).toBe(false);
      expect(updateBudgetItemSchema.safeParse({ actual_amount: 10.999 }).success).toBe(false);
      expect(updateBudgetItemSchema.safeParse({ notes: "N".repeat(1001) }).success).toBe(false);
    });
  });
});

