import { z } from "zod";
import { eventIdSchema } from "@/lib/validations/event";
import { TASK_PRIORITIES } from "@/lib/validations/task";
import { createCurrencyAmountSchema } from "@/lib/validations/currency";

/**
 * Planora AI — Conversational Copilot Validation Schemas (Phase 5)
 *
 * Strict, bounded contracts for chat turns, user requests, model responses,
 * and structured advisory suggestions (tasks and budget adjustments).
 *
 * Invariants:
 * - Maximum conversation history: 15 messages.
 * - Maximum message length: 2,000 characters.
 * - Valid roles: 'user', 'assistant', 'system'.
 * - Event ID must be a valid UUID.
 * - Suggestions remain proposals: never directly applied to the database.
 */

// Supported message roles
export const COPILOT_ROLES = ["user", "assistant", "system"] as const;
export type CopilotRole = (typeof COPILOT_ROLES)[number];

export const copilotRoleSchema = z.enum(COPILOT_ROLES);

/**
 * Client-permissible message roles.
 * Browser requests are strictly restricted to 'user' and 'assistant' turns.
 * The 'system' role is reserved exclusively for server-constructed instructions.
 */
export const CLIENT_COPILOT_ROLES = ["user", "assistant"] as const;
export type ClientCopilotRole = (typeof CLIENT_COPILOT_ROLES)[number];
export const clientCopilotRoleSchema = z.enum(CLIENT_COPILOT_ROLES);

/**
 * Schema for an individual chat message turn in general representations.
 * Enforces length boundaries to prevent prompt-stuffing and context exhaustion.
 */
export const copilotChatMessageSchema = z
  .object({
    role: copilotRoleSchema,
    content: z
      .string("Message content is required.")
      .trim()
      .min(1, "Message content cannot be empty.")
      .max(2000, "Message content cannot exceed 2000 characters."),
  })
  .strict();

export type CopilotChatMessage = z.infer<typeof copilotChatMessageSchema>;

/**
 * Schema for client-submitted chat turns.
 * Strictly forbids client-forged 'system' messages.
 */
export const copilotClientMessageSchema = z
  .object({
    role: clientCopilotRoleSchema,
    content: z
      .string("Message content is required.")
      .trim()
      .min(1, "Message content cannot be empty.")
      .max(2000, "Message content cannot exceed 2000 characters."),
  })
  .strict();

export type CopilotClientMessage = z.infer<typeof copilotClientMessageSchema>;

/**
 * Schema for copilot chat requests originating from the client.
 * Enforces verified UUID and limits message history to 15 turns.
 * Prohibits client-supplied 'system' role injection.
 */
export const copilotRequestSchema = z
  .object({
    eventId: eventIdSchema,
    messages: z
      .array(copilotClientMessageSchema)
      .min(1, "At least one message is required.")
      .max(15, "Conversation history cannot exceed 15 messages."),
  })
  .strict();

export type CopilotRequestInput = z.infer<typeof copilotRequestSchema>;

/**
 * Safe due date validator for proposed tasks.
 * Matches taskDueDateSchema from @/lib/validations/task.
 */
export const copilotTaskDueDateSchema = z.preprocess(
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
 * Schema for a proposed checklist task suggested by the copilot.
 * Reuses task boundaries (title 1-200 chars, description max 2000 chars).
 */
export const copilotProposedTaskSchema = z
  .object({
    title: z
      .string("Task title is required.")
      .trim()
      .min(1, "Task title is required.")
      .max(200, "Task title must not exceed 200 characters."),
    description: z
      .string()
      .trim()
      .max(2000, "Task description must not exceed 2000 characters.")
      .nullable()
      .optional()
      .default(null),
    priority: z.enum(TASK_PRIORITIES).default("medium"),
    is_vendor_checklist: z.boolean().default(false),
    due_date: copilotTaskDueDateSchema.default(null),
    suggested_days_before: z
      .number()
      .int("Days before event must be a whole number.")
      .min(0, "Days before event cannot be negative.")
      .max(365, "Days before event cannot exceed 365 days.")
      .nullable()
      .optional()
      .default(null),
  })
  .strict();

export type CopilotProposedTask = z.infer<typeof copilotProposedTaskSchema>;

/**
 * Currency amount schema for proposed budget items.
 * Strictly enforces >= 0, <= 9,999,999,999.99, at most 2 decimal places.
 */
export const copilotEstimatedAmountSchema = createCurrencyAmountSchema({
  fieldLabel: "Estimated amount",
  required: true,
  innerErrorMessage: "Estimated amount must be a number.",
});

/**
 * Schema for a proposed budget line item suggested by the copilot.
 * Reuses budget item boundaries (category 1-100 chars, item_name 1-150 chars, notes max 1000 chars).
 */
export const copilotProposedBudgetItemSchema = z
  .object({
    category: z
      .string("Category is required.")
      .trim()
      .min(1, "Category is required.")
      .max(100, "Category must not exceed 100 characters."),
    item_name: z
      .string("Item name is required.")
      .trim()
      .min(1, "Item name is required.")
      .max(150, "Item name must not exceed 150 characters."),
    estimated_amount: copilotEstimatedAmountSchema,
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must not exceed 1000 characters.")
      .nullable()
      .optional()
      .default(null),
  })
  .strict();

export type CopilotProposedBudgetItem = z.infer<typeof copilotProposedBudgetItemSchema>;

/**
 * Schema for structured suggestions returned alongside conversational replies.
 */
export const copilotSuggestionsSchema = z
  .object({
    suggestedTasks: z
      .array(copilotProposedTaskSchema)
      .max(10, "Cannot suggest more than 10 tasks in a single turn.")
      .default([]),
    suggestedBudgetItems: z
      .array(copilotProposedBudgetItemSchema)
      .max(10, "Cannot suggest more than 10 budget items in a single turn.")
      .default([]),
    recommendations: z
      .array(
        z
          .string()
          .trim()
          .min(2, "Recommendation must be at least 2 characters.")
          .max(500, "Recommendation must not exceed 500 characters.")
      )
      .max(10, "Cannot suggest more than 10 recommendations.")
      .default([]),
  })
  .strict();

export type CopilotSuggestions = z.infer<typeof copilotSuggestionsSchema>;

/**
 * Schema for the complete parsed Copilot response envelope.
 */
export const copilotResponseEnvelopeSchema = z
  .object({
    reply: z
      .string("Copilot reply text is required.")
      .trim()
      .min(1, "Copilot reply cannot be empty.")
      .max(10000, "Copilot reply exceeded maximum length."),
    suggestions: copilotSuggestionsSchema.nullable().optional().default(null),
    model: z.string().max(100).optional(),
    finishReason: z.string().max(50).optional(),
  })
  .strict();

export type CopilotResponseEnvelope = z.infer<typeof copilotResponseEnvelopeSchema>;
