import { z } from "zod";
import {
  eventIdSchema,
  budgetItemIdSchema,
  categorySchema,
  itemNameSchema,
} from "@/lib/validations/budget";
import { createCurrencyAmountSchema } from "@/lib/validations/currency";

/**
 * Maximum number of named scenarios that can be evaluated or compared simultaneously.
 */
export const MAX_SIMULATION_SCENARIOS = 3;

/**
 * Currency amount validator for scenario estimated & actual amounts.
 * Consistent with PostgreSQL NUMERIC(12, 2):
 * - Non-negative (>= 0.00).
 * - Maximum 9,999,999,999.99.
 * - Maximum 2 decimal places.
 * - Rejects scientific notation, NaN, Infinity, and negatives.
 */
export const scenarioAmountSchema = createCurrencyAmountSchema({
  fieldLabel: "Scenario amount",
  required: false,
  innerErrorMessage: "Scenario amount must be a valid number.",
});

/**
 * Required currency amount validator for newly created scenario items.
 */
export const requiredScenarioAmountSchema = createCurrencyAmountSchema({
  fieldLabel: "Estimated amount",
  required: true,
  innerErrorMessage: "Estimated amount must be a valid number.",
});

/**
 * Validates an in-memory modification or deletion of an existing budget item.
 */
export const scenarioItemOverrideSchema = z
  .object({
    id: budgetItemIdSchema,
    estimated_amount: scenarioAmountSchema,
    actual_amount: scenarioAmountSchema,
    is_deleted: z.boolean().optional().default(false),
  })
  .strict()
  .refine(
    (data) =>
      data.is_deleted === true ||
      data.estimated_amount !== undefined ||
      data.actual_amount !== undefined,
    {
      message:
        "An item override must specify a new estimated amount, actual amount, or mark the item as deleted.",
    }
  );

/**
 * Validates a newly proposed candidate expense item in a what-if scenario.
 */
export const scenarioNewItemSchema = z
  .object({
    tempId: z
      .string("Temporary item ID is required.")
      .trim()
      .min(1, "Temporary item ID cannot be empty.")
      .max(100, "Temporary item ID must not exceed 100 characters."),
    category: categorySchema,
    item_name: itemNameSchema,
    estimated_amount: requiredScenarioAmountSchema,
    actual_amount: scenarioAmountSchema.default(0),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must not exceed 1000 characters.")
      .nullable()
      .optional()
      .default(null),
  })
  .strict();

/**
 * Validation schema for applying an explicit, user-confirmed budget scenario to persistent storage.
 * 
 * Security & Data Integrity Invariants:
 * - Re-validates event ID and all item IDs as valid UUIDs.
 * - Enforces uniqueness across modified item IDs (rejects conflicting duplicate operations).
 * - Enforces uniqueness across new item temporary IDs.
 * - Enforces standard NUMERIC(12, 2) currency bounds on every amount.
 * - Strictly rejects untrusted client-provided totals, savings, or variances:
 *   client calculations are never accepted as authoritative values.
 * - Rejects empty / no-op scenarios where no modifications, additions, or budget changes exist.
 */
export const applyBudgetScenarioInputSchema = z
  .object({
    eventId: eventIdSchema,
    scenarioName: z
      .string("Scenario name is required.")
      .trim()
      .min(1, "Scenario name is required.")
      .max(100, "Scenario name must not exceed 100 characters.")
      .optional()
      .default("Applied Scenario"),
    target_budget: scenarioAmountSchema.nullable().optional(),
    item_overrides: z.array(scenarioItemOverrideSchema).optional().default([]),
    new_items: z.array(scenarioNewItemSchema).optional().default([]),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Detect duplicate item overrides
    const seenItemIds = new Set<string>();
    for (let i = 0; i < data.item_overrides.length; i++) {
      const override = data.item_overrides[i];
      if (seenItemIds.has(override.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate item override found for budget item ID: ${override.id}. Each item may only be modified once.`,
          path: ["item_overrides", i, "id"],
        });
      } else {
        seenItemIds.add(override.id);
      }
    }

    // 2. Detect duplicate temporary IDs in new items
    const seenTempIds = new Set<string>();
    for (let i = 0; i < data.new_items.length; i++) {
      const newItem = data.new_items[i];
      if (seenTempIds.has(newItem.tempId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate temporary ID found: ${newItem.tempId}. Each newly proposed item must have a unique temporary ID.`,
          path: ["new_items", i, "tempId"],
        });
      } else {
        seenTempIds.add(newItem.tempId);
      }
    }

    // 3. Reject empty / no-op scenario
    const hasTargetBudgetChange =
      data.target_budget !== undefined && data.target_budget !== null;
    const hasItemOverrides = data.item_overrides.length > 0;
    const hasNewItems = data.new_items.length > 0;

    if (!hasTargetBudgetChange && !hasItemOverrides && !hasNewItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Scenario contains no modifications, additions, or budget changes to apply.",
      });
    }
  });

export type ScenarioItemOverrideInput = z.infer<typeof scenarioItemOverrideSchema>;
export type ScenarioNewItemInput = z.infer<typeof scenarioNewItemSchema>;
export type ApplyBudgetScenarioInput = z.infer<typeof applyBudgetScenarioInputSchema>;

/**
 * Schema validating the database confirmation payload returned by
 * the `apply_budget_scenario` RPC transaction.
 */
export const applyBudgetScenarioRpcResponseSchema = z.object({
  applied: z.boolean(),
  event_id: z.string().uuid().optional(),
  overrides_applied: z.number().int().nonnegative().optional(),
  items_inserted: z.number().int().nonnegative().optional(),
});

export type ApplyBudgetScenarioRpcResponse = z.infer<
  typeof applyBudgetScenarioRpcResponseSchema
>;
