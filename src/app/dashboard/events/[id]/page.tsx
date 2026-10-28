import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getEventById } from "@/lib/actions/events";
import { getBudgetItemsByEventId } from "@/lib/actions/budget";
import { getLatestPlanRevisionAction } from "@/lib/actions/plan";
import { getTasksByEventId } from "@/lib/actions/tasks";
import { EventCommandCenter } from "@/components/events/command-center/event-command-center";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tag } from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps) {
  const { id } = await params;
  const result = await getEventById(id);
  if (!result.success) {
    return { title: "Event Workspace | Planora AI" };
  }
  return {
    title: `${result.data.name} | Command Center | Planora AI`,
    description: `Event Command Center, planning blueprints, tasks, budget, and risks for ${result.data.name}`,
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;

  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    redirect(`/sign-in?redirectTo=/dashboard/events/${id}`);
  }

  const [result, budgetResult, planRevisionResult, taskResult] = await Promise.all([
    getEventById(id),
    getBudgetItemsByEventId(id),
    getLatestPlanRevisionAction(id),
    getTasksByEventId(id),
  ]);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
            <Tag className="size-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">
            Event Not Found
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The event workspace you are looking for does not exist or you do not have permission to access it.
          </p>
          <div className="mt-6">
            <Link href="/dashboard">
              <Button size="sm" variant="outline" className="gap-2">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                <span>Return to Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const event = result.data;
  const budgetItems = budgetResult.success ? budgetResult.data : [];
  const planRevision = planRevisionResult.success ? planRevisionResult.data : null;
  const tasks = taskResult.success ? taskResult.data : [];

  return (
    <EventCommandCenter
      event={event}
      budgetItems={budgetItems}
      planRevision={planRevision}
      tasks={tasks}
      budgetError={!budgetResult.success ? budgetResult.error : null}
      taskError={!taskResult.success ? taskResult.error : null}
    />
  );
}
