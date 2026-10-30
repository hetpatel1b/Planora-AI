import * as React from "react";

/**
 * Accessible loading skeleton for the main dashboard route (/dashboard).
 * Mirrors the exact structural layout of DashboardPage to prevent layout shifts.
 */
export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading workspace dashboard"
      className="min-h-screen bg-slate-50/60 pb-16 dark:bg-slate-950 animate-pulse"
    >
      <span className="sr-only">Loading workspace dashboard...</span>

      {/* Top Navigation Skeleton */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="size-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-28 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-72 rounded-md bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Aggregate KPI Metric Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="h-8 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>

        {/* Events Grid Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-36 rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-36 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded-md bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-2/3 rounded-md bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                  <div className="h-4 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

