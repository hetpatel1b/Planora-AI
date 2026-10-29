"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getEventById } from "@/lib/actions/events";
import { getBudgetItemsByEventId } from "@/lib/actions/budget";
import { getTasksByEventId } from "@/lib/actions/tasks";
import { getLatestPlanRevisionAction } from "@/lib/actions/plan";
import { calculateBudgetSummary, calculateCategoryBreakdown } from "@/lib/budget-math";
import { sendGroqChatCompletion } from "@/lib/ai/groq";
import { buildCopilotMessages, type CopilotEventContext } from "@/lib/ai/copilot-prompt";
import {
  copilotRequestSchema,
  copilotResponseEnvelopeSchema,
  type CopilotResponseEnvelope,
} from "@/lib/validations/copilot";
import type { ActionResult } from "@/types/actions";

/**
 * Planora AI — Authenticated Conversational AI Copilot Server Action (Phase 5)
 *
 * Provides a context-aware planning assistant grounded in verified event data.
 *
 * Security & Execution Flow:
 * 1. Validates request schema: enforces valid UUID and max 15 client messages.
 * 2. Authenticates caller strictly via Supabase server-side identity (getUser).
 * 3. Authorizes event access via getEventById (Postgres RLS + user.id matching).
 * 4. Deterministically aggregates budget and checklist summaries in integer cents.
 * 5. Builds an isolated, bounded system prompt with anti-prompt-injection delimiters.
 * 6. Invokes the server-only Groq client with a 30s timeout and categorized error handling.
 * 7. Validates model output through Zod before returning to the client.
 * 8. Never executes database mutations directly; suggestions are returned as advisory data.
 */
export async function askCopilotAction(
  input: unknown
): Promise<ActionResult<CopilotResponseEnvelope>> {
  try {
    // 1. Schema Validation
    const parseResult = copilotRequestSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Invalid copilot request. Please check your message parameters.",
        fieldErrors: parseResult.error.flatten().fieldErrors,
      };
    }

    const { eventId, messages } = parseResult.data;

    // 2. Authentication Check
    const {
      data: { user },
      error: authError,
    } = await getAuthenticatedUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required. Please sign in to consult the copilot.",
      };
    }

    // 3. Authorization & Event Retrieval
    const eventResult = await getEventById(eventId);
    if (!eventResult.success) {
      return {
        success: false,
        error: eventResult.error,
      };
    }

    const event = eventResult.data;

    // 4. Fetch Associated Event Subsystems in Parallel
    const [budgetResult, taskResult, planResult] = await Promise.all([
      getBudgetItemsByEventId(eventId),
      getTasksByEventId(eventId),
      getLatestPlanRevisionAction(eventId),
    ]);

    // 5. Deterministic Budget Aggregation
    const targetBudget = Number(event.budget) || 0;
    const budgetSummary = budgetResult.success
      ? calculateBudgetSummary(targetBudget, budgetResult.data)
      : null;
    const categoryBreakdown = budgetResult.success
      ? calculateCategoryBreakdown(targetBudget, budgetResult.data)
      : [];

    // 6. Checklist Progress Aggregation
    let taskSummary: CopilotEventContext["taskSummary"] = null;
    if (taskResult.success && taskResult.data) {
      const allTasks = taskResult.data;
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter((t) => t.status === "completed").length;
      const pendingTasks = allTasks.filter(
        (t) => t.status === "pending" || t.status === "in_progress"
      ).length;
      const vendorTasksCount = allTasks.filter((t) => t.is_vendor_checklist).length;
      const completedVendorTasksCount = allTasks.filter(
        (t) => t.is_vendor_checklist && t.status === "completed"
      ).length;

      const urgentOrHighTasks = allTasks
        .filter(
          (t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "completed"
        )
        .slice(0, 5)
        .map((t) => ({
          title: t.title,
          priority: t.priority,
          dueDate: t.due_date,
        }));

      taskSummary = {
        totalTasks,
        completedTasks,
        pendingTasks,
        vendorTasksCount,
        completedVendorTasksCount,
        urgentOrHighTasks,
      };
    }

    // 7. Active Plan Revision Aggregation
    let activePlanSummary: CopilotEventContext["activePlanSummary"] = null;
    if (planResult.success && planResult.data) {
      const structured =
        typeof planResult.data.structured_plan === "object" && planResult.data.structured_plan !== null
          ? (planResult.data.structured_plan as Record<string, unknown>)
          : null;

      activePlanSummary = {
        summary: planResult.data.summary,
        themes: Array.isArray(structured?.themes) ? (structured.themes as string[]) : undefined,
        milestonesCount: Array.isArray(structured?.scheduleMilestones)
          ? structured.scheduleMilestones.length
          : undefined,
      };
    }

    // 8. Assemble Sanitized, Bounded Context
    const context: CopilotEventContext = {
      name: event.name,
      eventType: event.event_type,
      eventDate: event.event_date,
      location: event.location,
      guestCount: event.guest_count,
      budget: targetBudget,
      preferences: event.preferences,
      constraints: event.constraints,
      culturalRequirements: event.cultural_requirements,
      status: event.status,
      budgetSummary: budgetSummary
        ? {
            targetBudget: budgetSummary.targetBudget,
            totalEstimated: budgetSummary.totalEstimated,
            totalActual: budgetSummary.totalActual,
            variance: budgetSummary.variance,
            categories: categoryBreakdown.slice(0, 8).map((c) => ({
              category: c.category,
              estimatedTotal: c.totalEstimated,
              actualTotal: c.totalActual,
            })),
          }
        : null,
      taskSummary,
      activePlanSummary,
    };

    // 9. Format Messages with System Directives
    const groqMessages = buildCopilotMessages(context, messages);

    // 10. Call Groq AI Provider
    const completion = await sendGroqChatCompletion({
      messages: groqMessages,
    });

    if (!completion.success) {
      return {
        success: false,
        error: completion.error,
      };
    }

    // 11. Validate Response Envelope
    const validated = copilotResponseEnvelopeSchema.safeParse({
      reply: completion.data.reply,
      suggestions: completion.data.suggestions,
      model: completion.data.model,
      finishReason: completion.data.finishReason,
    });

    if (!validated.success) {
      // Graceful fallback to pure conversational text without structured suggestions
      return {
        success: true,
        data: {
          reply: completion.data.reply,
          suggestions: null,
          model: completion.data.model,
          finishReason: completion.data.finishReason,
        },
      };
    }

    return {
      success: true,
      data: validated.data,
    };
  } catch (error) {
    console.error(
      "[askCopilotAction] Unexpected error:",
      error instanceof Error ? error.message : "Unknown"
    );
    return {
      success: false,
      error: "An unexpected error occurred while communicating with the AI Copilot. Please try again.",
    };
  }
}
