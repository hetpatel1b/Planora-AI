import { z } from "zod";

/**
 * Currency bounds consistent with PostgreSQL NUMERIC(12, 2).
 */
export const MIN_CURRENCY_AMOUNT = 0;
export const MAX_CURRENCY_AMOUNT = 9_999_999_999.99;
export const MAX_CURRENCY_DECIMALS = 2;

export interface CurrencyValidationResult {
  valid: boolean;
  amount?: number;
  error?: string;
}

/**
 * Validates a currency input (number or numeric string) according to Planora AI currency conventions.
 * Returns structured validation result with parsed amount or descriptive error message.
 */
export function validateCurrencyValue(
  val: unknown,
  fieldLabel = "Amount"
): CurrencyValidationResult {
  let num: number;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/e/i.test(trimmed)) {
      return {
        valid: false,
        error: "Scientific notation is not supported for currency amounts.",
      };
    }
    const parts = trimmed.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length > MAX_CURRENCY_DECIMALS)) {
      return {
        valid: false,
        error: `${fieldLabel} cannot have more than ${MAX_CURRENCY_DECIMALS} decimal places.`,
      };
    }
    num = Number(trimmed);
    if (isNaN(num)) {
      return {
        valid: false,
        error: `${fieldLabel} must be a valid number.`,
      };
    }
  } else if (typeof val === "number") {
    if (!Number.isFinite(val)) {
      return {
        valid: false,
        error: `${fieldLabel} must be a finite number.`,
      };
    }
    const str = val.toString();
    if (/e/i.test(str)) {
      return {
        valid: false,
        error: `${fieldLabel} cannot have more than ${MAX_CURRENCY_DECIMALS} decimal places.`,
      };
    }
    const parts = str.split(".");
    if (parts.length > 1 && parts[1].length > MAX_CURRENCY_DECIMALS) {
      return {
        valid: false,
        error: `${fieldLabel} cannot have more than ${MAX_CURRENCY_DECIMALS} decimal places.`,
      };
    }
    num = val;
  } else {
    return {
      valid: false,
      error: `${fieldLabel} must be a valid number.`,
    };
  }

  if (num < MIN_CURRENCY_AMOUNT) {
    return {
      valid: false,
      error: `${fieldLabel} cannot be negative.`,
    };
  }
  if (num > MAX_CURRENCY_AMOUNT) {
    return {
      valid: false,
      error: `${fieldLabel} cannot exceed 9,999,999,999.99.`,
    };
  }
  return { valid: true, amount: num };
}

/**
 * Validates and converts a currency input (number or numeric string)
 * to a 2-decimal-place bounded number.
 *
 * Adds Zod issues to `ctx` and returns `z.NEVER` if invalid.
 */
export function parseCurrencyAmount(
  val: unknown,
  ctx: z.RefinementCtx,
  fieldLabel = "Amount"
): number | typeof z.NEVER {
  const result = validateCurrencyValue(val, fieldLabel);
  if (!result.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error!,
    });
    return z.NEVER;
  }
  return result.amount!;
}

/**
 * Creates a required currency amount schema (e.g. for proposed plan items).
 * Rejects undefined, null, and empty/whitespace-only strings.
 */
export function createRequiredCurrencyAmountSchema(
  fieldLabel = "Estimated amount",
  innerErrorMessage = `${fieldLabel} must be a number.`
) {
  return z.preprocess(
    (val, ctx) => {
      if (val === null || (typeof val === "string" && val.trim() === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${fieldLabel} is required.`,
        });
        return z.NEVER;
      }
      return parseCurrencyAmount(val, ctx, fieldLabel);
    },
    z.number(innerErrorMessage)
  );
}

/**
 * Creates an optional currency amount schema with form compatibility
 * (omitted preserved as undefined; empty strings and null mapped to 0).
 */
export function createOptionalCurrencyAmountSchema(
  fieldLabel = "Amount",
  innerErrorMessage = `${fieldLabel} must be a valid number.`
) {
  return z.preprocess(
    (val, ctx) => {
      if (val === undefined) return undefined;
      if (val === null || (typeof val === "string" && val.trim() === "")) {
        return 0;
      }
      return parseCurrencyAmount(val, ctx, fieldLabel);
    },
    z.number(innerErrorMessage).optional()
  );
}

export interface CurrencyAmountSchemaOptions {
  fieldLabel?: string;
  required?: boolean;
  innerErrorMessage?: string;
}

/**
 * Configurable currency amount schema factory.
 */
export function createCurrencyAmountSchema(options: {
  fieldLabel?: string;
  required: true;
  innerErrorMessage?: string;
}): ReturnType<typeof createRequiredCurrencyAmountSchema>;
export function createCurrencyAmountSchema(options?: {
  fieldLabel?: string;
  required?: false;
  innerErrorMessage?: string;
}): ReturnType<typeof createOptionalCurrencyAmountSchema>;
export function createCurrencyAmountSchema(
  options?: CurrencyAmountSchemaOptions
):
  | ReturnType<typeof createRequiredCurrencyAmountSchema>
  | ReturnType<typeof createOptionalCurrencyAmountSchema> {
  if (options?.required) {
    return createRequiredCurrencyAmountSchema(
      options.fieldLabel ?? "Estimated amount",
      options.innerErrorMessage
    );
  }
  return createOptionalCurrencyAmountSchema(
    options?.fieldLabel ?? "Amount",
    options?.innerErrorMessage
  );
}
