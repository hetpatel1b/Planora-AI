import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Layers, Sparkles } from "lucide-react";

export function EmptyEvents() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/90 bg-white/70 px-6 py-16 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-2xs dark:bg-violet-950/80 dark:text-violet-300">
        <Calendar className="size-7" aria-hidden="true" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
        No Events in Workspace
      </h3>

      <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        You haven&rsquo;t set up any event workspaces yet. Kickstart your event planning
        by configuring event parameters, target dates, guest scales, and financial ceilings.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard/events/new">
          <Button
            size="sm"
            className="h-9 gap-2 bg-violet-600 text-white hover:bg-violet-700 shadow-xs focus-visible:ring-violet-500"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Create Your First Event</span>
          </Button>
        </Link>
        <Link href="/#preview">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 border-slate-200/90 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Layers className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
            <span>Explore Feature Preview</span>
          </Button>
        </Link>
      </div>

      <div className="mt-8 border-t border-slate-200/60 pt-6 dark:border-slate-800/80">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Sparkles className="size-3 text-violet-500" aria-hidden="true" />
          <span>Supported Event Classifications</span>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
            Conferences &amp; Summits
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
            Corporate Offsites
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
            Weddings &amp; Galas
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
            Meetups &amp; Celebrations
          </span>
        </div>
      </div>
    </div>
  );
}
