import { z } from "zod";
import type { Database } from "@/types/database.types";
import { createCurrencyAmountSchema } from "@/lib/validations/currency";
import { eventIdSchema } from "@/lib/validations/event";

/**
 * Common budget category presets for event expenses.
 * Planners can select from standard presets or define custom categories.
 */
export const BUDGET_CATEGORIES = [
  "Venue & Facilities",
  "Catering & Bar",
  "Decor & Styling",
  "Entertainment & AV",
  "Photography & Video",
  "Logistics & Rentals",
  "Staffing & Security",
  "Marketing & Collateral",
  "Favors & Gifts",
  "Contingency",
  "Other",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

/**
 * UUID validator for budget item identifiers.
 */
export const budgetItemIdSchema = z
  .string("Budget item ID is required.")
  .uuid("Budget item ID must be a valid UUID.");

/**
 * Re-export authoritative eventIdSchema from event validations.
 */
export { eventIdSchema };

/**
 * Validates expense category:
 * - Must be a non-empty, trimmed string.
 * - Maximum 100 characters.
 */
export const categorySchema = z
  .string("Category is required.")
  .trim()
  .min(1, "Category is required.")
  .max(100, "Category must not exceed 100 characters.");

/**
 * Validates expense item name:
 * - Must be a non-empty, trimmed string.
 * - Minimum 1 character, maximum 150 characters.
 */
export const itemNameSchema = z
  .string("Item name is required.")
  .trim()
  .min(1, "Item name is required.")
  .max(150, "Item name must not exceed 150 characters.");

/**
 * Currency amount validator consistent with PostgreSQL NUMERIC(12, 2):
 * - Non-negative (>= 0.00).
 * - Maximum 9,999,999,999.99.
 * - Strictly enforces at most 2 decimal places without silently mutating user input.
 * - Rejects scientific notation, NaN, Infinity, negative values, and non-numeric inputs.
 * - Preserves undefined when omitted so partial update schemas do not inject 0.
 * - Maps empty string, whitespace string, or null to 0 for form compatibility.
 */
export const currencyAmountSchema = createCurrencyAmountSchema({
  fieldLabel: "Amount",
  required: false,
  innerErrorMessage: "Amount must be a valid number.",
});

/**
 * Helper schema for optional multiline notes.
 * Trims whitespace, maps empty string to null, enforces maximum length.
 * Preserves undefined so partial updates do not overwrite existing notes.
 */
const optionalNotesSchema = (maxLength: number, fieldName: string) =>
  z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed.length === 0 ? null : trimmed;
      }
      return val ?? null;
    },
    z
      .string()
      .max(maxLength, `${fieldName} must not exceed ${maxLength} characters.`)
      .nullable()
      .optional()
  );

/**
 * Base budget item schema defining all core fields.
 * Does NOT set create defaults so that partial update schemas
 * leave omitted fields untouched.
 */
export const baseBudgetItemSchema = z.object({
  category: categorySchema,
  item_name: itemNameSchema,
  estimated_amount: currencyAmountSchema,
  actual_amount: currencyAmountSchema,
  notes: optionalNotesSchema(1000, "Notes"),
});

/**
 * Budget Item Creation Schema:
 * - Requires category and item_name.
 * - Applies default 0.00 for estimated_amount and actual_amount if omitted or empty.
 * - Applies default null for notes if omitted or empty.
 * - Strips system-managed columns (id, event_id, user_id, timestamps).
 */
export const createBudgetItemSchema = baseBudgetItemSchema.extend({
  estimated_amount: currencyAmountSchema.default(0),
  actual_amount: currencyAmountSchema.default(0),
  notes: optionalNotesSchema(1000, "Notes").default(null),
});

/**
 * Budget Item Update Schema:
 * - Allows partial updates; requires at least one field to be present.
 * - Uses baseBudgetItemSchema.partial() so omitted fields stay omitted.
 */
export const updateBudgetItemSchema = baseBudgetItemSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided to update the budget item."
  );

// Inferred TypeScript types
export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>;
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>;
export type BudgetItemFormValues = z.input<typeof createBudgetItemSchema>;

// Re-export Database Row types for downstream consumers
export type BudgetItemRow = Database["public"]["Tables"]["budget_items"]["Row"];
export type BudgetItemInsert = Database["public"]["Tables"]["budget_items"]["Insert"];
export type BudgetItemUpdate = Database["public"]["Tables"]["budget_items"]["Update"];
