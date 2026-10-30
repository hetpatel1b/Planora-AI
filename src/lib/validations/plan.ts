import { z } from "zod";
import type { Database, Json } from "@/types/database.types";
import { TASK_PRIORITIES } from "@/lib/validations/task";
import { createCurrencyAmountSchema } from "@/lib/validations/currency";

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
export const planEstimatedAmountSchema = createCurrencyAmountSchema({
  fieldLabel: "Estimated amount",
  required: true,
  innerErrorMessage: "Estimated amount must be a number.",
});

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
 * Lenient validation schema for reading persisted or historical plan blueprints.
 * Prevents UI, PDF, and risk calculation crashes if older revisions contain
 * optional or empty arrays.
 */
export const persistedPlanBlueprintSchema = z
  .object({
    summary: z.string().trim().min(1).max(5000),
    themes: z.array(z.string().trim()).default([]),
    scheduleMilestones: z.array(planMilestoneSchema).default([]),
    suggestedTasks: z.array(z.record(z.string(), z.unknown())).default([]),
    proposedBudgetItems: z.array(z.record(z.string(), z.unknown())).default([]),
    keyRecommendations: z.array(z.string().trim()).default([]),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

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

/**
 * Runtime schema validating the authoritative database row structure returned
 * by plan revision queries and the `accept_plan_blueprint` RPC transaction.
 */
export const planRevisionRowSchema: z.ZodType<PlanRevisionRow> = z.object({
  id: z.string().uuid("Revision ID must be a valid UUID."),
  event_id: z.string().uuid("Event ID must be a valid UUID."),
  user_id: z.string().uuid("User ID must be a valid UUID."),
  revision_number: z
    .number("Revision number must be a number.")
    .int("Revision number must be an integer.")
    .positive("Revision number must be greater than 0."),
  structured_plan: z.custom<Json>(
    (val) => val !== undefined && val !== null,
    "Structured plan payload is required."
  ),
  summary: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});

/**
 * Safely extracts an AIPlanBlueprint from a PlanRevision database row or payload.
 * Returns null if the structured plan is missing, null, or not an object.
 */
export function extractPlanBlueprint(
  revision?: { structured_plan?: unknown } | null
): AIPlanBlueprint | null {
  if (!revision || !revision.structured_plan) return null;
  const raw = revision.structured_plan;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as AIPlanBlueprint;
  }
  return null;
}

