import { z } from "zod";
import type { Database } from "@/types/database.types";

/**
 * Database-backed event status union.
 * Must match the check constraint on public.events:
 *   CHECK (status IN ('draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'))
 */
export const EVENT_STATUSES = [
  "draft",
  "planning",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

/**
 * Common event type presets for intake UI selections,
 * while allowing custom event type strings up to 50 characters.
 */
export const EVENT_TYPE_PRESETS = [
  { value: "wedding", label: "Wedding & Reception" },
  { value: "birthday", label: "Birthday Party & Milestone" },
  { value: "community", label: "Community Event & Gathering" },
  { value: "conference", label: "Conference & Summit" },
  { value: "corporate", label: "Corporate Offsite / Meeting" },
  { value: "meetup", label: "Community Meetup" },
  { value: "gala", label: "Gala & Fundraiser" },
  { value: "workshop", label: "Workshop & Training" },
  { value: "social", label: "Social Celebration & Party" },
  { value: "exhibition", label: "Exhibition & Trade Show" },
  { value: "other", label: "Other / Custom" },
] as const;

/**
 * Helper schema for optional multiline text fields.
 * Trims whitespace and converts empty strings to null for clean DB storage.
 */
const optionalTextSchema = (maxLength: number, fieldName: string) =>
  z.preprocess(
    (val) => {
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
  );

/**
 * Safe date validator.
 * Accepts ISO strings, Date objects, or YYYY-MM-DD / datetime-local values.
 * Converts empty strings / undefined to null.
 * Rejects unparseable or extreme dates without false rejections from timezone offsets.
 */
export const eventDateSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === "") return null;
    return val;
  },
  z.union([
    z.null(),
    z
      .string()
      .or(z.date())
      .transform((val, ctx) => {
        const dateObj = val instanceof Date ? val : new Date(val);
        if (isNaN(dateObj.getTime())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter a valid date and time.",
          });
          return z.NEVER;
        }
        const year = dateObj.getFullYear();
        if (year < 2000 || year > 2100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Event date year must be between 2000 and 2100.",
          });
          return z.NEVER;
        }
        return dateObj.toISOString();
      }),
  ])
);

/**
 * Guest count schema:
 * - Must be nonnegative integer (>= 0).
 * - Defaults to 0 if omitted or empty.
 * - Rejects non-finite, NaN, Infinity, negative values.
 */
export const guestCountSchema = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    return val;
  },
  z.coerce
    .number("Guest count must be a valid number.")
    .refine((n) => Number.isFinite(n), "Guest count must be a finite number.")
    .refine((n) => Number.isInteger(n), "Guest count must be a whole number.")
    .refine((n) => n >= 0, "Guest count cannot be negative.")
    .refine(
      (n) => n <= 10_000_000,
      "Guest count cannot exceed 10,000,000 attendees."
    )
    .default(0)
);

/**
 * Budget schema:
 * - Must be nonnegative (>= 0).
 * - Conforms to database NUMERIC(12, 2) constraint.
 * - Rejects non-finite, NaN, Infinity, negative values.
 * - Rounds to 2 decimal places.
 */
export const budgetSchema = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    return val;
  },
  z.coerce
    .number("Budget must be a valid number.")
    .refine((n) => Number.isFinite(n), "Budget must be a finite number.")
    .refine((n) => n >= 0, "Budget cannot be negative.")
    .refine(
      (n) => n <= 999_999_999.99,
      "Budget cannot exceed 999,999,999.99."
    )
    .transform((n) => Math.round(n * 100) / 100)
    .default(0)
);

/**
 * UUID validator for event IDs.
 */
export const eventIdSchema = z
  .string("Event ID is required.")
  .uuid("Event ID must be a valid UUID.");

/**
 * Base Event Schema defining all editable fields and their validation rules.
 * Does not set defaults so that partial updates only contain explicitly provided fields.
 */
export const baseEventSchema = z.object({
  name: z
    .string("Event name is required.")
    .trim()
    .min(2, "Event name must be at least 2 characters.")
    .max(150, "Event name must not exceed 150 characters."),
  event_type: z
    .string("Event type is required.")
    .trim()
    .min(2, "Event type must be at least 2 characters.")
    .max(50, "Event type must not exceed 50 characters."),
  event_date: eventDateSchema,
  location: optionalTextSchema(300, "Location"),
  guest_count: guestCountSchema,
  budget: budgetSchema,
  preferences: optionalTextSchema(2000, "Preferences"),
  constraints: optionalTextSchema(2000, "Planning constraints"),
  cultural_requirements: optionalTextSchema(2000, "Cultural requirements"),
  status: z.enum(EVENT_STATUSES),
});

/**
 * Complete Event Creation Validation Schema.
 * User-editable inputs only; id, user_id, and timestamps are strictly excluded.
 * Extends baseEventSchema and applies default status 'draft'.
 */
export const createEventSchema = baseEventSchema.extend({
  status: z.enum(EVENT_STATUSES).default("draft"),
});

/**
 * Event Update Validation Schema.
 * Allows partial updates; enforces at least one field to be present.
 * Uses baseEventSchema.partial() so omitted fields stay omitted and defaults are not injected.
 */
export const updateEventSchema = baseEventSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided to update the event."
  );

// Inferred TypeScript types
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventFormValues = z.input<typeof createEventSchema>;

// Re-export Database Event Row type for downstream consumers
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
