"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { AIPlanBlueprint, PlanRevisionRow } from "@/lib/validations/plan";
import { generateEventPlanAction } from "@/lib/actions/plan";
import { PlanBlueprintViewer } from "@/components/plan/plan-blueprint-viewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Layers,
} from "lucide-react";

export interface PlanGeneratorCardProps {
  eventId: string;
  eventName?: string;
  initialRevision?: PlanRevisionRow | null;
  onPlanAccepted?: (revision: PlanRevisionRow) => void;
  className?: string;
}

type GeneratorState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "reviewing"; blueprint: AIPlanBlueprint }
  | { status: "accepted"; revision: PlanRevisionRow; blueprint?: AIPlanBlueprint }
  | { status: "error"; error: string };

export function PlanGeneratorCard({
  eventId,
  eventName,
  initialRevision,
  onPlanAccepted,
  className = "",
}: PlanGeneratorCardProps) {
  const router = useRouter();

  // If an initial revision was passed, we can represent it as already having an accepted revision
  const [state, setState] = React.useState<GeneratorState>(() => {
    if (initialRevision) {
      const blueprint =
        typeof initialRevision.structured_plan === "object" &&
        initialRevision.structured_plan !== null
          ? (initialRevision.structured_plan as AIPlanBlueprint)
          : undefined;
      return { status: "accepted", revision: initialRevision, blueprint };
    }
    return { status: "idle" };
  });

  // Sync state if initialRevision prop updates from server revalidation
  const [prevInitialRevision, setPrevInitialRevision] = React.useState(initialRevision);
  if (initialRevision !== prevInitialRevision) {
    setPrevInitialRevision(initialRevision);
    if (initialRevision && state.status !== "reviewing" && state.status !== "generating") {
      const blueprint =
        typeof initialRevision.structured_plan === "object" &&
        initialRevision.structured_plan !== null
          ? (initialRevision.structured_plan as AIPlanBlueprint)
          : undefined;
      setState({ status: "accepted", revision: initialRevision, blueprint });
    }
  }

  // Call the read-only generate action
  const handleGenerate = async () => {
    setState({ status: "generating" });

    try {
      const result = await generateEventPlanAction(eventId);

      if (!result.success) {
        setState({
          status: "error",
          error: result.error || "Failed to generate event planning blueprint.",
        });
        return;
      }

      setState({
        status: "reviewing",
        blueprint: result.data,
      });
    } catch {
      setState({
        status: "error",
        error: "An unexpected error occurred while communicating with the planning engine.",
      });
    }
  };

  const handleDiscard = () => {
    if (initialRevision) {
      const blueprint =
        typeof initialRevision.structured_plan === "object" &&
        initialRevision.structured_plan !== null
          ? (initialRevision.structured_plan as AIPlanBlueprint)
          : undefined;
      setState({ status: "accepted", revision: initialRevision, blueprint });
    } else {
      setState({ status: "idle" });
    }
  };

  const handleAccepted = (revision: PlanRevisionRow) => {
    const blueprint =
      typeof revision.structured_plan === "object" && revision.structured_plan !== null
        ? (revision.structured_plan as AIPlanBlueprint)
        : undefined;

    setState({
      status: "accepted",
      revision,
      blueprint,
    });
    onPlanAccepted?.(revision);

    try {
      router.refresh();
    } catch {
      // Ignore in non-browser testing environments
    }
  };

  // State 1: Reviewing a proposed blueprint
  if (state.status === "reviewing") {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Quick controls bar */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Reviewing Generated Blueprint Draft
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleGenerate}
              className="gap-1.5"
            >
              <RotateCcw className="size-3" />
              <span>Regenerate Draft</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleDiscard}
            >
              Close Preview
            </Button>
          </div>
        </div>

        {/* Blueprint Viewer */}
        <PlanBlueprintViewer
          eventId={eventId}
          blueprint={state.blueprint}
          onAccepted={handleAccepted}
          onDiscard={handleDiscard}
        />
      </div>
    );
  }

  // State 2: Generating in progress
  if (state.status === "generating") {
    return (
      <div
        className={`rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white p-8 text-center shadow-xs dark:border-indigo-950/70 dark:bg-gradient-to-b dark:from-indigo-950/20 dark:to-slate-900 ${className}`}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-xs dark:bg-indigo-950 dark:text-indigo-400">
          <Loader2 className="size-7 animate-spin" />
        </div>

        <h3 className="mt-4 text-base font-bold text-slate-950 dark:text-white">
          Synthesizing Event Blueprint...
        </h3>

        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Analyzing event parameters, scheduling milestones, computing category budget allocations, and curating checklist tasks for {eventName || "your event"}.
        </p>

        <div className="mx-auto mt-6 max-w-xs space-y-2 text-left">
          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-[9px] font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
              ✓
            </span>
            <span>Parsing guest count, budget, and constraints</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-[9px] font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
              ✓
            </span>
            <span>Synthesizing chronological milestones</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            <Loader2 className="size-4 shrink-0 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Apportioning budget and building checklists...</span>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Error during generation
  if (state.status === "error") {
    return (
      <div
        className={`rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/20 ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <AlertCircle className="size-5" />
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-bold text-rose-950 dark:text-rose-200">
              Unable to Generate Event Blueprint
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {state.error}
            </p>

            <div className="pt-2 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
              >
                <RotateCcw className="size-3.5" />
                <span>Retry Generation</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleDiscard}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Already accepted / has a saved revision
  if (state.status === "accepted") {
    return (
      <div
        className={`rounded-2xl border border-emerald-200/80 bg-white p-6 shadow-xs dark:border-emerald-950/60 dark:bg-slate-900 ${className}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                  Active Plan Revision #{state.revision.revision_number}
                </h3>
                <Badge variant="success" className="text-[10px]">
                  Applied
                </Badge>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                {state.revision.summary || "Event blueprint applied to workspace."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {state.blueprint && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  state.blueprint &&
                  setState({ status: "reviewing", blueprint: state.blueprint })
                }
                className="gap-1.5"
              >
                <Layers className="size-3.5" />
                <span>View Full Blueprint</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              <RotateCcw className="size-3.5" />
              <span>Generate New Revision</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // State 5: Idle (Initial State)
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Sparkles className="size-6" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">
                AI &amp; Rule-Based Plan Generator
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                F02 Blueprint
              </Badge>
            </div>

            <p className="max-w-xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Synthesize a complete event roadmap tailored to your event parameters. Generates schedule milestones, vendor checklists, strategic recommendations, and budget allocations.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                100% read-only preview before acceptance
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                Select which tasks and budget items to import
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <Button
            type="button"
            size="lg"
            onClick={handleGenerate}
            className="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 sm:w-auto"
          >
            <Sparkles className="size-4" />
            <span>Generate Event Plan</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
