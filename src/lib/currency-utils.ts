/**
 * Planora AI — Currency Formatting Utilities
 *
 * Centralized, consistent currency formatting utilities across Planora AI.
 * Localized India-first: Defaults to Indian Rupees (INR, ₹) and en-IN locale.
 * Encapsulates Intl.NumberFormat options, unit preservation (rupees, not paisa),
 * precision configuration, and fallbacks.
 */

export interface FormatCurrencyOptions {
  /**
   * Currency code to format (ISO 4217). Defaults to "INR".
   */
  currency?: string;
  /**
   * BCP 47 language tag / locale. Defaults to "en-IN".
   */
  locale?: string;
  /**
   * Minimum fraction digits to display. Defaults to 0.
   */
  minimumFractionDigits?: number;
  /**
   * Maximum fraction digits to display. Defaults to 2.
   */
  maximumFractionDigits?: number;
}

const DEFAULT_INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const MONEY_INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();
const MAX_CACHE_SIZE = 50;

function getFormatter(
  locale: string,
  currency: string,
  minDigits: number,
  maxDigits: number
): Intl.NumberFormat {
  if (locale === "en-IN" && currency === "INR") {
    if (minDigits === 0 && maxDigits === 2) return DEFAULT_INR_FORMATTER;
    if (minDigits === 2 && maxDigits === 2) return MONEY_INR_FORMATTER;
  }

  const key = `${locale}_${currency}_${minDigits}_${maxDigits}`;
  let formatter = FORMATTER_CACHE.get(key);
  if (!formatter) {
    if (FORMATTER_CACHE.size >= MAX_CACHE_SIZE) {
      const firstKey = FORMATTER_CACHE.keys().next().value;
      if (firstKey) FORMATTER_CACHE.delete(firstKey);
    }
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
    FORMATTER_CACHE.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats a numeric currency value (in rupees) with standard Indian locale formatting.
 *
 * Default configuration:
 * - Locale: "en-IN"
 * - Currency: "INR"
 * - minimumFractionDigits: 0 (displays whole rupees cleanly, e.g. "₹1,500" or "₹1,25,000")
 * - maximumFractionDigits: 2 (preserves up to two decimal places, e.g. "₹1,500.50")
 */
export function formatCurrency(
  amount: number,
  options?: FormatCurrencyOptions
): string {
  const validAmount = Number.isFinite(amount) ? amount : 0;
  const locale = options?.locale ?? "en-IN";
  const currency = options?.currency ?? "INR";
  const minDigits = options?.minimumFractionDigits ?? 0;
  const maxDigits = options?.maximumFractionDigits ?? 2;

  try {
    return getFormatter(locale, currency, minDigits, maxDigits).format(validAmount);
  } catch {
    if (minDigits === 2 && maxDigits === 2) {
      return `₹${validAmount.toFixed(2)}`;
    }
    return `₹${validAmount.toLocaleString(locale)}`;
  }
}

/**
 * Formats a numeric currency value (in rupees) with strict two decimal places.
 * Standard for ledger tables, detailed budget line items, and financial diffs (e.g. "₹1,250.00" or "₹1,25,000.00").
 */
export function formatMoney(amount: number): string {
  return formatCurrency(amount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
