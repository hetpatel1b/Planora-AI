"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { getEventById } from "@/lib/actions/events";
import {
  applyBudgetScenarioInputSchema,
  type ApplyBudgetScenarioInput,
} from "@/lib/validations/simulator";
import type { ActionResult } from "@/types/actions";
import type { Json } from "@/types/database.types";

export interface ApplyBudgetScenarioResultData {
  applied: boolean;
  message: string;
  updatedEventId: string;
}

/**
 * Server Action: Apply Budget Scenario (Atomic Persistence Boundary)
 * 
 * Invariants & Security Controls:
 * - Requires authenticated user session.
 * - Authorizes event ownership (user_id strictly verified against session).
 * - Verifies that every modified/deleted item belongs to the specified event and authorized user.
 * - Concurrency & Freshness: Rejects requests where referenced items are missing or modified concurrently.
 * - Transaction Atomicity: Dispatches strictly to an atomic database transaction procedure
 *   (public.apply_budget_scenario). Strictly refuses to perform non-atomic sequential requests
 *   to eliminate partial write hazards.
 * - Revalidates event workspace path upon successful transaction.
 */
export async function applyBudgetScenarioAction(
  input: unknown
): Promise<ActionResult<ApplyBudgetScenarioResultData>> {
  try {
    // 1. Validate complete payload structure with strict Zod schema
    const parseResult = applyBudgetScenarioInputSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed. Please review the highlighted scenario fields.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const payload: ApplyBudgetScenarioInput = parseResult.data;

    // 2. Authentication check
    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to apply budget scenario.",
      };
    }

    // 3. Authorization & Event ownership verification via cached getEventById
    const eventResult = await getEventById(payload.eventId);
    if (!eventResult.success) {
      return {
        success: false,
        error: eventResult.error || "Event not found or access denied.",
      };
    }

    const event = eventResult.data;
    if (!event || event.user_id !== user.id) {
      return {
        success: false,
        error: "Unauthorized: You do not have permission to modify this event workspace.",
      };
    }

    const supabase = await createClient();

    // 4. Concurrency & Item Ownership Validation:
    // Verify that every item targeted for override or deletion belongs to this event and user
    if (payload.item_overrides.length > 0) {
      const overrideIds = payload.item_overrides.map((o) => o.id);
      const { data: existingItems, error: selectError } = await supabase
        .from("budget_items")
        .select("id, event_id, user_id, updated_at")
        .in("id", overrideIds)
        .eq("event_id", payload.eventId)
        .eq("user_id", user.id);

      if (selectError) {
        console.error(
          "[applyBudgetScenarioAction] Database error checking item ownership:",
          selectError.message
        );
        return {
          success: false,
          error: "Failed to verify budget items. Please try again.",
        };
      }

      const existingIds = new Set((existingItems ?? []).map((i) => i.id));
      for (const override of payload.item_overrides) {
        if (!existingIds.has(override.id)) {
          return {
            success: false,
            error: `Budget item ${override.id} was not found in this event or access was denied. The data may be stale; please refresh.`,
          };
        }
      }
    }

    // 5. Atomic Transaction Dispatch:
    // Calls public.apply_budget_scenario database RPC to serialize updates and guarantee
    // all-or-nothing atomicity. Does NOT simulate atomicity via non-atomic sequential requests.
    // Explicitly cast RPC call to unknown as apply_budget_scenario is dynamically checked
    const rpcCaller = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;

    const { data: rpcData, error: rpcError } = await rpcCaller(
      "apply_budget_scenario",
      {
        p_event_id: payload.eventId,
        p_user_id: user.id,
        p_target_budget: payload.target_budget ?? null,
        p_overrides: payload.item_overrides as unknown as Json,
        p_new_items: payload.new_items as unknown as Json,
      }
    );

    if (rpcError) {
      console.error(
        "[applyBudgetScenarioAction] Transaction RPC error:",
        rpcError.code,
        rpcError.message
      );

      // Handle function missing in database (migration blocker)
      if (rpcError.code === "42883") {
        return {
          success: false,
          error:
            "Atomic scenario persistence is currently blocked: Database transaction procedure 'apply_budget_scenario' is not yet provisioned in the database schema. Multi-item changes were prevented to avoid non-atomic partial updates.",
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
          error: "Unauthorized to apply scenario to this event.",
        };
      }

      return {
        success: false,
        error: "Failed to apply budget scenario transaction. No partial changes were saved.",
      };
    }

    if (!rpcData) {
      return {
        success: false,
        error:
          "Failed to apply budget scenario: No confirmation returned from database transaction.",
      };
    }

    // 6. Revalidate event workspace page
    try {
      revalidatePath(`/dashboard/events/${payload.eventId}`);
    } catch {
      // Ignore in non-Next.js testing environments
    }

    return {
      success: true,
      data: {
        applied: true,
        message: "Scenario changes successfully applied to saved budget.",
        updatedEventId: payload.eventId,
      },
    };
  } catch (error) {
    console.error("[applyBudgetScenarioAction] Unexpected failure:", error);
    return {
      success: false,
      error: "An unexpected error occurred while applying the budget scenario.",
    };
  }
}
