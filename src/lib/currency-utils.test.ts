import { describe, it, expect } from "vitest";
import { formatCurrency, formatMoney } from "./currency-utils";

describe("currency-utils", () => {
  describe("formatCurrency", () => {
    it("formats whole dollars cleanly without decimals by default", () => {
      expect(formatCurrency(1500)).toBe("$1,500");
      expect(formatCurrency(0)).toBe("$0");
    });

    it("preserves cents when decimal amount is provided", () => {
      expect(formatCurrency(1500.5)).toBe("$1,500.5");
      expect(formatCurrency(1500.75)).toBe("$1,500.75");
    });

    it("handles non-finite values safely", () => {
      expect(formatCurrency(NaN)).toBe("$0");
      expect(formatCurrency(Infinity)).toBe("$0");
      expect(formatCurrency(-Infinity)).toBe("$0");
    });

    it("respects custom options for currency and locale", () => {
      const formattedEUR = formatCurrency(100, {
        currency: "EUR",
        locale: "de-DE",
      });
      // German formatting uses comma and euro sign: 100 € or 100,00 €
      expect(formattedEUR).toContain("100");
      expect(formattedEUR).toContain("€");
    });
  });

  describe("formatMoney", () => {
    it("always formats with strict two decimal places", () => {
      expect(formatMoney(1250)).toBe("$1,250.00");
      expect(formatMoney(0)).toBe("$0.00");
      expect(formatMoney(45.9)).toBe("$45.90");
      expect(formatMoney(99.99)).toBe("$99.99");
    });
  });
});
