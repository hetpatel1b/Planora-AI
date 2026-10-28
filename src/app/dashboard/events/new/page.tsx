import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { EventForm } from "@/components/events/event-form";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata = {
  title: "Create Event Workspace | Planora AI",
  description: "Set up a new structured event workspace with classification, timeline, and budget.",
};

export default async function NewEventPage() {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    redirect("/sign-in?redirectTo=/dashboard/events/new");
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Breadcrumb Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md px-1 py-0.5 shrink-0"
              title="Return to Workspace Dashboard"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700 select-none" aria-hidden="true">
              /
            </span>
            <span
              className="truncate text-xs font-semibold text-slate-900 dark:text-white"
              aria-current="page"
            >
              New Event Setup
            </span>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full border border-violet-200/70 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-300">
              Workspace Setup
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="mx-auto max-w-5xl px-4 pt-8 sm:pt-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900/40">
            <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
            <span>Intelligent Event Setup</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Create Event Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Define your core event requirements, attendee capacity, location, and initial financial parameters.
          </p>
        </div>

        <EventForm mode="create" />
      </main>
    </div>
  );
}
