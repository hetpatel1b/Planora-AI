"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  updateTaskSchema,
  toggleTaskStatusSchema,
  taskIdSchema,
  eventIdSchema,
  type TaskRow,
  type TaskStatus,
} from "@/lib/validations/task";
import type { ActionResult } from "@/lib/actions/events";

/**
 * Retrieves all checklist tasks for an event owned by the authenticated user.
 *
 * Security:
 * - Scoped by verified session user_id and event_id.
 * - Prevents cross-tenant task access.
 */
export async function getTasksByEventId(
  eventId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<ActionResult<TaskRow[]>> {
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
        error: "Authentication required to view tasks.",
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

    // Retrieve tasks ordered by due_date ascending, then created_at
    const { data: tasks, error: queryError } = await supabase
      .from("tasks")
      .select("*")
      .eq("event_id", eventIdParse.data)
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (queryError) {
      console.error("[getTasksByEventId] Database error:", queryError.message);
      return {
        success: false,
        error: "Failed to retrieve checklist tasks.",
      };
    }

    return {
      success: true,
      data: tasks ?? [],
    };
  } catch (error) {
    console.error("[getTasksByEventId] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while retrieving tasks.",
    };
  }
}

/**
 * Creates a new task for an event owned by the authenticated user.
 */
export async function createTaskAction(
  eventId: string,
  input: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<ActionResult<TaskRow>> {
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
        error: "Authentication required to create a task.",
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

    const parseResult = createTaskSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed. Please check the highlighted fields.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const payload = parseResult.data;

    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        event_id: eventIdParse.data,
        user_id: user.id,
        title: payload.title,
        description: payload.description,
        due_date: payload.due_date,
        priority: payload.priority,
        status: payload.status,
        is_vendor_checklist: payload.is_vendor_checklist,
      })
      .select("*")
      .single();

    if (insertError || !newTask) {
      console.error("[createTaskAction] Database insert error:", insertError?.message);
      return {
        success: false,
        error: "Failed to save the task. Please try again.",
      };
    }

    try {
      revalidatePath(`/dashboard/events/${eventIdParse.data}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }

    return {
      success: true,
      data: newTask,
    };
  } catch (error) {
    console.error("[createTaskAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while creating the task.",
    };
  }
}

/**
 * Updates an existing task owned by the authenticated user.
 */
export async function updateTaskAction(
  id: string,
  eventId: string,
  input: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<ActionResult<TaskRow>> {
  try {
    const idParse = taskIdSchema.safeParse(id);
    if (!idParse.success) {
      return {
        success: false,
        error: "Invalid task ID format.",
      };
    }

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
        error: "Authentication required to update a task.",
      };
    }

    const parseResult = updateTaskSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed. Please check your updates.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const updates = parseResult.data;

    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({
        ...updates,
      })
      .eq("id", idParse.data)
      .eq("event_id", eventIdParse.data)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError || !updatedTask) {
      console.error("[updateTaskAction] Database update error:", updateError?.message);
      return {
        success: false,
        error: "Failed to update task. It may have been deleted or access was denied.",
      };
    }

    try {
      revalidatePath(`/dashboard/events/${eventIdParse.data}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error("[updateTaskAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating the task.",
    };
  }
}

/**
 * Convenience action for toggling a task's status (e.g. pending <-> completed).
 */
export async function toggleTaskStatusAction(
  id: string,
  eventId: string,
  targetStatus: TaskStatus,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<ActionResult<TaskRow>> {
  try {
    const idParse = taskIdSchema.safeParse(id);
    if (!idParse.success) {
      return {
        success: false,
        error: "Invalid task ID format.",
      };
    }

    const eventIdParse = eventIdSchema.safeParse(eventId);
    if (!eventIdParse.success) {
      return {
        success: false,
        error: "Invalid event ID format.",
      };
    }

    const statusParse = toggleTaskStatusSchema.safeParse({ status: targetStatus });
    if (!statusParse.success) {
      return {
        success: false,
        error: "Invalid task status.",
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
        error: "Authentication required to modify task status.",
      };
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({
        status: statusParse.data.status,
      })
      .eq("id", idParse.data)
      .eq("event_id", eventIdParse.data)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError || !updatedTask) {
      console.error("[toggleTaskStatusAction] Database error:", updateError?.message);
      return {
        success: false,
        error: "Failed to update task status.",
      };
    }

    try {
      revalidatePath(`/dashboard/events/${eventIdParse.data}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }

    return {
      success: true,
      data: updatedTask,
    };
  } catch (error) {
    console.error("[toggleTaskStatusAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while modifying task status.",
    };
  }
}

/**
 * Deletes a task owned by the authenticated user.
 */
export async function deleteTaskAction(
  id: string,
  eventId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<ActionResult<{ id: string }>> {
  try {
    const idParse = taskIdSchema.safeParse(id);
    if (!idParse.success) {
      return {
        success: false,
        error: "Invalid task ID format.",
      };
    }

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
        error: "Authentication required to delete a task.",
      };
    }

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", idParse.data)
      .eq("event_id", eventIdParse.data)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[deleteTaskAction] Database delete error:", deleteError.message);
      return {
        success: false,
        error: "Failed to delete task. Access denied or task not found.",
      };
    }

    try {
      revalidatePath(`/dashboard/events/${eventIdParse.data}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }

    return {
      success: true,
      data: { id: idParse.data },
    };
  } catch (error) {
    console.error("[deleteTaskAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while deleting the task.",
    };
  }
}
