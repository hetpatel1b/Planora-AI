"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateEventPlan, type EventPlanInput } from "@/lib/plan-generator";
import {
  aiPlanBlueprintSchema,
  acceptPlanBlueprintInputSchema,
  type AIPlanBlueprint,
  type PlanRevisionRow,
} from "@/lib/validations/plan";
import { eventIdSchema } from "@/lib/validations/event";
import { createBudgetItemSchema } from "@/lib/validations/budget";
import { createTaskSchema } from "@/lib/validations/task";
import type { ActionResult } from "@/lib/actions/events";
import type { Json } from "@/types/database.types";

/**
 * Calculates a task due date relative to the event date and daysBefore offset.
 */
function calculateTaskDueDate(
  eventDateStr: string | null | undefined,
  daysBefore: number | null | undefined
): string | null {
  if (!eventDateStr || daysBefore === null || daysBefore === undefined) {
    return null;
  }
  const eventTime = new Date(eventDateStr).getTime();
  if (isNaN(eventTime)) return null;

  const dueTime = eventTime - daysBefore * 24 * 60 * 60 * 1000;
  const dueDate = new Date(dueTime);
  const year = dueDate.getFullYear();
  if (year < 2000 || year > 2100) return null;

  return dueDate.toISOString();
}

/**
 * Action A: Generate an Event Plan Blueprint (Read-Only)
 *
 * Authenticates user, verifies event ownership, runs deterministic plan generation,
 * and validates the resulting blueprint against strict schema bounds.
 *
 * This operation is purely read-only: it does NOT mutate the database.
 */
export async function generateEventPlanAction(
  eventId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<ActionResult<AIPlanBlueprint>> {
  try {
    const eventIdParse = eventIdSchema.safeParse(eventId);
    if (!eventIdParse.success) {
      return {
        success: false,
        error: "Invalid event ID format.",
      };
    }

    const supabase = supabaseClient ?? (await createClient());
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to generate an event plan.",
      };
    }

    // Verify event ownership and fetch saved event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventIdParse.data)
      .eq("user_id", user.id)
      .single();

    if (eventError || !event) {
      return {
        success: false,
        error: "Event not found or access denied.",
      };
    }

    // Map database fields to EventPlanInput
    const planInput: EventPlanInput = {
      name: event.name,
      event_type: event.event_type,
      event_date: event.event_date,
      location: event.location,
      guest_count: event.guest_count,
      budget: event.budget,
      preferences: event.preferences,
      constraints: event.constraints,
      cultural_requirements: event.cultural_requirements,
    };

    // Deterministic generation
    const rawBlueprint = generateEventPlan(planInput);

    // Strict validation
    const validation = aiPlanBlueprintSchema.safeParse(rawBlueprint);
    if (!validation.success) {
      console.error("[generateEventPlanAction] Blueprint validation failed:", validation.error);
      return {
        success: false,
        error: "Generated event plan failed schema validation constraints.",
      };
    }

    return {
      success: true,
      data: validation.data,
    };
  } catch (error) {
    console.error("[generateEventPlanAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while generating the event plan.",
    };
  }
}

/**
 * Action B: Retrieve the Latest Saved Plan Revision
 *
 * Retrieves the most recent plan revision for the specified event,
 * scoping queries by authenticated user ID and event ID.
 */
export async function getLatestPlanRevisionAction(
  eventId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<ActionResult<PlanRevisionRow | null>> {
  try {
    const eventIdParse = eventIdSchema.safeParse(eventId);
    if (!eventIdParse.success) {
      return {
        success: false,
        error: "Invalid event ID format.",
      };
    }

    const supabase = supabaseClient ?? (await createClient());
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to retrieve plan revisions.",
      };
    }

    // Verify event ownership
    const { data: event, error: eventCheckError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventIdParse.data)
      .eq("user_id", user.id)
      .single();

    if (eventCheckError || !event) {
      return {
        success: false,
        error: "Event not found or access denied.",
      };
    }

    // 1. Query for explicitly active revision
    const { data: activeRevisions, error: activeQueryError } = await supabase
      .from("plan_revisions")
      .select("*")
      .eq("event_id", eventIdParse.data)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("revision_number", { ascending: false })
      .limit(1);

    let latest: PlanRevisionRow | null = null;
    if (!activeQueryError && activeRevisions && activeRevisions.length > 0) {
      latest = activeRevisions[0];
    } else {
      // Fallback for historical data where is_active may not have been populated
      const { data: fallbackRevisions, error: fallbackError } = await supabase
        .from("plan_revisions")
        .select("*")
        .eq("event_id", eventIdParse.data)
        .eq("user_id", user.id)
        .order("revision_number", { ascending: false })
        .limit(1);

      if (fallbackError) {
        console.error("[getLatestPlanRevisionAction] Database error:", fallbackError.message);
        return {
          success: false,
          error: "Failed to retrieve plan revision.",
        };
      }
      latest = fallbackRevisions?.[0] ?? null;
    }

    if (!latest) {
      return {
        success: true,
        data: null,
      };
    }

    // Validate the stored structured_plan schema
    const planParse = aiPlanBlueprintSchema.safeParse(latest.structured_plan);
    if (!planParse.success) {
      console.error("[getLatestPlanRevisionAction] Stored plan failed schema validation:", planParse.error);
      return {
        success: false,
        error: "Stored plan revision contains invalid structured data.",
      };
    }

    return {
      success: true,
      data: latest,
    };
  } catch (error) {
    console.error("[getLatestPlanRevisionAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while retrieving the latest plan revision.",
    };
  }
}

/**
 * Action C: Accept and Apply a Plan Blueprint (Atomic Replacement)
 *
 * Atomically persists an accepted blueprint to `public.plan_revisions` as the newly
 * active revision, purges previous AI-generated tasks and budget items, strictly preserves
 * all manually created user items, and inserts the newly selected tasks and budget items.
 *
 * Invariants:
 * - Operates as an atomic database transaction via public.accept_plan_blueprint RPC.
 * - Deletes only previous records that have plan_revision_id IS NOT NULL.
 * - Never deletes or modifies manual user records (plan_revision_id IS NULL).
 * - Enforces event ownership and authentication.
 * - Revalidates the event workspace route upon success.
 */
export async function acceptPlanBlueprintAction(
  input: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<ActionResult<PlanRevisionRow>> {
  try {
    const parseResult = acceptPlanBlueprintInputSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Invalid plan acceptance request. Please review your selections.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const {
      eventId,
      blueprint,
      selectedTaskIndexes = [],
      selectedBudgetItemIndexes = [],
    } = parseResult.data;

    const supabase = supabaseClient ?? (await createClient());
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to accept plan blueprint.",
      };
    }

    // Verify event ownership and fetch event date for task due date calculation
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, event_date")
      .eq("id", eventId)
      .eq("user_id", user.id)
      .single();

    if (eventError || !event) {
      return {
        success: false,
        error: "Event not found or access denied.",
      };
    }

    // Validate task index bounds and uniqueness
    const taskCount = blueprint.suggestedTasks.length;
    for (const idx of selectedTaskIndexes) {
      if (idx < 0 || idx >= taskCount) {
        return {
          success: false,
          error: `Selected task index ${idx} is out of bounds (max ${taskCount - 1}).`,
        };
      }
    }
    if (new Set(selectedTaskIndexes).size !== selectedTaskIndexes.length) {
      return {
        success: false,
        error: "Duplicate task selections are not permitted.",
      };
    }

    // Validate budget item index bounds and uniqueness
    const budgetCount = blueprint.proposedBudgetItems.length;
    for (const idx of selectedBudgetItemIndexes) {
      if (idx < 0 || idx >= budgetCount) {
        return {
          success: false,
          error: `Selected budget item index ${idx} is out of bounds (max ${budgetCount - 1}).`,
        };
      }
    }
    if (new Set(selectedBudgetItemIndexes).size !== selectedBudgetItemIndexes.length) {
      return {
        success: false,
        error: "Duplicate budget item selections are not permitted.",
      };
    }

    // Validate and prepare proposed budget items
    const budgetRowsToInsert = [];
    for (const idx of selectedBudgetItemIndexes) {
      const item = blueprint.proposedBudgetItems[idx];
      const itemValidation = createBudgetItemSchema.safeParse({
        category: item.category,
        item_name: item.item_name,
        estimated_amount: item.estimated_amount,
        actual_amount: 0,
        notes: item.notes ?? null,
      });

      if (!itemValidation.success) {
        console.error("[acceptPlanBlueprintAction] Budget item validation error:", itemValidation.error);
        return {
          success: false,
          error: `A proposed budget item failed validation: ${item.item_name}.`,
        };
      }

      budgetRowsToInsert.push({
        category: itemValidation.data.category,
        item_name: itemValidation.data.item_name,
        estimated_amount: itemValidation.data.estimated_amount,
        actual_amount: itemValidation.data.actual_amount,
        notes: itemValidation.data.notes,
      });
    }

    // Validate and prepare suggested tasks
    const taskRowsToInsert = [];
    for (const idx of selectedTaskIndexes) {
      const task = blueprint.suggestedTasks[idx];
      const dueDate = calculateTaskDueDate(event.event_date, task.suggested_days_before);

      const taskValidation = createTaskSchema.safeParse({
        title: task.title,
        description: task.description ?? null,
        due_date: dueDate,
        priority: task.priority,
        status: "pending",
        is_vendor_checklist: task.is_vendor_checklist,
      });

      if (!taskValidation.success) {
        console.error("[acceptPlanBlueprintAction] Task validation error:", taskValidation.error);
        return {
          success: false,
          error: `A suggested task failed validation: ${task.title}.`,
        };
      }

      taskRowsToInsert.push({
        title: taskValidation.data.title,
        description: taskValidation.data.description,
        due_date: taskValidation.data.due_date,
        priority: taskValidation.data.priority,
        status: taskValidation.data.status,
        is_vendor_checklist: taskValidation.data.is_vendor_checklist,
      });
    }

    // Execute atomic replacement transaction via PostgreSQL RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "accept_plan_blueprint",
      {
        p_event_id: eventId,
        p_user_id: user.id,
        p_structured_plan: blueprint as unknown as Json,
        p_summary: blueprint.summary,
        p_tasks: taskRowsToInsert as unknown as Json,
        p_budget_items: budgetRowsToInsert as unknown as Json,
      }
    );

    if (rpcError) {
      console.error("[acceptPlanBlueprintAction] Transaction RPC error:", rpcError.message);
      if (rpcError.code === "23505") {
        return {
          success: false,
          error: "A plan revision conflict occurred due to concurrent updates. Please refresh and try again.",
        };
      }
      if (rpcError.code === "P0002") {
        return {
          success: false,
          error: "Event not found or access denied.",
        };
      }
      if (rpcError.code === "42501") {
        return {
          success: false,
          error: "Unauthorized to accept plan blueprint for this event.",
        };
      }
      return {
        success: false,
        error: rpcError.message || "Failed to save plan revision. Please try again.",
      };
    }

    if (!rpcData) {
      return {
        success: false,
        error: "Failed to apply plan revision: No data returned from database transaction.",
      };
    }

    const insertedRevision = rpcData as unknown as PlanRevisionRow;

    // Revalidate event workspace page
    try {
      revalidatePath(`/dashboard/events/${eventId}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }

    return {
      success: true,
      data: insertedRevision,
    };
  } catch (error) {
    console.error("[acceptPlanBlueprintAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while accepting the plan blueprint.",
    };
  }
}
