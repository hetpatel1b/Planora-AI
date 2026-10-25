/**
 * Planora AI — Currency Formatting Utilities
 *
 * Centralized, consistent currency formatting utilities across Planora AI.
 * Encapsulates Intl.NumberFormat options, unit preservation (dollars, not cents),
 * precision configuration, and fallbacks.
 */

export interface FormatCurrencyOptions {
  /**
   * Currency code to format (ISO 4217). Defaults to "USD".
   */
  currency?: string;
  /**
   * BCP 47 language tag / locale. Defaults to "en-US".
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

const DEFAULT_USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const MONEY_USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
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
  if (locale === "en-US" && currency === "USD") {
    if (minDigits === 0 && maxDigits === 2) return DEFAULT_USD_FORMATTER;
    if (minDigits === 2 && maxDigits === 2) return MONEY_USD_FORMATTER;
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
 * Formats a numeric currency value (in dollars) with standard locale formatting.
 *
 * Default configuration:
 * - Locale: "en-US"
 * - Currency: "USD"
 * - minimumFractionDigits: 0 (displays whole dollars cleanly, e.g. "$1,500")
 * - maximumFractionDigits: 2 (preserves up to two decimal places, e.g. "$1,500.50")
 */
export function formatCurrency(
  amount: number,
  options?: FormatCurrencyOptions
): string {
  const validAmount = Number.isFinite(amount) ? amount : 0;
  const locale = options?.locale ?? "en-US";
  const currency = options?.currency ?? "USD";
  const minDigits = options?.minimumFractionDigits ?? 0;
  const maxDigits = options?.maximumFractionDigits ?? 2;

  try {
    return getFormatter(locale, currency, minDigits, maxDigits).format(validAmount);
  } catch {
    if (minDigits === 2 && maxDigits === 2) {
      return `$${validAmount.toFixed(2)}`;
    }
    return `$${validAmount.toLocaleString(locale)}`;
  }
}

/**
 * Formats a numeric currency value (in dollars) with strict two decimal places.
 * Standard for ledger tables, detailed budget line items, and financial diffs (e.g. "$1,250.00").
 */
export function formatMoney(amount: number): string {
  return formatCurrency(amount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
