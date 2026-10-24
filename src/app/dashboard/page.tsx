import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";
import { listEvents } from "@/lib/actions/events";
import { formatCurrency } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import { EmptyEvents } from "@/components/events/empty-events";
import {
  ShieldCheck,
  LogOut,
  Calendar,
  Layers,
  Sparkles,
  ArrowLeft,
  Mail,
  Clock,
  Plus,
  Users,
  DollarSign,
  Briefcase,
  AlertCircle,
} from "lucide-react";

export const metadata = {
  title: "Workspace Dashboard | Planora AI",
  description: "Manage your intelligent event setup, parameters, and planning workspaces.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense-in-depth: Server Component check ensures unauthenticated users are redirected
  if (!user) {
    redirect("/sign-in");
  }

  // Retrieve user's events via secure data layer
  const eventsResult = await listEvents();
  const events = eventsResult.success ? eventsResult.data : [];
  const fetchError = !eventsResult.success ? eventsResult.error : null;

  // Aggregate metrics
  const totalEvents = events.length;
  const totalBudget = events.reduce((acc, ev) => acc + Number(ev.budget || 0), 0);
  const totalGuests = events.reduce((acc, ev) => acc + Number(ev.guest_count || 0), 0);

  const lastSignInFormatted = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Active Session";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Dashboard Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              <span>Planora</span>
              <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 text-xs font-black tracking-wider text-white">
                AI
              </span>
            </Link>
            <span className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 sm:inline-block dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300">
              Workspace Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800 sm:inline-flex dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Landing</span>
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Mail className="size-3 text-indigo-600 dark:text-indigo-400" />
              <span className="max-w-[150px] truncate sm:max-w-[200px]">
                {user.email}
              </span>
            </div>

            <form action={signOutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="gap-1.5 border-slate-300 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        {/* Welcome & Aggregate Workspace Stats */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <ShieldCheck className="size-3.5" />
                <span>Authenticated Session Verified</span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                Event Planning Workspace
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Welcome back. Oversee active event configurations, schedules, and budgets.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard/events/new">
                <Button className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs">
                  <Plus className="size-4" />
                  <span>Create New Event</span>
                </Button>
              </Link>
              <Link
                href="/#preview"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Layers className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Feature Preview</span>
              </Link>
            </div>
          </div>

          {/* User Session & Portfolio Metrics Grid */}
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
            {/* Total Workspaces */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Briefcase className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Total Events
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  {totalEvents}
                </p>
              </div>
            </div>

            {/* Total Combined Budget */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <DollarSign className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Allocated Budget
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
            </div>

            {/* Total Estimated Attendees */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Users className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Total Attendees
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  {totalGuests.toLocaleString()}
                </p>
              </div>
            </div>

            {/* User Session info */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Clock className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Session Verified
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {lastSignInFormatted}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Database Load Error Alert */}
        {fetchError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <p>{fetchError}</p>
          </div>
        )}

        {/* Saved Events Grid Section */}
        <section aria-labelledby="events-heading" className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Sparkles className="size-3.5" />
                <span>Feature Pillar F01</span>
              </div>
              <h2
                id="events-heading"
                className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl"
              >
                Your Event Workspaces
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                All event models are isolated by user identity and PostgreSQL Row Level Security.
              </p>
            </div>

            {totalEvents > 0 && (
              <Link href="/dashboard/events/new">
                <Button size="sm" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs">
                  <Plus className="size-4" />
                  <span>New Event</span>
                </Button>
              </Link>
            )}
          </div>

          {totalEvents === 0 ? (
            <EmptyEvents />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Phase Roadmap Progression Callout */}
        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/30 p-6 shadow-xs sm:p-8 dark:border-indigo-900/50 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                <span>Phase 3 • F01 Intelligent Event Setup Complete</span>
              </div>
              <h2 className="mt-2 text-base font-bold text-slate-950 dark:text-white">
                Intelligent Event Setup Activated
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Events are persisted with complete client and server validation. In Phase 4, the AI Event Plan Generator will analyze these parameters to produce comprehensive milestone schedules and operational blueprints.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Event CRUD Verified</span>
                </div>
                <span>•</span>
                <span>Protected by Server Actions &amp; PostgreSQL RLS</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
