"use client";

import * as React from "react";
import {
  evaluateEventRisks,
  type DetectedRisk,
  type RiskCategory,
  type RiskSeverity,
  type RiskAssessmentResult,
} from "@/lib/risk-engine";
import type { EventRow } from "@/lib/validations/event";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { TaskRow } from "@/lib/validations/task";
import type { PlanRevisionRow } from "@/lib/validations/plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  IndianRupee,
  Clock,
  CalendarDays,
  ListChecks,
  ArrowRight,
} from "lucide-react";

export interface EventRiskRadarProps {
  event: Pick<EventRow, "id" | "name" | "event_date" | "budget" | "status" | "guest_count">;
  budgetItems: BudgetItemRow[];
  tasks: TaskRow[];
  activePlanRevision?: PlanRevisionRow | null;
  /** Optional precomputed risk assessment result to avoid redundant evaluation */
  assessment?: RiskAssessmentResult;
}

type FilterCategory = "ALL" | RiskCategory;

export function EventRiskRadar({
  event,
  budgetItems,
  tasks,
  activePlanRevision,
  assessment: propAssessment,
}: EventRiskRadarProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<FilterCategory>("ALL");

  // Use precomputed assessment if provided; otherwise evaluate purely and deterministically from loaded data
  const assessment = React.useMemo(() => {
    if (propAssessment) {
      return propAssessment;
    }
    return evaluateEventRisks({
      event,
      budgetItems,
      tasks,
      activePlanRevision,
    });
  }, [propAssessment, event, budgetItems, tasks, activePlanRevision]);

  const { overallRiskLevel, risks, counts } = assessment;

  // Filtered risks
  const filteredRisks = React.useMemo(() => {
    if (selectedCategory === "ALL") return risks;
    return risks.filter((r) => r.category === selectedCategory);
  }, [risks, selectedCategory]);

  // Overall Health Banner styling
  const healthBannerConfig = {
    critical: {
      bg: "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60",
      text: "text-rose-900 dark:text-rose-100",
      descText: "text-rose-700 dark:text-rose-300",
      icon: <AlertOctagon className="size-6 text-rose-600 dark:text-rose-400 shrink-0" />,
      label: "Critical Risks Detected",
      description:
        "Immediate budget or timeline threats require your urgent intervention to protect event delivery.",
    },
    elevated: {
      bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60",
      text: "text-amber-900 dark:text-amber-100",
      descText: "text-amber-700 dark:text-amber-300",
      icon: <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400 shrink-0" />,
      label: "Elevated Risk",
      description:
        "Multiple high-priority items are overdue or approaching critical deadlines. Review suggested mitigations.",
    },
    moderate: {
      bg: "bg-amber-50/60 border-amber-200/70 dark:bg-amber-950/20 dark:border-amber-800/50",
      text: "text-amber-900 dark:text-amber-100",
      descText: "text-amber-700 dark:text-amber-300",
      icon: <AlertCircle className="size-6 text-amber-500 dark:text-amber-400 shrink-0" />,
      label: "Moderate Operational Risk",
      description:
        "Minor cost variances or near-term tasks detected. Regular monitoring recommended.",
    },
    healthy: {
      bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60",
      text: "text-emerald-900 dark:text-emerald-100",
      descText: "text-emerald-700 dark:text-emerald-300",
      icon: <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      label: "Event Plan Healthy",
      description:
        "All budgets, task schedules, and checklist milestones are tracking on time with no major variances.",
    },
  }[overallRiskLevel];

  // Helper for scrolling smoothly to related sections
  const scrollToSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getSeverityBadge = (severity: RiskSeverity) => {
    switch (severity) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
            <AlertOctagon className="size-3 shrink-0" />
            <span>Critical</span>
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <AlertTriangle className="size-3 shrink-0" />
            <span>High</span>
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300">
            <AlertCircle className="size-3 shrink-0" />
            <span>Medium</span>
          </span>
        );
      case "low":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Info className="size-3 shrink-0" />
            <span>Low</span>
          </span>
        );
    }
  };

  const getCategoryIcon = (category: RiskCategory) => {
    switch (category) {
      case "budget_overrun":
        return <IndianRupee className="size-4 text-emerald-600 dark:text-emerald-400" />;
      case "overdue_tasks":
        return <Clock className="size-4 text-rose-600 dark:text-rose-400" />;
      case "at_risk_tasks":
        return <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />;
      case "schedule_conflict":
        return <CalendarDays className="size-4 text-indigo-600 dark:text-indigo-400" />;
      case "missing_checklist":
        return <ListChecks className="size-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <section
      id="event-risk-radar-section"
      aria-labelledby="risk-radar-title"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <ShieldAlert className="size-4" />
            </span>
            <h2
              id="risk-radar-title"
              className="text-xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Event Risk Radar
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Deterministic, real-time threat detection analyzing budget overruns, overdue tasks, checklist gaps, and schedule bottlenecks.
          </p>
        </div>

        {/* Severity Count Summary Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline" className="gap-1 border-slate-200 dark:border-slate-800">
            <span>Total:</span>
            <span className="font-bold">{counts.total}</span>
          </Badge>
          {counts.critical > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              <span>Critical:</span>
              <span className="font-bold">{counts.critical}</span>
            </span>
          )}
          {counts.high > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <span>High:</span>
              <span className="font-bold">{counts.high}</span>
            </span>
          )}
          {counts.medium > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
              <span>Medium:</span>
              <span className="font-bold">{counts.medium}</span>
            </span>
          )}
        </div>
      </div>

      {/* Overall Health Status Card */}
      <div
        className={`flex items-start gap-4 rounded-2xl border p-5 transition sm:p-6 shadow-xs ${healthBannerConfig.bg}`}
      >
        {healthBannerConfig.icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-bold ${healthBannerConfig.text}`}>
              {healthBannerConfig.label}
            </h3>
          </div>
          <p className={`mt-1 text-xs leading-relaxed ${healthBannerConfig.descText}`}>
            {healthBannerConfig.description}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Risk category filters"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "ALL"}
          onClick={() => setSelectedCategory("ALL")}
          className={`shrink-0 rounded-xl px-3 py-1.5 font-medium transition ${
            selectedCategory === "ALL"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          All Categories ({counts.total})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "budget_overrun"}
          onClick={() => setSelectedCategory("budget_overrun")}
          className={`shrink-0 rounded-xl px-3 py-1.5 font-medium transition ${
            selectedCategory === "budget_overrun"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          Budget Risks
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "overdue_tasks"}
          onClick={() => setSelectedCategory("overdue_tasks")}
          className={`shrink-0 rounded-xl px-3 py-1.5 font-medium transition ${
            selectedCategory === "overdue_tasks"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          Overdue Tasks
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "at_risk_tasks"}
          onClick={() => setSelectedCategory("at_risk_tasks")}
          className={`shrink-0 rounded-xl px-3 py-1.5 font-medium transition ${
            selectedCategory === "at_risk_tasks"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          At-Risk Tasks
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "missing_checklist"}
          onClick={() => setSelectedCategory("missing_checklist")}
          className={`shrink-0 rounded-xl px-3 py-1.5 font-medium transition ${
            selectedCategory === "missing_checklist"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          Checklist Gaps
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "schedule_conflict"}
          onClick={() => setSelectedCategory("schedule_conflict")}
          className={`shrink-0 rounded-xl px-3 py-1.5 font-medium transition ${
            selectedCategory === "schedule_conflict"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          Schedule Conflicts
        </button>
      </div>

      {/* Risks Grid / List */}
      {filteredRisks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 px-4 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <ShieldCheck className="size-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-950 dark:text-white">
            No risks detected in this view
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            All evaluated metrics for this category are within healthy bounds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredRisks.map((risk: DetectedRisk) => (
            <div
              key={risk.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div>
                {/* Card Header: Category & Severity */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {getCategoryIcon(risk.category)}
                    <span className="capitalize">{risk.category.replace(/_/g, " ")}</span>
                  </div>
                  {getSeverityBadge(risk.severity)}
                </div>

                {/* Title & Explanation */}
                <h4 className="mt-3 text-sm font-bold text-slate-950 dark:text-white">
                  {risk.title}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {risk.explanation}
                </p>

                {/* Grounded Evidence Box */}
                {risk.evidence && Object.keys(risk.evidence).length > 0 && (
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] font-mono text-slate-600 dark:border-slate-800/80 dark:bg-slate-950/40 dark:text-slate-400">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1 font-sans">
                      Supporting Evidence
                    </span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 min-w-0">
                      {Object.entries(risk.evidence).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1 min-w-0 break-words [overflow-wrap:anywhere]">
                          <span className="text-slate-500 shrink-0">{key}:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200 break-all">
                            {typeof val === "boolean" ? String(val) : String(val ?? "n/a")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mitigation & Navigation Footer */}
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-[11px] leading-tight text-slate-500 dark:text-slate-400 italic">
                  <span className="font-semibold not-italic text-slate-700 dark:text-slate-300 mr-1">
                    Mitigation:
                  </span>
                  {risk.suggestedMitigation}
                </div>

                {/* Action Shortcuts */}
                {risk.category === "budget_overrun" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => scrollToSection("budget-manager-title")}
                    className="gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 self-end shrink-0"
                  >
                    <span>View Budget</span>
                    <ArrowRight className="size-3" />
                  </Button>
                )}

                {(risk.category === "overdue_tasks" ||
                  risk.category === "at_risk_tasks" ||
                  risk.category === "schedule_conflict") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => scrollToSection("timeline-checklist-title")}
                    className="gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 self-end shrink-0"
                  >
                    <span>View Tasks</span>
                    <ArrowRight className="size-3" />
                  </Button>
                )}

                {risk.category === "missing_checklist" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => scrollToSection("timeline-checklist-title")}
                    className="gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 self-end shrink-0"
                  >
                    <span>Add Tasks</span>
                    <ArrowRight className="size-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
