import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: User session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId =
      searchParams.get("eventId") || "7dc7fea8-1222-4c6e-8b8c-52a42c18d98b";

    // 1. Fetch event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, event_date, budget, user_id, event_type, location, created_at")
      .eq("id", eventId)
      .eq("user_id", user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found or access denied." },
        { status: 404 }
      );
    }

    // 2. Fetch plan revisions
    const { data: revisions } = await supabase
      .from("plan_revisions")
      .select("id, revision_number, is_active, summary, created_at")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .order("revision_number", { ascending: false });

    // 3. Fetch tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, plan_revision_id, created_at")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    // 4. Fetch budget items
    const { data: budgetItems } = await supabase
      .from("budget_items")
      .select("id, item_name, category, estimated_amount, actual_amount, plan_revision_id, created_at")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const activeRevision = revisions?.find((r) => r.is_active) ?? null;

    const report = {
      timestamp: new Date().toISOString(),
      event: {
        id: event.id,
        name: event.name,
        eventType: event.event_type,
        eventDate: event.event_date,
        budget: Number(event.budget) || 0,
        createdAt: event.created_at,
      },
      ownershipVerified: event.user_id === user.id,
      activeRevision: activeRevision
        ? {
            id: activeRevision.id,
            revisionNumber: activeRevision.revision_number,
            isActive: activeRevision.is_active,
            summary: activeRevision.summary,
            createdAt: activeRevision.created_at,
          }
        : null,
      totalRevisions: revisions?.length ?? 0,
      allRevisions: revisions?.map((r) => ({
        id: r.id,
        revisionNumber: r.revision_number,
        isActive: r.is_active,
        createdAt: r.created_at,
      })) ?? [],
      tasks: {
        count: tasks?.length ?? 0,
        items:
          tasks?.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.due_date,
            planRevisionId: t.plan_revision_id,
            isPlanRevisionIdNull: t.plan_revision_id === null,
            createdAt: t.created_at,
          })) ?? [],
      },
      budgetItems: {
        count: budgetItems?.length ?? 0,
        items:
          budgetItems?.map((b) => ({
            id: b.id,
            itemName: b.item_name,
            category: b.category,
            estimatedAmount: b.estimated_amount,
            actualAmount: b.actual_amount,
            planRevisionId: b.plan_revision_id,
            isPlanRevisionIdNull: b.plan_revision_id === null,
            createdAt: b.created_at,
          })) ?? [],
      },
      isEmptyAndSafe:
        (tasks?.length ?? 0) === 0 &&
        (budgetItems?.length ?? 0) === 0 &&
        (revisions?.length ?? 0) === 0,
    };

    return NextResponse.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected inspection error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
