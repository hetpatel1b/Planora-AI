import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";
import { listEvents } from "@/lib/actions/events";
import { formatCurrency } from "@/lib/currency-utils";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/event-card";
import { EmptyEvents } from "@/components/events/empty-events";
import { PlanoraLogo } from "@/components/ui/planora-logo";
import {
  ShieldCheck,
  LogOut,
  Layers,
  Sparkles,
  ArrowLeft,
  Clock,
  Plus,
  Users,
  DollarSign,
  Briefcase,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Workspace Dashboard | Planora AI",
  description: "Manage your intelligent event setup, parameters, and planning workspaces.",
};

export default async function DashboardPage() {
  const {
    data: { user },
  } = await getAuthenticatedUser();

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

  const userInitial = user.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Dashboard Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="group flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg py-1 px-1 -ml-1 transition-opacity hover:opacity-90"
              title="Planora AI - Return to Homepage"
            >
              <PlanoraLogo size={34} iconClassName="size-[32px] sm:size-[34px] drop-shadow-2xs shrink-0" />
              <span>Planora</span>
              <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 text-[11px] sm:text-xs font-black tracking-wider text-white shadow-2xs">
                AI
              </span>
            </Link>
            <span className="hidden rounded-full border border-violet-200/70 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 md:inline-block dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-300">
              Workspace Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900 lg:inline-flex dark:text-slate-400 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md px-2 py-1"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>Back to Landing</span>
            </Link>

            {/* Authenticated User Identity Pill */}
            <div
              className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200/90 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 shadow-2xs"
              title={`Signed in as: ${user.email}`}
            >
              <div
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                aria-hidden="true"
              >
                {userInitial}
              </div>
              <span className="hidden sm:inline-block max-w-[130px] md:max-w-[180px] lg:max-w-[220px] truncate font-medium">
                {user.email}
              </span>
            </div>

            {/* Sign Out Action */}
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                aria-label="Sign out of your account"
                className="h-8 gap-1.5 border-slate-200/90 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-violet-500 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Welcome & Aggregate Workspace Stats */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900/40">
                <ShieldCheck className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <span>Active Workspace Session</span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                Event Planning Workspace
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Oversee active event configurations, schedules, budgets, and operational blueprints.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/#preview"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
              >
                <Layers className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <span>Feature Preview</span>
              </Link>
            </div>
          </div>

          {/* User Session & Portfolio Metrics Grid */}
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
            {/* Total Workspaces */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Briefcase className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Events
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  {totalEvents}
                </p>
              </div>
            </div>

            {/* Total Combined Budget */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <DollarSign className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Allocated Budget
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white truncate">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
            </div>

            {/* Total Estimated Attendees */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Users className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Planned Attendees
                </p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                  {totalGuests.toLocaleString()}
                </p>
              </div>
            </div>

            {/* User Session info */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Clock className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Last Account Activity
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-900 dark:text-white" title={lastSignInFormatted}>
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
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" aria-hidden="true" />
            <p>{fetchError}</p>
          </div>
        )}

        {/* Saved Events Grid Section */}
        <section aria-labelledby="events-heading" className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-400">
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>Feature Pillar F01 • Event Workspaces</span>
              </div>
              <h2
                id="events-heading"
                className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl"
              >
                Your Event Workspaces
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                All event models are isolated by user identity and PostgreSQL Row Level Security.
              </p>
            </div>

            {totalEvents > 0 && (
              <Link href="/dashboard/events/new">
                <Button size="sm" className="h-9 gap-2 bg-violet-600 text-white hover:bg-violet-700 shadow-xs focus-visible:ring-violet-500">
                  <Plus className="size-4" aria-hidden="true" />
                  <span>Create New Event</span>
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

        {/* Active Planning Suite Capabilities Callout */}
        <div className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/40 p-6 shadow-xs sm:p-8 dark:border-violet-900/50 dark:bg-slate-900">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-100/90 px-2.5 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                <span>Integrated Event Intelligence Platform</span>
              </div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Live Intelligent Planning Tools Activated
              </h2>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 max-w-3xl">
                Each event workspace provides an end-to-end planning suite: deterministic AI blueprint synthesis, integer-cent budget management with real-time variance tracking, dynamic milestone timeline sequencing, and context-aware copilot assistance.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="inline-flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>AI Blueprint Synthesis</span>
                </div>
                <span>•</span>
                <div className="inline-flex items-center gap-1.5 font-medium">
                  <DollarSign className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                  <span>Integer-Cent Budget Variance</span>
                </div>
                <span>•</span>
                <div className="inline-flex items-center gap-1.5 font-medium">
                  <FileSpreadsheet className="size-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <span>Data Export (CSV &amp; JSON)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
