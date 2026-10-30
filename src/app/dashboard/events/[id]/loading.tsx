import * as React from "react";

/**
 * Accessible loading skeleton for the event workspace command center route (/dashboard/events/[id]).
 * Mirrors the structure of EventCommandCenter to prevent layout shift during async data fetch.
 */
export default function EventDetailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading event workspace"
      className="min-h-screen bg-slate-50/60 pb-16 dark:bg-slate-950 animate-pulse"
    >
      <span className="sr-only">Loading event command center...</span>

      {/* Top Breadcrumb / Workspace Header Skeleton */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 space-y-4">
          <div className="h-4 w-32 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary Metric Bar Skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2"
            >
              <div className="h-3 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
          {[1, 2, 3, 4, 5].map((tab) => (
            <div key={tab} className="h-9 w-24 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          ))}
        </div>

        {/* Active Section Content Skeleton */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="h-6 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded-md bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-5/6 rounded-md bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-4/6 rounded-md bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </main>
    </div>
  );
}

