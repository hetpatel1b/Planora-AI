import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getEventById } from "@/lib/actions/events";
import { getBudgetItemsByEventId } from "@/lib/actions/budget";
import { getLatestPlanRevisionAction } from "@/lib/actions/plan";
import { getTasksByEventId } from "@/lib/actions/tasks";
import { PlanGeneratorCard } from "@/components/plan/plan-generator-card";
import { BudgetManager } from "@/components/budget/budget-manager";
import { TimelineChecklistManager } from "@/components/timeline/timeline-checklist-manager";
import { CopilotChatCard } from "@/components/copilot/copilot-chat-card";
import { EventRiskRadar } from "@/components/risk/event-risk-radar";
import {
  formatEventDate,
  getStatusBadgeVariant,
  formatStatusLabel,
} from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteEventDialogWrapper } from "@/components/events/delete-event-dialog-wrapper";
import { ExportMenu } from "@/components/export/export-menu";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Edit3,
  Tag,
  Sliders,
  Clock,
  Sparkles,
} from "lucide-react";

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
    title: `${result.data.name} | Planora AI`,
    description: `Workspace details and parameters for ${result.data.name}`,
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
            <Tag className="size-6" />
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
                <ArrowLeft className="size-3.5" />
                <span>Return to Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const event = result.data;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="size-3.5" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="max-w-[180px] sm:max-w-xs truncate text-xs font-semibold text-slate-900 dark:text-white">
              {event.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ExportMenu eventId={event.id} eventName={event.name} />
            <Link href={`/dashboard/events/${event.id}/edit`}>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Edit3 className="size-3.5" />
                <span>Edit Setup</span>
              </Button>
            </Link>
            <DeleteEventDialogWrapper
              eventId={event.id}
              eventName={event.name}
              redirectToDashboard
            />
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 space-y-8">
        {/* Workspace Title & Badge Header */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Tag className="size-3" />
                  <span>{event.event_type}</span>
                </span>
                <Badge variant={getStatusBadgeVariant(event.status)}>
                  {formatStatusLabel(event.status)}
                </Badge>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                {event.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-slate-400" />
                  <span>
                    Created on {new Date(event.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span>Workspace ID:</span>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {event.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/dashboard/events/${event.id}/edit`}>
                <Button className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs">
                  <Edit3 className="size-3.5" />
                  <span>Modify Event Details</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
            {/* Target Date */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Calendar className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Target Date
                </p>
                <p className="mt-0.5 font-semibold text-xs text-slate-900 dark:text-white">
                  {formatEventDate(event.event_date)}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Venue / Location
                </p>
                <p className="mt-0.5 truncate font-semibold text-xs text-slate-900 dark:text-white" title={event.location || undefined}>
                  {event.location || "Location not set"}
                </p>
              </div>
            </div>

            {/* Estimated Guests */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Users className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Expected Attendees
                </p>
                <p className="mt-0.5 font-semibold text-xs text-slate-900 dark:text-white">
                  {event.guest_count.toLocaleString()} guests
                </p>
              </div>
            </div>

            {/* Estimated Budget */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <DollarSign className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Target Budget
                </p>
                <p className="mt-0.5 font-semibold text-xs text-slate-900 dark:text-white">
                  {formatCurrency(Number(event.budget))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Context & Parameters */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Preferences */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sliders className="size-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Preferences &amp; Styling
              </h3>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {event.preferences || "No specific design or styling preferences provided."}
            </p>
          </div>

          {/* Planning Constraints */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Clock className="size-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Planning Constraints
              </h3>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {event.constraints || "No strict operational or logistical constraints recorded."}
            </p>
          </div>

          {/* Cultural & Dietary Requirements */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Cultural &amp; Dietary Requirements
              </h3>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {event.cultural_requirements || "No specific cultural ceremonies or dietary requirements logged."}
            </p>
          </div>
        </div>

        {/* Event Risk Radar (Phase 6 • F08) */}
        <EventRiskRadar
          event={event}
          budgetItems={budgetResult.success ? budgetResult.data : []}
          tasks={taskResult.success ? taskResult.data : []}
          activePlanRevision={planRevisionResult.success ? planRevisionResult.data : null}
        />

        {/* Conversational AI Copilot (Phase 5 • F05) */}
        <CopilotChatCard
          eventId={event.id}
          eventDate={event.event_date}
          eventName={event.name}
        />

        {/* AI & Rule-Based Plan Generator (Phase 4 Step 3 • F02) */}
        <PlanGeneratorCard
          eventId={event.id}
          eventName={event.name}
          initialRevision={planRevisionResult.success ? planRevisionResult.data : null}
        />

        {/* Dynamic Timeline & Checklist (Phase 4 Step 4 • F04) */}
        <TimelineChecklistManager
          eventId={event.id}
          eventDate={event.event_date}
          initialTasks={taskResult.success ? taskResult.data : []}
          initialError={
            taskResult.success
              ? null
              : taskResult.error || "Failed to load checklist tasks"
          }
        />

        {/* Smart Budget Manager (Phase 4 Step 2 • F03) */}
        <BudgetManager
          eventId={event.id}
          targetBudget={Number(event.budget) || 0}
          initialItems={budgetResult.success ? budgetResult.data : []}
          initialError={
            budgetResult.success
              ? null
              : budgetResult.error || "Failed to load budget records"
          }
        />
      </main>
    </div>
  );
}
