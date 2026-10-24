import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Layers } from "lucide-react";

export function EmptyEvents() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs dark:bg-indigo-950/80 dark:text-indigo-400">
        <Calendar className="size-7" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
        No Events in Workspace
      </h3>

      <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        You haven&rsquo;t set up any event workspaces yet. Kickstart your event planning
        by configuring the event classification, target date, scale, and financial ceiling.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard/events/new">
          <Button size="sm" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs">
            <Plus className="size-4" />
            <span>Create Your First Event</span>
          </Button>
        </Link>
        <Link href="/#preview">
          <Button variant="outline" size="sm" className="gap-2">
            <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Explore Feature Preview</span>
          </Button>
        </Link>
      </div>

      <div className="mt-8 border-t border-slate-200/60 pt-6 dark:border-slate-800">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Popular Event Classifications Supported
        </p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Conferences &amp; Summits
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Corporate Offsites
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Weddings &amp; Galas
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Meetups &amp; Celebrations
          </span>
        </div>
      </div>
    </div>
  );
}
