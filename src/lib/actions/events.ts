"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  type EventRow,
} from "@/lib/validations/event";
import type { ActionResult } from "@/types/actions";

/**
 * Creates a new event workspace record.
 * 
 * Security:
 * - Derives user identity strictly from `supabase.auth.getUser()`.
 * - Injects `user_id` from the verified session, ignoring any client claims.
 * - Enforces schema validation before querying the database.
 */
export async function createEventAction(
  input: unknown
): Promise<ActionResult<EventRow>> {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required. Please sign in to create an event.",
      };
    }

    const supabase = await createClient();

    const parseResult = createEventSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const payload = parseResult.data;

    // Secure insert: user_id is set exclusively from the verified server session
    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        name: payload.name,
        event_type: payload.event_type,
        event_date: payload.event_date,
        location: payload.location,
        guest_count: payload.guest_count,
        budget: payload.budget,
        preferences: payload.preferences,
        constraints: payload.constraints,
        cultural_requirements: payload.cultural_requirements,
        status: payload.status,
      })
      .select()
      .single();

    if (insertError || !newEvent) {
      console.error("[createEventAction] Database error:", insertError?.message);
      return {
        success: false,
        error: "Failed to create event. Please verify your details and try again.",
      };
    }

    revalidatePath("/dashboard");
    return { success: true, data: newEvent };
  } catch (error) {
    console.error("[createEventAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while saving the event.",
    };
  }
}

/**
 * Updates an existing event owned by the authenticated user.
 * 
 * Security:
 * - Enforces UUID formatting for event ID.
 * - Scopes the SQL UPDATE with both `id = eventId` AND `user_id = user.id`.
 * - Prevents modification of `user_id` or `id`.
 */
export async function updateEventAction(
  id: string,
  input: unknown
): Promise<ActionResult<EventRow>> {
  try {
    const idParse = eventIdSchema.safeParse(id);
    if (!idParse.success) {
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
        error: "Authentication required. Please sign in to update this event.",
      };
    }

    const supabase = await createClient();

    const parseResult = updateEventSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const payload = parseResult.data;

    // Defense-in-depth: Application query is scoped strictly to user.id,
    // backed by PostgreSQL RLS events_update_own
    const { data: updatedEvent, error: updateError } = await supabase
      .from("events")
      .update(payload)
      .eq("id", idParse.data)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !updatedEvent) {
      console.error("[updateEventAction] Database error:", updateError?.message);
      return {
        success: false,
        error: "Event not found or you do not have permission to modify it.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/events/${idParse.data}`);
    return { success: true, data: updatedEvent };
  } catch (error) {
    console.error("[updateEventAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating the event.",
    };
  }
}

/**
 * Deletes an event owned by the authenticated user.
 * 
 * Security:
 * - Scopes deletion by both event ID AND user_id.
 * - Relying on cascade constraints to delete child items cleanly.
 */
export async function deleteEventAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const idParse = eventIdSchema.safeParse(id);
    if (!idParse.success) {
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
        error: "Authentication required. Please sign in to delete this event.",
      };
    }

    const supabase = await createClient();

    // Defense-in-depth: Explicit tenant match + RLS events_delete_own
    const { data: deletedRow, error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", idParse.data)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (deleteError || !deletedRow) {
      console.error("[deleteEventAction] Database error:", deleteError?.message);
      return {
        success: false,
        error: "Event not found or you do not have permission to delete it.",
      };
    }

    revalidatePath("/dashboard");
    return { success: true, data: { id: deletedRow.id } };
  } catch (error) {
    console.error("[deleteEventAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while deleting the event.",
    };
  }
}

/**
 * Request-scoped cached event loader.
 * Deduplicates identical event queries within the same request lifecycle (e.g.
 * generateMetadata and EventDetailPage sharing the same fetch).
 */
const fetchEventByIdCached = cache(
  async (id: string, userId: string): Promise<ActionResult<EventRow>> => {
    const supabase = await createClient();
    const { data: event, error: selectError } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (selectError || !event) {
      return {
        success: false,
        error: "Event not found or you do not have permission to view it.",
      };
    }

    return { success: true, data: event };
  }
);

/**
 * Fetches a single event by ID for the authenticated owner.
 * 
 * Security:
 * - Scopes select by ID and user_id.
 * - Prevents cross-tenant event inspection.
 * - Deduplicates reads within the same request lifecycle via React cache().
 */
export async function getEventById(
  id: string
): Promise<ActionResult<EventRow>> {
  try {
    const idParse = eventIdSchema.safeParse(id);
    if (!idParse.success) {
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
        error: "Authentication required to view this event.",
      };
    }

    return await fetchEventByIdCached(idParse.data, user.id);
  } catch (error) {
    console.error("[getEventById] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while retrieving the event.",
    };
  }
}

/**
 * Lists all events owned by the authenticated user, ordered by creation date.
 * 
 * Security:
 * - Returns only records matching `user_id = user.id`.
 * - Empty list returned cleanly when no events exist.
 */
export async function listEvents(): Promise<ActionResult<EventRow[]>> {
  try {
    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to list events.",
      };
    }

    const supabase = await createClient();

    const { data: events, error: selectError } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (selectError) {
      console.error("[listEvents] Database error:", selectError.message);
      return {
        success: false,
        error: "Failed to retrieve events. Please try again later.",
      };
    }

    return { success: true, data: events ?? [] };
  } catch (error) {
    console.error("[listEvents] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while retrieving events.",
    };
  }
}
