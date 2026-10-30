import { z } from "zod";
import type { Database } from "@/types/database.types";
import { eventIdSchema } from "@/lib/validations/event";

/**
 * Database-backed task priority values.
 * Must match the check constraint on public.tasks:
 *   CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
 */
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * Database-backed task status values.
 * Must match the check constraint on public.tasks:
 *   CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
 */
export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * UUID validator for task identifiers.
 */
export const taskIdSchema = z
  .string("Task ID is required.")
  .uuid("Task ID must be a valid UUID.");

/**
 * Re-export authoritative eventIdSchema from event validations.
 */
export { eventIdSchema };

/**
 * Safe due date validator.
 * Accepts ISO strings, Date objects, or YYYY-MM-DD / datetime-local values.
 * Converts empty strings or null to null.
 * Rejects unparseable or out-of-range dates.
 * Preserves undefined when omitted so partial update schemas do not overwrite existing dates.
 */
export const taskDueDateSchema = z.preprocess(
  (val) => {
    if (val === undefined) return undefined;
    if (val === null || val === "") return null;
    return val;
  },
  z.union([
    z.null(),
    z.undefined(),
    z
      .string()
      .or(z.date())
      .transform((val, ctx) => {
        const dateObj = val instanceof Date ? val : new Date(val);
        if (isNaN(dateObj.getTime())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter a valid due date and time.",
          });
          return z.NEVER;
        }
        const year = dateObj.getFullYear();
        if (year < 2000 || year > 2100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Due date year must be between 2000 and 2100.",
          });
          return z.NEVER;
        }
        return dateObj.toISOString();
      }),
  ])
);

/**
 * Helper schema for optional multiline descriptions.
 * Trims whitespace, converts empty string to null, enforces maximum length.
 * Preserves undefined so partial updates do not overwrite existing descriptions.
 */
const optionalTextSchema = (maxLength: number, fieldName: string) =>
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
 * Base Task Schema defining all core fields.
 * Does NOT set create defaults so partial updates leave omitted fields untouched.
 */
export const baseTaskSchema = z.object({
  title: z
    .string("Task title is required.")
    .trim()
    .min(1, "Task title is required.")
    .max(200, "Task title must not exceed 200 characters."),
  description: optionalTextSchema(2000, "Description"),
  due_date: taskDueDateSchema,
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  is_vendor_checklist: z.boolean(),
});

/**
 * Task Creation Schema:
 * - Requires title.
 * - Applies default values: priority 'medium', status 'pending', vendor flag false, description/due_date null.
 * - Strips system-managed columns (id, event_id, user_id, timestamps).
 */
export const createTaskSchema = baseTaskSchema.extend({
  description: optionalTextSchema(2000, "Description").default(null),
  due_date: taskDueDateSchema.default(null),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  status: z.enum(TASK_STATUSES).default("pending"),
  is_vendor_checklist: z.boolean().default(false),
});

/**
 * Task Update Schema:
 * - Allows partial updates; requires at least one field to be present.
 * - Uses baseTaskSchema.partial() so omitted fields stay omitted and defaults are not injected.
 */
export const updateTaskSchema = baseTaskSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided to update the task."
  );

/**
 * Lightweight schema for quick completion toggle actions.
 */
export const toggleTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

// Inferred TypeScript types
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFormValues = z.input<typeof createTaskSchema>;
export type ToggleTaskStatusInput = z.infer<typeof toggleTaskStatusSchema>;

// Re-export Database Row types for downstream consumers
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
