import { z } from "zod";

/**
 * Currency bounds consistent with PostgreSQL NUMERIC(12, 2).
 */
export const MIN_CURRENCY_AMOUNT = 0;
export const MAX_CURRENCY_AMOUNT = 9_999_999_999.99;
export const MAX_CURRENCY_DECIMALS = 2;

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
  let num: number;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/e/i.test(trimmed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scientific notation is not supported for currency amounts.",
      });
      return z.NEVER;
    }
    const parts = trimmed.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length > MAX_CURRENCY_DECIMALS)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel} cannot have more than ${MAX_CURRENCY_DECIMALS} decimal places.`,
      });
      return z.NEVER;
    }
    num = Number(trimmed);
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel} must be a valid number.`,
      });
      return z.NEVER;
    }
  } else if (typeof val === "number") {
    if (!Number.isFinite(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel} must be a finite number.`,
      });
      return z.NEVER;
    }
    const str = val.toString();
    if (/e/i.test(str)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel} cannot have more than ${MAX_CURRENCY_DECIMALS} decimal places.`,
      });
      return z.NEVER;
    }
    const parts = str.split(".");
    if (parts.length > 1 && parts[1].length > MAX_CURRENCY_DECIMALS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel} cannot have more than ${MAX_CURRENCY_DECIMALS} decimal places.`,
      });
      return z.NEVER;
    }
    num = val;
  } else {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldLabel} must be a valid number.`,
    });
    return z.NEVER;
  }

  if (num < MIN_CURRENCY_AMOUNT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldLabel} cannot be negative.`,
    });
    return z.NEVER;
  }
  if (num > MAX_CURRENCY_AMOUNT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldLabel} cannot exceed 9,999,999,999.99.`,
    });
    return z.NEVER;
  }
  return num;
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
