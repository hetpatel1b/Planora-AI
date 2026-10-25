"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import {
  createBudgetItemSchema,
  updateBudgetItemSchema,
  budgetItemIdSchema,
  eventIdSchema,
  type BudgetItemRow,
} from "@/lib/validations/budget";
import type { ActionResult } from "@/types/actions";

/**
 * Retrieves all budget line items for an event owned by the authenticated user.
 * 
 * Security:
 * - Scopes queries by verified `user.id` and `event_id`.
 * - Prevents cross-tenant line-item access.
 */
export async function getBudgetItemsByEventId(
  eventId: string
): Promise<ActionResult<BudgetItemRow[]>> {
  try {
    const eventIdParse = eventIdSchema.safeParse(eventId);
    if (!eventIdParse.success) {
      return {
        success: false,
        error: "Invalid event ID format.",
      };
    }

    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to view budget items.",
      };
    }

    const supabase = await createClient();

    const { data: items, error: selectError } = await supabase
      .from("budget_items")
      .select("*")
      .eq("event_id", eventIdParse.data)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (selectError) {
      console.error("[getBudgetItemsByEventId] Database error:", selectError.message);
      return {
        success: false,
        error: "Failed to retrieve budget items. Please try again.",
      };
    }

    return { success: true, data: items ?? [] };
  } catch (error) {
    console.error("[getBudgetItemsByEventId] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while retrieving budget items.",
    };
  }
}

/**
 * Creates a new budget line item for an event owned by the authenticated user.
 * 
 * Security:
 * - Injects `user_id` strictly from server session.
 * - Validates inputs against `createBudgetItemSchema`.
 * - PostgreSQL RLS policy `budget_items_insert_own` and composite FK guarantee
 *   the parent event is owned by this user.
 */
export async function createBudgetItemAction(
  eventId: string,
  input: unknown
): Promise<ActionResult<BudgetItemRow>> {
  try {
    const eventIdParse = eventIdSchema.safeParse(eventId);
    if (!eventIdParse.success) {
      return {
        success: false,
        error: "Invalid event ID format.",
      };
    }

    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required. Please sign in to add an expense.",
      };
    }

    const supabase = await createClient();

    const parseResult = createBudgetItemSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const payload = parseResult.data;

    // First verify event ownership
    const { data: event, error: eventCheckError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventIdParse.data)
      .eq("user_id", user.id)
      .single();

    if (eventCheckError || !event) {
      return {
        success: false,
        error: "Event workspace not found or you do not have permission to modify it.",
      };
    }

    const { data: newItem, error: insertError } = await supabase
      .from("budget_items")
      .insert({
        event_id: eventIdParse.data,
        user_id: user.id,
        category: payload.category,
        item_name: payload.item_name,
        estimated_amount: payload.estimated_amount,
        actual_amount: payload.actual_amount,
        notes: payload.notes,
      })
      .select()
      .single();

    if (insertError || !newItem) {
      console.error("[createBudgetItemAction] Database error:", insertError?.message);
      return {
        success: false,
        error: "Failed to add budget item. Please check your amounts and try again.",
      };
    }

    try {
      revalidatePath(`/dashboard/events/${eventIdParse.data}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }
    return { success: true, data: newItem };
  } catch (error) {
    console.error("[createBudgetItemAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while saving the budget item.",
    };
  }
}

/**
 * Updates an existing budget item owned by the authenticated user.
 * 
 * Security:
 * - Scoped by `id`, `event_id`, and `user_id`.
 * - Prevents modification of `user_id`, `event_id`, or `id`.
 */
export async function updateBudgetItemAction(
  id: string,
  eventId: string,
  input: unknown
): Promise<ActionResult<BudgetItemRow>> {
  try {
    const idParse = budgetItemIdSchema.safeParse(id);
    if (!idParse.success) {
      return {
        success: false,
        error: "Invalid budget item ID format.",
      };
    }

    const eventIdParse = eventIdSchema.safeParse(eventId);
    if (!eventIdParse.success) {
      return {
        success: false,
        error: "Invalid event ID format.",
      };
    }

    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to update this budget item.",
      };
    }

    const supabase = await createClient();

    const parseResult = updateBudgetItemSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const payload = parseResult.data;

    // Defense-in-depth: Scoped strictly to item id, event id, and user id
    const { data: updatedItem, error: updateError } = await supabase
      .from("budget_items")
      .update(payload)
      .eq("id", idParse.data)
      .eq("event_id", eventIdParse.data)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !updatedItem) {
      console.error("[updateBudgetItemAction] Database error:", updateError?.message);
      return {
        success: false,
        error: "Budget item not found or you do not have permission to modify it.",
      };
    }

    try {
      revalidatePath(`/dashboard/events/${eventIdParse.data}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }
    return { success: true, data: updatedItem };
  } catch (error) {
    console.error("[updateBudgetItemAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating the budget item.",
    };
  }
}

/**
 * Deletes a budget item owned by the authenticated user.
 * 
 * Security:
 * - Scoped by `id`, `event_id`, and `user_id`.
 */
export async function deleteBudgetItemAction(
  id: string,
  eventId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const idParse = budgetItemIdSchema.safeParse(id);
    if (!idParse.success) {
      return {
        success: false,
        error: "Invalid budget item ID format.",
      };
    }

    const eventIdParse = eventIdSchema.safeParse(eventId);
    if (!eventIdParse.success) {
      return {
        success: false,
        error: "Invalid event ID format.",
      };
    }

    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to delete this budget item.",
      };
    }

    const supabase = await createClient();

    // Defense-in-depth: Scoped strictly to item id, event id, and user id
    const { data: deletedRow, error: deleteError } = await supabase
      .from("budget_items")
      .delete()
      .eq("id", idParse.data)
      .eq("event_id", eventIdParse.data)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (deleteError || !deletedRow) {
      console.error("[deleteBudgetItemAction] Database error:", deleteError?.message);
      return {
        success: false,
        error: "Budget item not found or you do not have permission to delete it.",
      };
    }

    try {
      revalidatePath(`/dashboard/events/${eventIdParse.data}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }
    return { success: true, data: { id: deletedRow.id } };
  } catch (error) {
    console.error("[deleteBudgetItemAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while deleting the budget item.",
    };
  }
}
