"use client";

import * as React from "react";
import type { EventRow } from "@/lib/validations/event";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { TaskRow } from "@/lib/validations/task";
import type { PlanRevisionRow } from "@/lib/validations/plan";
import { calculateBudgetSummary } from "@/lib/budget-math";
import { evaluateEventRisks } from "@/lib/risk-engine";
import { WorkspaceHeader } from "@/components/events/command-center/workspace-header";
import { EventSummaryBar } from "@/components/events/command-center/event-summary-bar";
import { WorkspaceNav } from "@/components/events/command-center/workspace-nav";
import { CommandCenterOverview } from "@/components/events/command-center/command-center-overview";
import { PlanGeneratorCard } from "@/components/plan/plan-generator-card";
import { TimelineChecklistManager } from "@/components/timeline/timeline-checklist-manager";
import { BudgetManager } from "@/components/budget/budget-manager";
import { EventRiskRadar } from "@/components/risk/event-risk-radar";
import { FloatingCopilotDrawer } from "@/components/copilot/floating-copilot-drawer";

export interface EventCommandCenterProps {
  event: EventRow;
  budgetItems: BudgetItemRow[];
  planRevision: PlanRevisionRow | null;
  tasks: TaskRow[];
  budgetError?: string | null;
  taskError?: string | null;
}

export function EventCommandCenter({
  event,
  budgetItems,
  planRevision,
  tasks,
  budgetError,
  taskError,
}: EventCommandCenterProps) {
  const [activeSection, setActiveSection] = React.useState("overview");

  const targetBudget = Number(event.budget) || 0;

  // Authoritative calculations matching underlying modules
  const budgetSummary = React.useMemo(
    () => calculateBudgetSummary(targetBudget, budgetItems),
    [targetBudget, budgetItems]
  );

  const assessment = React.useMemo(
    () =>
      evaluateEventRisks({
        event,
        budgetItems,
        tasks,
        activePlanRevision: planRevision,
      }),
    [event, budgetItems, tasks, planRevision]
  );

  // Scroll spy to update active navigation item
  React.useEffect(() => {
    const sectionIds = ["overview", "plan", "timeline", "budget", "risks"];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i]);
        if (section) {
          const top = section.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(sectionIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleOpenCopilot = () => {
    const launcherButton = document.querySelector<HTMLButtonElement>(
      'aside[aria-label="AI Copilot Assistant"] button'
    );
    if (launcherButton) {
      launcherButton.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* AREA 1: Persistent Event Header */}
      <WorkspaceHeader event={event} />

      {/* AREA 3: Workspace Navigation Jump Bar */}
      <WorkspaceNav
        taskCount={tasks.length}
        totalRisks={assessment.counts.total}
        hasHighRisks={assessment.counts.critical > 0 || assessment.counts.high > 0}
        hasActivePlan={!!planRevision}
        activeSection={activeSection}
        onNavigate={(id) => setActiveSection(id)}
      />

      {/* Main Workspace Body */}
      <main id="main-content" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-8 sm:space-y-12">
        {/* AREA 2: Compact Event Summary with Progressive Disclosure */}
        <EventSummaryBar event={event} />

        {/* AREA 4: Executive Overview & Command Center */}
        <section
          id="overview"
          aria-labelledby="overview-heading"
          className="scroll-mt-28"
        >
          <CommandCenterOverview
            tasks={tasks}
            budgetItems={budgetItems}
            targetBudget={targetBudget}
            remainingBudget={budgetSummary.remainingBudget}
            utilizationPercent={budgetSummary.utilizationPercent}
            isOverBudget={budgetSummary.isOverBudget}
            assessment={assessment}
            activeRevisionNumber={planRevision?.revision_number ?? null}
            onOpenCopilot={handleOpenCopilot}
          />
        </section>

        {/* AREA 5: Active Operational Blueprint */}
        <section
          id="plan"
          aria-labelledby="plan-heading"
          className="scroll-mt-28 space-y-4"
        >
          <div className="border-b border-slate-200/80 pb-3 dark:border-slate-800">
            <h2
              id="plan-heading"
              className="text-lg font-bold tracking-tight text-slate-950 dark:text-white sm:text-xl"
            >
              Operational Blueprint &amp; Plan Revisions
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Deterministic &amp; AI plan generator synthesizing phase milestones, vendor requirements, and budget allocations.
            </p>
          </div>
          <PlanGeneratorCard
            eventId={event.id}
            eventName={event.name}
            initialRevision={planRevision}
          />
        </section>

        {/* AREA 6: Dynamic Timeline & Vendor Checklist */}
        <section
          id="timeline"
          aria-labelledby="timeline-heading"
          className="scroll-mt-28 space-y-4"
        >
          <div className="border-b border-slate-200/80 pb-3 dark:border-slate-800">
            <h2
              id="timeline-heading"
              className="text-lg font-bold tracking-tight text-slate-950 dark:text-white sm:text-xl"
            >
              Dynamic Timeline &amp; Vendor Checklist
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Interactive milestone sequencing, overdue tracking, task priority filters, and checklist views.
            </p>
          </div>
          <TimelineChecklistManager
            eventId={event.id}
            eventDate={event.event_date}
            initialTasks={tasks}
            initialError={taskError}
          />
        </section>

        {/* AREA 7: Smart Budget Manager */}
        <section
          id="budget"
          aria-labelledby="budget-heading"
          className="scroll-mt-28 space-y-4"
        >
          <div className="border-b border-slate-200/80 pb-3 dark:border-slate-800">
            <h2
              id="budget-heading"
              className="text-lg font-bold tracking-tight text-slate-950 dark:text-white sm:text-xl"
            >
              Smart Budget Manager &amp; Variance Ledger
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Integer-cent variance tracking, category breakdowns, and hypothetical What-If budget scenarios.
            </p>
          </div>
          <BudgetManager
            eventId={event.id}
            targetBudget={targetBudget}
            initialItems={budgetItems}
            initialError={budgetError}
          />
        </section>

        {/* AREA 8: Event Risk Radar */}
        <section
          id="risks"
          aria-labelledby="risks-heading"
          className="scroll-mt-28 space-y-4"
        >
          <div className="border-b border-slate-200/80 pb-3 dark:border-slate-800">
            <h2
              id="risks-heading"
              className="text-lg font-bold tracking-tight text-slate-950 dark:text-white sm:text-xl"
            >
              Deterministic Event Risk Radar
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Automated threat detection across budget ceilings, overdue task dependencies, and checklist completeness.
            </p>
          </div>
          <EventRiskRadar
            event={event}
            budgetItems={budgetItems}
            tasks={tasks}
            activePlanRevision={planRevision}
          />
        </section>
      </main>

      {/* Floating AI Copilot Drawer */}
      <FloatingCopilotDrawer
        eventId={event.id}
        eventName={event.name}
        eventDate={event.event_date}
      />
    </div>
  );
}
