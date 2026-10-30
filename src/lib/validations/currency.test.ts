import { describe, it, expect } from "vitest";
import {
  createRequiredCurrencyAmountSchema,
  createOptionalCurrencyAmountSchema,
  createCurrencyAmountSchema,
  validateCurrencyValue,
  MIN_CURRENCY_AMOUNT,
  MAX_CURRENCY_AMOUNT,
  MAX_CURRENCY_DECIMALS,
} from "./currency";

describe("currency validation", () => {
  describe("constants", () => {
    it("defines the expected PostgreSQL NUMERIC(12, 2) bounds", () => {
      expect(MIN_CURRENCY_AMOUNT).toBe(0);
      expect(MAX_CURRENCY_AMOUNT).toBe(9_999_999_999.99);
      expect(MAX_CURRENCY_DECIMALS).toBe(2);
    });
  });

  describe("createRequiredCurrencyAmountSchema", () => {
    const schema = createRequiredCurrencyAmountSchema("Budget ceiling");

    it("accepts valid integers as numbers or strings", () => {
      expect(schema.parse(100)).toBe(100);
      expect(schema.parse("250")).toBe(250);
      expect(schema.parse(0)).toBe(0);
      expect(schema.parse("0")).toBe(0);
    });

    it("accepts valid decimal amounts with 1 or 2 decimal places", () => {
      expect(schema.parse(49.9)).toBe(49.9);
      expect(schema.parse("49.99")).toBe(49.99);
      expect(schema.parse("1000.5")).toBe(1000.5);
      expect(schema.parse("0.05")).toBe(0.05);
    });

    it("rejects amounts with more than 2 decimal places", () => {
      const resNumber = schema.safeParse(12.345);
      expect(resNumber.success).toBe(false);
      if (!resNumber.success) {
        expect(resNumber.error.issues[0].message).toContain("cannot have more than 2 decimal places");
      }

      const resString = schema.safeParse("12.345");
      expect(resString.success).toBe(false);
      if (!resString.success) {
        expect(resString.error.issues[0].message).toContain("cannot have more than 2 decimal places");
      }
    });

    it("rejects negative amounts", () => {
      const res = schema.safeParse(-5);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot be negative");
      }

      const resStr = schema.safeParse("-0.01");
      expect(resStr.success).toBe(false);
      if (!resStr.success) {
        expect(resStr.error.issues[0].message).toContain("cannot be negative");
      }
    });

    it("rejects scientific notation", () => {
      const resStr = schema.safeParse("1e5");
      expect(resStr.success).toBe(false);
      if (!resStr.success) {
        expect(resStr.error.issues[0].message).toContain("Scientific notation is not supported");
      }

      const resNum = schema.safeParse(100000);
      expect(resNum.success).toBe(true);
      // But 1e25 would format as 1e+25 which has 'e':
      const resLargeExp = schema.safeParse(1e25);
      expect(resLargeExp.success).toBe(false);
    });

    it("rejects amounts exceeding the maximum ceiling", () => {
      const res = schema.safeParse(10_000_000_000);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("cannot exceed 9,999,999,999.99");
      }
    });

    it("accepts maximum valid ceiling amount", () => {
      expect(schema.parse(9_999_999_999.99)).toBe(9_999_999_999.99);
      expect(schema.parse("9999999999.99")).toBe(9_999_999_999.99);
    });

    it("rejects null, undefined, empty string, and whitespace-only strings", () => {
      const nullRes = schema.safeParse(null);
      expect(nullRes.success).toBe(false);
      if (!nullRes.success) {
        expect(nullRes.error.issues[0].message).toContain("is required");
      }

      const emptyRes = schema.safeParse("");
      expect(emptyRes.success).toBe(false);
      if (!emptyRes.success) {
        expect(emptyRes.error.issues[0].message).toContain("is required");
      }

      const whitespaceRes = schema.safeParse("   ");
      expect(whitespaceRes.success).toBe(false);
      if (!whitespaceRes.success) {
        expect(whitespaceRes.error.issues[0].message).toContain("is required");
      }
    });

    it("rejects invalid non-numeric strings and multiple decimal points", () => {
      const abcRes = schema.safeParse("abc");
      expect(abcRes.success).toBe(false);
      if (!abcRes.success) {
        expect(abcRes.error.issues[0].message).toContain("must be a valid number");
      }

      const multiDot = schema.safeParse("12.34.56");
      expect(multiDot.success).toBe(false);
    });

    it("rejects non-finite numbers (NaN, Infinity)", () => {
      expect(schema.safeParse(NaN).success).toBe(false);
      expect(schema.safeParse(Infinity).success).toBe(false);
      expect(schema.safeParse(-Infinity).success).toBe(false);
    });
  });

  describe("createOptionalCurrencyAmountSchema", () => {
    const schema = createOptionalCurrencyAmountSchema("Actual expense");

    it("preserves undefined as undefined", () => {
      expect(schema.parse(undefined)).toBeUndefined();
    });

    it("coerces empty string and null to 0 for form compatibility", () => {
      expect(schema.parse("")).toBe(0);
      expect(schema.parse("   ")).toBe(0);
      expect(schema.parse(null)).toBe(0);
    });

    it("parses valid numbers and strings correctly", () => {
      expect(schema.parse(75)).toBe(75);
      expect(schema.parse("125.50")).toBe(125.5);
    });

    it("still enforces validations on provided values", () => {
      expect(schema.safeParse(-10).success).toBe(false);
      expect(schema.safeParse("invalid").success).toBe(false);
      expect(schema.safeParse("10.999").success).toBe(false);
    });
  });

  describe("createCurrencyAmountSchema factory", () => {
    it("returns required schema when required: true", () => {
      const requiredSchema = createCurrencyAmountSchema({
        fieldLabel: "Cost",
        required: true,
      });
      expect(requiredSchema.safeParse("").success).toBe(false);
      expect(requiredSchema.parse("50")).toBe(50);
    });

    it("returns optional schema when required is false or omitted", () => {
      const optionalSchema = createCurrencyAmountSchema({
        fieldLabel: "Cost",
        required: false,
      });
      expect(optionalSchema.parse("")).toBe(0);
      expect(optionalSchema.parse(undefined)).toBeUndefined();

      const defaultSchema = createCurrencyAmountSchema();
      expect(defaultSchema.parse("")).toBe(0);
    });
  });

  describe("validateCurrencyValue discriminated union", () => {
    it("narrows to valid result with amount on success without non-null assertions", () => {
      const result = validateCurrencyValue(150.25, "Test Amount");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.amount).toBe(150.25);
      } else {
        throw new Error("Expected valid result");
      }
    });

    it("narrows to invalid result with error on failure without non-null assertions", () => {
      const result = validateCurrencyValue(-20, "Test Amount");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("Test Amount cannot be negative");
      } else {
        throw new Error("Expected invalid result");
      }
    });

    it("safely rejects scientific notation with informative error message", () => {
      const result = validateCurrencyValue("1e4", "Budget");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe(
          "Scientific notation is not supported for currency amounts."
        );
      }
    });
  });
});
