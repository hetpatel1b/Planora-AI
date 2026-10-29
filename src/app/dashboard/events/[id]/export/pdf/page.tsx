import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getEventById } from "@/lib/actions/events";
import { getBudgetItemsByEventId } from "@/lib/actions/budget";
import { getTasksByEventId } from "@/lib/actions/tasks";
import { getLatestPlanRevisionAction } from "@/lib/actions/plan";
import { calculateBudgetSummary, calculateCategoryBreakdown, getItemVariance } from "@/lib/budget-math";
import { evaluateEventRisks } from "@/lib/risk-engine";
import { formatCurrency, formatMoney } from "@/lib/currency-utils";
import {
  formatEventDate,
  formatStatusLabel,
  isTaskOverdue,
} from "@/lib/date-utils";
import { PrintButton } from "@/components/export/print-button";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/priority-badge";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  Tag,
  Clock,
  Sparkles,
  Sliders,
  ShieldCheck,
  AlertCircle,
  FileText,
  Info,
} from "lucide-react";
import {
  aiPlanBlueprintSchema,
  persistedPlanBlueprintSchema,
} from "@/lib/validations/plan";

interface PrintPdfPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PrintPdfPageProps) {
  const { id } = await params;
  const result = await getEventById(id);
  if (!result.success) {
    return { title: "Event Dossier | Planora AI" };
  }
  return {
    title: `${result.data.name} — Event Dossier | Planora AI`,
    description: `Executive event planning dossier and operational brief for ${result.data.name}`,
  };
}

export default async function PrintPdfPage({ params }: PrintPdfPageProps) {
  const { id } = await params;

  // 1. Authenticate user
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    redirect(`/sign-in?redirectTo=/dashboard/events/${id}/export/pdf`);
  }

  // 2. Fetch all authoritative data concurrently
  const [eventResult, budgetResult, taskResult, planRevisionResult] =
    await Promise.all([
      getEventById(id),
      getBudgetItemsByEventId(id),
      getTasksByEventId(id),
      getLatestPlanRevisionAction(id),
    ]);

  if (!eventResult.success) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-900">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
          <AlertCircle className="mx-auto size-10 text-rose-500" />
          <h1 className="mt-4 text-lg font-bold text-slate-950">
            Event Not Found
          </h1>
          <p className="mt-2 text-xs text-slate-600">
            {eventResult.error || "Event workspace not found or access denied."}
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

  const event = eventResult.data;
  const budgetItems = budgetResult.success ? budgetResult.data : [];
  const tasks = taskResult.success ? taskResult.data : [];
  const activePlanRevision = planRevisionResult.success ? planRevisionResult.data : null;

  // 3. Compute deterministic financial KPIs
  const budgetSummary = calculateBudgetSummary(Number(event.budget) || 0, budgetItems);
  const categoryBreakdown = calculateCategoryBreakdown(Number(event.budget) || 0, budgetItems);

  // 4. Compute real-time Event Risk Radar assessment
  const riskAssessment = evaluateEventRisks({
    event,
    budgetItems,
    tasks,
    activePlanRevision,
  });

  // Extract structured plan blueprint if active
  let structuredBlueprint: {
    summary: string;
    themes: string[];
    scheduleMilestones: Array<{
      title: string;
      timeframe: string;
      description: string;
      suggested_date?: string | null;
    }>;
    keyRecommendations: string[];
  } | null = null;

  if (activePlanRevision?.structured_plan) {
    const planParse = aiPlanBlueprintSchema.safeParse(activePlanRevision.structured_plan);
    if (planParse.success) {
      structuredBlueprint = planParse.data;
    } else {
      const persistedParse = persistedPlanBlueprintSchema.safeParse(activePlanRevision.structured_plan);
      if (persistedParse.success) {
        structuredBlueprint = persistedParse.data;
      }
    }
  }

  // Reference timestamp derived deterministically from the real-time risk assessment run
  const referenceMs = new Date(riskAssessment.assessedAt).getTime();

  // Task summary metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t.due_date, t.status, referenceMs)).length;

  const exportGeneratedAt = new Date(referenceMs).toUTCString();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:p-0">
      {/* SCREEN-ONLY UTILITY BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-950"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Workspace</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-900">
              Print Preview
            </span>
          </div>

          <div className="flex items-center gap-2">
            <PrintButton eventName={event.name} />
          </div>
        </div>
      </header>

      {/* DOCUMENT WRAPPER (Styled for A4 / Letter Print) */}
      <main className="mx-auto my-8 max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12 print:my-0 print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none">
        
        {/* ================================================================== */}
        {/* SECTION 1: DOCUMENT HEADER & BRAND MARK                            */}
        {/* ================================================================== */}
        <section className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 print:bg-slate-100 print:text-slate-800">
                  <Tag className="size-3" />
                  <span>Planora AI — Event Dossier</span>
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  Status: {formatStatusLabel(event.status)}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                {event.name}
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Workspace ID: <span className="font-mono">{event.id}</span>
              </p>
            </div>

            <div className="text-right text-[11px] text-slate-500">
              <p className="font-semibold text-slate-900">Generated On (UTC)</p>
              <p>{exportGeneratedAt}</p>
              <p className="mt-1 text-indigo-600 print:text-slate-700">Confidential Event Brief</p>
            </div>
          </div>

          {/* Key Metrics Matrix */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 print:border-slate-200 print:bg-white">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <Calendar className="size-3 text-indigo-600 print:text-slate-600" />
                <span>Target Date</span>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-950">
                {formatEventDate(event.event_date)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 print:border-slate-200 print:bg-white">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <MapPin className="size-3 text-indigo-600 print:text-slate-600" />
                <span>Location</span>
              </div>
              <p className="mt-1 truncate text-xs font-bold text-slate-950">
                {event.location || "Location not set"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 print:border-slate-200 print:bg-white">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <Users className="size-3 text-indigo-600 print:text-slate-600" />
                <span>Attendees</span>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-950">
                {event.guest_count.toLocaleString()} guests
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 print:border-slate-200 print:bg-white">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <IndianRupee className="size-3 text-indigo-600 print:text-slate-600" />
                <span>Target Budget</span>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-950">
                {formatCurrency(Number(event.budget))}
              </p>
            </div>
          </div>

          {/* Context & Parameters Matrix */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 print:border-slate-200">
              <div className="flex items-center gap-1 font-semibold text-slate-900">
                <Sliders className="size-3 text-slate-500" />
                <span>Preferences &amp; Styling</span>
              </div>
              <p className="mt-1 text-slate-600 whitespace-pre-wrap leading-relaxed text-[11px]">
                {event.preferences || "None specified"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 print:border-slate-200">
              <div className="flex items-center gap-1 font-semibold text-slate-900">
                <Clock className="size-3 text-slate-500" />
                <span>Planning Constraints</span>
              </div>
              <p className="mt-1 text-slate-600 whitespace-pre-wrap leading-relaxed text-[11px]">
                {event.constraints || "None specified"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 print:border-slate-200">
              <div className="flex items-center gap-1 font-semibold text-slate-900">
                <Sparkles className="size-3 text-slate-500" />
                <span>Cultural Requirements</span>
              </div>
              <p className="mt-1 text-slate-600 whitespace-pre-wrap leading-relaxed text-[11px]">
                {event.cultural_requirements || "None specified"}
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 2: APPROVED PLAN BLUEPRINT (PERSISTED ONLY)                 */}
        {/* ================================================================== */}
        <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-indigo-600 print:text-slate-700" />
              <h2 className="text-base font-bold text-slate-950">
                Approved Event Strategy &amp; Plan Blueprint
              </h2>
            </div>
            {activePlanRevision && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 print:border print:border-slate-200 print:bg-white print:text-slate-800">
                Revision #{activePlanRevision.revision_number} (Active)
              </span>
            )}
          </div>

          {structuredBlueprint ? (
            <div className="mt-4 space-y-4">
              {/* Summary */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 print:border-slate-200 print:bg-white">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Executive Concept &amp; Strategy
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                  {structuredBlueprint.summary}
                </p>
              </div>

              {/* Themes */}
              {structuredBlueprint.themes.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Creative Concepts &amp; Themes
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {structuredBlueprint.themes.map((theme, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Milestones Table */}
              {structuredBlueprint.scheduleMilestones.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Schedule Milestones
                  </p>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="py-2 px-3 w-1/4">Milestone</th>
                          <th className="py-2 px-3 w-1/4">Timeframe</th>
                          <th className="py-2 px-3 w-1/2">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {structuredBlueprint.scheduleMilestones.map((m, idx) => (
                          <tr key={idx} className="break-inside-avoid">
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {m.title}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-medium">
                              {m.timeframe}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {m.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {structuredBlueprint.keyRecommendations.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 print:border-slate-200">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Key Strategic Recommendations
                  </p>
                  <ul className="mt-1.5 list-disc list-inside space-y-1 text-xs text-slate-700">
                    {structuredBlueprint.keyRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              <Info className="mx-auto size-4 text-slate-400 mb-1" />
              <p className="font-semibold text-slate-700">
                No approved plan blueprint established
              </p>
              <p className="mt-0.5 text-slate-500">
                Use the AI &amp; Rule-Based Plan Generator in your workspace to formulate and accept an event blueprint.
              </p>
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* SECTION 3: TIMELINE & CHECKLIST DELIVERABLES                       */}
        {/* ================================================================== */}
        <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-950">
              Timeline Checklist &amp; Deliverables
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>Total: <strong>{totalTasks}</strong></span>
              <span>•</span>
              <span className="text-emerald-700">Completed: <strong>{completedTasks}</strong></span>
              <span>•</span>
              <span>Pending: <strong>{pendingTasks}</strong></span>
              {overdueTasks > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-600 font-bold">Overdue: {overdueTasks}</span>
                </>
              )}
            </div>
          </div>

          {tasks.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs" aria-label="Event Checklist Tasks">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="py-2 px-3 w-28">Status</th>
                    <th scope="col" className="py-2 px-3">Task Title &amp; Description</th>
                    <th scope="col" className="py-2 px-3 w-28">Due Date</th>
                    <th scope="col" className="py-2 px-3 w-24">Priority</th>
                    <th scope="col" className="py-2 px-3 w-28">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const isOverdue = isTaskOverdue(task.due_date, task.status, referenceMs);

                    return (
                      <tr key={task.id} className="break-inside-avoid">
                        <td className="py-2 px-3 align-top">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              task.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : task.status === "in_progress"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {formatStatusLabel(task.status)}
                          </span>
                        </td>
                        <td className="py-2 px-3 align-top">
                          <p className={`font-semibold ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-900"}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed break-words whitespace-pre-wrap">
                              {task.description}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          {task.due_date ? (
                            <span className={isOverdue ? "font-bold text-rose-600" : "text-slate-700"}>
                              {task.due_date.split("T")[0]}
                              {isOverdue && " (Overdue)"}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          {task.is_vendor_checklist ? (
                            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200">
                              Vendor Item
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">General</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              No checklist tasks recorded for this event.
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* SECTION 4: SMART BUDGET SUMMARY & CATEGORY BREAKDOWN               */}
        {/* ================================================================== */}
        <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
          <h2 className="text-base font-bold text-slate-950">
            Financial Summary &amp; Category Allocations
          </h2>

          {/* Budget KPIs */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Target Budget
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-950">
                {formatMoney(budgetSummary.targetBudget)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Planned Estimates
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-950">
                {formatMoney(budgetSummary.totalEstimated)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Actual Expenditures
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-950">
                {formatMoney(budgetSummary.totalActual)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Variance (Actual - Est)
              </p>
              <p className={`mt-1 text-sm font-extrabold ${budgetSummary.variance > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                {budgetSummary.variance > 0 ? `+${formatMoney(budgetSummary.variance)}` : formatMoney(budgetSummary.variance)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 print:bg-white">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Remaining Balance
              </p>
              <p className={`mt-1 text-sm font-extrabold ${budgetSummary.remainingBudget < 0 ? "text-rose-600" : "text-slate-950"}`}>
                {formatMoney(budgetSummary.remainingBudget)}
              </p>
            </div>
          </div>

          {/* Category Breakdown Table */}
          {categoryBreakdown.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs" aria-label="Budget Category Breakdown">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="py-2 px-3">Expense Category</th>
                    <th scope="col" className="py-2 px-3 text-right">Estimated</th>
                    <th scope="col" className="py-2 px-3 text-right">Actual</th>
                    <th scope="col" className="py-2 px-3 text-right">Variance</th>
                    <th scope="col" className="py-2 px-3 text-right">% of Target</th>
                    <th scope="col" className="py-2 px-3 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryBreakdown.map((cat, i) => (
                    <tr key={i} className="break-inside-avoid">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {cat.category}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700">
                        {formatMoney(cat.totalEstimated)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700">
                        {formatMoney(cat.totalActual)}
                      </td>
                      <td className={`py-2 px-3 text-right font-semibold ${cat.variance > 0 ? "text-rose-600" : "text-slate-700"}`}>
                        {cat.variance > 0 ? `+${formatMoney(cat.variance)}` : formatMoney(cat.variance)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {cat.percentageOfTargetBudget}%
                      </td>
                      <td className="py-2 px-3 text-center">
                        {cat.isOverspent ? (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                            Overspent
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            On Track
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-bold text-slate-950">
                    <td className="py-2 px-3">Total Allocations</td>
                    <td className="py-2 px-3 text-right">{formatMoney(budgetSummary.totalEstimated)}</td>
                    <td className="py-2 px-3 text-right">{formatMoney(budgetSummary.totalActual)}</td>
                    <td className="py-2 px-3 text-right">{formatMoney(budgetSummary.variance)}</td>
                    <td className="py-2 px-3 text-right">{budgetSummary.utilizationPercent}%</td>
                    <td className="py-2 px-3 text-center">
                      {budgetSummary.isOverBudget ? (
                        <span className="text-rose-600 text-[10px]">Over Budget</span>
                      ) : (
                        <span className="text-emerald-700 text-[10px]">Healthy</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* SECTION 5: ITEMIZED EXPENSE LEDGER                                 */}
        {/* ================================================================== */}
        <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
          <h2 className="text-base font-bold text-slate-950">
            Itemized Expense Ledger
          </h2>

          {budgetItems.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2 px-3 w-36">Category</th>
                    <th className="py-2 px-3">Item Name</th>
                    <th className="py-2 px-3 text-right w-24">Estimated</th>
                    <th className="py-2 px-3 text-right w-24">Actual</th>
                    <th className="py-2 px-3 text-right w-24">Variance</th>
                    <th className="py-2 px-3 w-1/3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetItems.map((item) => {
                    const hasActual = item.actual_amount !== null && item.actual_amount !== undefined;
                    const variance = getItemVariance(item);
                    return (
                      <tr key={item.id} className="break-inside-avoid">
                        <td className="py-2 px-3 align-top font-medium text-slate-600">
                          {item.category}
                        </td>
                        <td className="py-2 px-3 align-top font-semibold text-slate-900">
                          {item.item_name}
                        </td>
                        <td className="py-2 px-3 align-top text-right text-slate-700">
                          {formatMoney(Number(item.estimated_amount))}
                        </td>
                        <td className="py-2 px-3 align-top text-right text-slate-700">
                          {hasActual ? (
                            formatMoney(Number(item.actual_amount))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className={`py-2 px-3 align-top text-right font-medium ${hasActual && variance > 0 ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                          {hasActual ? (
                            variance > 0 ? `+${formatMoney(variance)}` : formatMoney(variance)
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top text-slate-500 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                          {item.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              No itemized expense records logged.
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* SECTION 6: REAL-TIME EVENT RISK RADAR FINDINGS                     */}
        {/* ================================================================== */}
        <section className="mt-8 border-b border-slate-200 pb-8 break-inside-avoid">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-indigo-600 print:text-slate-700" />
              <h2 className="text-base font-bold text-slate-950">
                Real-Time Event Risk Radar Findings
              </h2>
            </div>
            <div className="text-[11px] text-slate-500">
              Overall Status: <strong className="capitalize">{riskAssessment.overallRiskLevel}</strong>
            </div>
          </div>

          <p className="mt-1 text-[11px] text-slate-500">
            Automated health assessment dynamically evaluated from authoritative timeline, budget, and blueprint records.
          </p>

          {riskAssessment.risks.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2 px-3 w-24">Severity</th>
                    <th className="py-2 px-3 w-28">Category</th>
                    <th className="py-2 px-3">Risk Finding &amp; Evidence</th>
                    <th className="py-2 px-3 w-1/3">Recommended Mitigation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riskAssessment.risks.map((risk) => (
                    <tr key={risk.id} className="break-inside-avoid">
                      <td className="py-2 px-3 align-top">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            risk.severity === "critical"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : risk.severity === "high"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {risk.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top font-medium text-slate-600 capitalize">
                        {risk.category.replace(/_/g, " ")}
                      </td>
                      <td className="py-2 px-3 align-top">
                        <p className="font-bold text-slate-950">{risk.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
                          {risk.explanation}
                        </p>
                      </td>
                      <td className="py-2 px-3 align-top text-[11px] text-slate-700 leading-relaxed">
                        {risk.suggestedMitigation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-center text-xs text-emerald-800 print:bg-white print:border-slate-200 print:text-slate-700">
              <ShieldCheck className="mx-auto size-5 text-emerald-600 print:text-slate-600 mb-1" />
              <p className="font-bold">Event Plan Healthy</p>
              <p className="mt-0.5 text-[11px]">
                No critical or elevated risks detected across authoritative budget allocations, timeline deadlines, or checklists.
              </p>
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* SECTION 7: DOCUMENT METADATA & FOOTER                             */}
        {/* ================================================================== */}
        <footer className="mt-8 pt-4 text-center text-[11px] text-slate-400">
          <p>
            Planora AI — Event Planning Intelligence Platform • Document generated for authorized event owner.
          </p>
          <p className="mt-1 font-mono text-[10px]">
            {event.name} • {exportGeneratedAt}
          </p>
        </footer>
      </main>
    </div>
  );
}
