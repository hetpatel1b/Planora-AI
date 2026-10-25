import { z } from "zod";
import type { Database } from "@/types/database.types";
import { TASK_PRIORITIES } from "@/lib/validations/task";

/**
 * Validates a single suggested milestone or schedule block in an event blueprint.
 */
export const planMilestoneSchema = z
  .object({
    title: z
      .string("Milestone title is required.")
      .trim()
      .min(2, "Milestone title must be at least 2 characters.")
      .max(150, "Milestone title must not exceed 150 characters."),
    timeframe: z
      .string("Timeframe is required.")
      .trim()
      .min(1, "Timeframe is required.")
      .max(100, "Timeframe must not exceed 100 characters."),
    description: z
      .string("Milestone description is required.")
      .trim()
      .min(1, "Milestone description is required.")
      .max(500, "Milestone description must not exceed 500 characters."),
    suggested_date: z
      .string()
      .nullable()
      .optional(),
  })
  .strict();

/**
 * Validates a proposed task item recommended by the event blueprint.
 */
export const planSuggestedTaskSchema = z
  .object({
    title: z
      .string("Task title is required.")
      .trim()
      .min(2, "Task title must be at least 2 characters.")
      .max(200, "Task title must not exceed 200 characters."),
    description: z
      .string()
      .max(1000, "Task description must not exceed 1000 characters.")
      .nullable()
      .optional(),
    priority: z.enum(TASK_PRIORITIES).default("medium"),
    category: z
      .string("Task category is required.")
      .trim()
      .min(1, "Task category is required.")
      .max(100, "Task category must not exceed 100 characters."),
    is_vendor_checklist: z.boolean().default(false),
    suggested_days_before: z
      .number()
      .int("Days before event must be a whole number.")
      .min(0, "Days before event cannot be negative.")
      .max(365, "Days before event cannot exceed 365 days.")
      .nullable()
      .optional(),
  })
  .strict();

/**
 * Estimated amount validator for proposed plan budget items:
 * - Accepts both numbers and numeric strings.
 * - Non-negative (>= 0.00).
 * - Maximum 9,999,999,999.99.
 * - Strictly enforces at most 2 decimal places without silently mutating user/LLM input.
 * - Rejects scientific notation, NaN, Infinity, negative values, and non-numeric inputs.
 */
export const planEstimatedAmountSchema = z.preprocess(
  (val, ctx) => {
    if (val === null || (typeof val === "string" && val.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Estimated amount is required.",
      });
      return z.NEVER;
    }
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
      if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estimated amount cannot have more than 2 decimal places.",
        });
        return z.NEVER;
      }
      num = Number(trimmed);
      if (isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estimated amount must be a valid number.",
        });
        return z.NEVER;
      }
    } else if (typeof val === "number") {
      if (!Number.isFinite(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estimated amount must be a finite number.",
        });
        return z.NEVER;
      }
      const str = val.toString();
      if (/e/i.test(str)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estimated amount cannot have more than 2 decimal places.",
        });
        return z.NEVER;
      }
      const parts = str.split(".");
      if (parts.length > 1 && parts[1].length > 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estimated amount cannot have more than 2 decimal places.",
        });
        return z.NEVER;
      }
      num = val;
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Estimated amount must be a valid number.",
      });
      return z.NEVER;
    }

    if (num < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Estimated amount cannot be negative.",
      });
      return z.NEVER;
    }
    if (num > 9_999_999_999.99) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Estimated amount cannot exceed 9,999,999,999.99.",
      });
      return z.NEVER;
    }
    return num;
  },
  z.number("Estimated amount must be a number.")
);

/**
 * Validates a proposed budget allocation item recommended by the event blueprint.
 */
export const planProposedBudgetItemSchema = z
  .object({
    category: z
      .string("Budget category is required.")
      .trim()
      .min(1, "Budget category is required.")
      .max(100, "Budget category must not exceed 100 characters."),
    item_name: z
      .string("Budget item name is required.")
      .trim()
      .min(1, "Budget item name is required.")
      .max(150, "Budget item name must not exceed 150 characters."),
    estimated_amount: planEstimatedAmountSchema,
    notes: z
      .string()
      .max(500, "Budget item notes must not exceed 500 characters.")
      .nullable()
      .optional(),
  })
  .strict();

/**
 * Generation metadata distinguishing deterministic vs. AI model provenance.
 */
export const planMetadataSchema = z
  .object({
    source: z.enum(["ai", "deterministic"]),
    model: z.string().max(100).nullable().optional(),
    generatedAt: z.string().datetime("Must be a valid ISO 8601 timestamp."),
    promptSummary: z.string().max(500).nullable().optional(),
  })
  .strict();

/**
 * Complete F02 AI Event Plan Blueprint Schema.
 * Strict, bounded structure for generated plans before user acceptance.
 */
export const aiPlanBlueprintSchema = z
  .object({
    summary: z
      .string("Event summary is required.")
      .trim()
      .min(10, "Event summary must be at least 10 characters.")
      .max(2000, "Event summary must not exceed 2000 characters."),
    themes: z
      .array(
        z
          .string()
          .trim()
          .min(2, "Theme must be at least 2 characters.")
          .max(200, "Theme must not exceed 200 characters.")
      )
      .min(1, "At least one theme or concept is required.")
      .max(10, "Cannot specify more than 10 themes."),
    scheduleMilestones: z
      .array(planMilestoneSchema)
      .min(1, "At least one milestone is required.")
      .max(30, "Cannot specify more than 30 milestones."),
    suggestedTasks: z
      .array(planSuggestedTaskSchema)
      .min(1, "At least one suggested task is required.")
      .max(50, "Cannot specify more than 50 suggested tasks."),
    proposedBudgetItems: z
      .array(planProposedBudgetItemSchema)
      .min(1, "At least one proposed budget item is required.")
      .max(50, "Cannot specify more than 50 proposed budget items."),
    keyRecommendations: z
      .array(
        z
          .string()
          .trim()
          .min(2, "Recommendation must be at least 2 characters.")
          .max(300, "Recommendation must not exceed 300 characters.")
      )
      .max(10, "Cannot specify more than 10 recommendations.")
      .default([]),
    metadata: planMetadataSchema,
  })
  .strict();

/**
 * Plan Revision Persistence Validation Schema.
 * Matches public.plan_revisions table:
 *   event_id UUID NOT NULL
 *   revision_number INTEGER NOT NULL (chk > 0)
 *   structured_plan JSONB NOT NULL
 *   summary TEXT
 */
export const createPlanRevisionSchema = z.object({
  event_id: z
    .string("Event ID is required.")
    .uuid("Event ID must be a valid UUID."),
  revision_number: z
    .number("Revision number must be a number.")
    .int("Revision number must be an integer.")
    .positive("Revision number must be greater than 0."),
  structured_plan: aiPlanBlueprintSchema,
  summary: z
    .string()
    .trim()
    .max(2000, "Summary must not exceed 2000 characters.")
    .nullable()
    .optional(),
  is_active: z.boolean().optional().default(true),
});

// Inferred TypeScript types
export type PlanMilestone = z.infer<typeof planMilestoneSchema>;
export type PlanSuggestedTask = z.infer<typeof planSuggestedTaskSchema>;
export type PlanProposedBudgetItem = z.infer<typeof planProposedBudgetItemSchema>;
export type PlanMetadata = z.infer<typeof planMetadataSchema>;
export type AIPlanBlueprint = z.infer<typeof aiPlanBlueprintSchema>;
export type CreatePlanRevisionInput = z.infer<typeof createPlanRevisionSchema>;

/**
 * Schema for accepting and applying a plan blueprint to an event workspace.
 */
export const acceptPlanBlueprintInputSchema = z.object({
  eventId: z
    .string("Event ID is required.")
    .uuid("Event ID must be a valid UUID."),
  blueprint: aiPlanBlueprintSchema,
  selectedTaskIndexes: z
    .array(z.number().int().min(0, "Task index must be non-negative."))
    .max(50, "Cannot select more than 50 tasks.")
    .optional()
    .default([]),
  selectedBudgetItemIndexes: z
    .array(z.number().int().min(0, "Budget item index must be non-negative."))
    .max(50, "Cannot select more than 50 budget items.")
    .optional()
    .default([]),
});

export type AcceptPlanBlueprintInput = z.infer<typeof acceptPlanBlueprintInputSchema>;

// Re-export Database Row types for downstream consumers
export type PlanRevisionRow = Database["public"]["Tables"]["plan_revisions"]["Row"];
export type PlanRevisionInsert = Database["public"]["Tables"]["plan_revisions"]["Insert"];
export type PlanRevisionUpdate = Database["public"]["Tables"]["plan_revisions"]["Update"];
