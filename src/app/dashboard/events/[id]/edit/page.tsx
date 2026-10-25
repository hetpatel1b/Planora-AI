import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getEventById } from "@/lib/actions/events";
import { EventForm } from "@/components/events/event-form";
import { ArrowLeft, Edit3 } from "lucide-react";

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditEventPageProps) {
  const { id } = await params;
  const result = await getEventById(id);
  if (!result.success) {
    return { title: "Edit Event | Planora AI" };
  }
  return {
    title: `Edit ${result.data.name} | Planora AI`,
  };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;

  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    redirect(`/sign-in?redirectTo=/dashboard/events/${id}/edit`);
  }

  const result = await getEventById(id);

  if (!result.success) {
    notFound();
  }

  const event = result.data;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Workspace</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="max-w-[180px] sm:max-w-xs truncate text-xs font-semibold text-slate-900 dark:text-white">
              Edit Setup
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300">
              Editing Workspace
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Edit3 className="size-3.5" />
            <span>Update Parameters</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Edit Event Setup
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Modify event name, target date, scale, budget, and operational boundaries for &ldquo;{event.name}&rdquo;.
          </p>
        </div>

        <EventForm mode="edit" initialData={event} />
      </main>
    </div>
  );
}
