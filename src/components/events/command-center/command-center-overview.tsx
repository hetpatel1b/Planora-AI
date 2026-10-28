"use client";

import * as React from "react";
import type { TaskRow } from "@/lib/validations/task";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { DetectedRisk, RiskAssessmentResult } from "@/lib/risk-engine";
import { formatCurrency } from "@/lib/currency-utils";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  IndianRupee,
  ListTodo,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export interface CommandCenterOverviewProps {
  tasks: TaskRow[];
  budgetItems: BudgetItemRow[];
  targetBudget: number;
  remainingBudget: number;
  utilizationPercent: number;
  isOverBudget: boolean;
  assessment: RiskAssessmentResult;
  activeRevisionNumber: number | null;
  onOpenCopilot?: () => void;
}

export function CommandCenterOverview({
  tasks,
  targetBudget,
  remainingBudget,
  utilizationPercent,
  isOverBudget,
  assessment,
  activeRevisionNumber,
  onOpenCopilot,
}: CommandCenterOverviewProps) {
  // Task calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  // Overdue task risks evaluated deterministically by the risk engine
  const overdueTaskRisks = assessment.risks.filter(
    (r: DetectedRisk) => r.category === "overdue_tasks"
  );
  const overdueCount = overdueTaskRisks.length;
  const taskCompletionPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // High & Critical risks from deterministic risk engine
  const criticalOrHighRisks = assessment.risks.filter(
    (r: DetectedRisk) => r.severity === "critical" || r.severity === "high"
  );

  const hasAttentionItems =
    criticalOrHighRisks.length > 0 || overdueCount > 0 || isOverBudget;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const isReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: isReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Section Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Command Center • Executive Overview</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            Workspace Health &amp; Readiness
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Real-time status indicators derived deterministically from tasks, ledger allocations, and milestone schedules.
          </p>
        </div>

        {onOpenCopilot && (
          <button
            type="button"
            onClick={onOpenCopilot}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3.5 py-2 text-xs font-semibold text-violet-700 border border-violet-200/70 hover:bg-violet-100 transition-colors dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/50 cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
            <span>Consult AI Copilot</span>
          </button>
        )}
      </div>

      {/* 4 Core Health Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Task Completion Progress */}
        <div
          onClick={() => scrollToSection("timeline")}
          className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-violet-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-800/60 min-w-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Checklist Tasks
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400 group-hover:scale-105 transition-transform">
              <ListTodo className="size-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-950 dark:text-white">
                {taskCompletionPercent}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {`${completedTasks}/${totalTasks} completed`}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full transition-all duration-300"
                style={{ width: `${taskCompletionPercent}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              {overdueCount > 0 ? (
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {overdueCount} overdue
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  All due dates on schedule
                </span>
              )}
              <span className="text-slate-400 group-hover:text-violet-600 inline-flex items-center gap-0.5">
                View <ArrowRight className="size-3" />
              </span>
            </div>
          </div>
        </div>

        {/* 2. Budget Utilization & Remaining */}
        <div
          onClick={() => scrollToSection("budget")}
          className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-violet-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-800/60 min-w-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Budget Health
            </span>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                isOverBudget
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
              } group-hover:scale-105 transition-transform`}
            >
              <IndianRupee className="size-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-bold truncate ${
                  isOverBudget
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-950 dark:text-white"
                }`}
              >
                {formatCurrency(remainingBudget)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {utilizationPercent}% spent
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverBudget ? "bg-rose-600" : "bg-emerald-600"
                }`}
                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span
                className={
                  isOverBudget
                    ? "font-semibold text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400 font-medium"
                }
              >
                {isOverBudget ? "Ceiling exceeded" : `Cap: ${formatCurrency(targetBudget)}`}
              </span>
              <span className="text-slate-400 group-hover:text-violet-600 inline-flex items-center gap-0.5">
                Manage <ArrowRight className="size-3" />
              </span>
            </div>
          </div>
        </div>

        {/* 3. Risk Radar Severity */}
        <div
          onClick={() => scrollToSection("risks")}
          className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-violet-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-800/60 min-w-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Risk Radar
            </span>
            <div
              className={`flex size-8 items-center justify-center rounded-lg ${
                assessment.overallRiskLevel === "critical" || assessment.overallRiskLevel === "elevated"
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                  : assessment.overallRiskLevel === "moderate"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
              } group-hover:scale-105 transition-transform`}
            >
              {assessment.overallRiskLevel === "critical" || assessment.overallRiskLevel === "elevated" ? (
                <ShieldAlert className="size-4" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-4" aria-hidden="true" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-bold uppercase ${
                  assessment.overallRiskLevel === "critical"
                    ? "text-rose-600 dark:text-rose-400"
                    : assessment.overallRiskLevel === "elevated"
                    ? "text-rose-500 dark:text-rose-400"
                    : assessment.overallRiskLevel === "moderate"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {assessment.overallRiskLevel}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {`${assessment.counts.total} risk${assessment.counts.total === 1 ? "" : "s"}`}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
              {assessment.counts.critical > 0
                ? `${assessment.counts.critical} critical, ${assessment.counts.high} high risks`
                : assessment.counts.high > 0
                ? `${assessment.counts.high} high-priority risks`
                : "No high-priority threats identified"}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Deterministic radar</span>
              <span className="text-slate-400 group-hover:text-violet-600 inline-flex items-center gap-0.5">
                Inspect <ArrowRight className="size-3" />
              </span>
            </div>
          </div>
        </div>

        {/* 4. Active Blueprint Revision */}
        <div
          onClick={() => scrollToSection("plan")}
          className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-violet-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-800/60 min-w-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Plan Blueprint
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400 group-hover:scale-105 transition-transform">
              <Layers className="size-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-950 dark:text-white">
                {activeRevisionNumber ? `Rev #${activeRevisionNumber}` : "Draft"}
              </span>
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                {activeRevisionNumber ? "Active Plan" : "Initial Setup"}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
              {activeRevisionNumber
                ? "Full milestone & budget blueprint synthesized"
                : "Generate initial AI planning blueprint"}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Rule-based synthesis</span>
              <span className="text-slate-400 group-hover:text-violet-600 inline-flex items-center gap-0.5">
                Blueprint <ArrowRight className="size-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Needs Attention Alert Center */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {hasAttentionItems ? (
              <AlertTriangle className="size-4 text-amber-500" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            )}
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              {hasAttentionItems ? "Action Items Requiring Attention" : "All Planning Parameters On Track"}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {hasAttentionItems
              ? `${criticalOrHighRisks.length + (overdueCount > 0 ? 1 : 0) + (isOverBudget ? 1 : 0)} items flagged`
              : "0 critical flags"}
          </span>
        </div>

        {hasAttentionItems ? (
          <div className="mt-4 space-y-3">
            {/* Overdue Tasks Alert */}
            {overdueCount > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs dark:border-rose-900/60 dark:bg-rose-950/30">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Clock className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="font-bold text-rose-950 dark:text-rose-200 block truncate">
                      {overdueCount} Overdue Task{overdueCount === 1 ? "" : "s"} Detected
                    </span>
                    <p className="text-rose-800 dark:text-rose-300 text-[11px] mt-0.5">
                      Milestone items are past their scheduled due dates and require status updates or rescheduling.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection("timeline")}
                  className="inline-flex shrink-0 items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 cursor-pointer text-xs"
                >
                  <span>Resolve Tasks</span>
                  <ArrowRight className="size-3" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Over Budget Alert */}
            {isOverBudget && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs dark:border-rose-900/60 dark:bg-rose-950/30">
                <div className="flex items-start gap-2.5 min-w-0">
                  <IndianRupee className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="font-bold text-rose-950 dark:text-rose-200 block truncate">
                      Budget Ceiling Exceeded
                    </span>
                    <p className="text-rose-800 dark:text-rose-300 text-[11px] mt-0.5">
                      Current planned expenses exceed the allocated financial ceiling by {formatCurrency(Math.abs(remainingBudget))}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection("budget")}
                  className="inline-flex shrink-0 items-center gap-1 font-semibold text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 cursor-pointer text-xs"
                >
                  <span>Open Budget Simulator</span>
                  <ArrowRight className="size-3" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Critical & High Risks from Radar */}
            {criticalOrHighRisks.slice(0, 3).map((risk: DetectedRisk) => (
              <div
                key={risk.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/30"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertOctagon className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-amber-950 dark:text-amber-200">
                        {risk.title}
                      </span>
                      <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                      {risk.suggestedMitigation || risk.explanation}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection("risks")}
                  className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 cursor-pointer text-xs"
                >
                  <span>Inspect Risk</span>
                  <ArrowRight className="size-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">
              All event parameters, schedules, and budgets are healthy.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-md mx-auto">
              No critical risks, overdue checklist tasks, or budget overruns detected across active event models.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
