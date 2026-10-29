import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHeroCta } from "@/components/landing/landing-hero-cta";
import { WorkspacePreview } from "@/components/landing/workspace-preview";
import { PlanoraLogo } from "@/components/ui/planora-logo";
import {
  Sparkles,
  Layers,
  IndianRupee,
  Clock,
  Bot,
  Sliders,
  ShieldAlert,
  FileDown,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Lock,
  ArrowRight,
  Share2,
  Cpu,
  Layers3,
  CalendarCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentYear = new Date().getFullYear();

  let user = null;
  try {
    const { data } = await getAuthenticatedUser();
    user = data?.user ? { id: data.user.id, email: data.user.email } : null;
  } catch {
    user = null;
  }

  const features = [
    {
      id: "setup",
      icon: Sparkles,
      title: "Intelligent Event Setup",
      description:
        "Structured intake capture for event type, guest capacity, venue parameters, key dates, and baseline budgets to establish an organized project foundation.",
      badge: "Foundation",
    },
    {
      id: "generator",
      icon: Layers,
      title: "AI Event Plan Generator",
      description:
        "Synthesizes tailored event blueprints with complete run-of-show schedules, milestone targets, and operational checklists aligned to your event profile via deterministic planning algorithms.",
      badge: "Deterministic Engine",
    },
    {
      id: "budget",
      icon: IndianRupee,
      title: "Smart Budget Manager",
      description:
        "Granular cost breakdown across venues, catering, audiovisual, and contingency reserves with automated variance alerts to prevent budget overruns.",
      badge: "Financial Control",
    },
    {
      id: "timeline",
      icon: Clock,
      title: "Dynamic Timeline and Checklist",
      description:
        "Adaptive milestone countdowns and sequenced task dependencies that automatically recalculate when deliverables or schedules shift.",
      badge: "Adaptive",
    },
    {
      id: "copilot",
      icon: Bot,
      title: "Conversational AI Copilot",
      description:
        "Context-aware assistant ready to brainstorm themes, draft vendor briefs, optimize agendas, and answer logistical questions in real time.",
      badge: "Copilot",
    },
    {
      id: "simulator",
      icon: Sliders,
      title: "What-If Budget Simulator",
      description:
        "Interactive scenario modeling to evaluate financial trade-offs—such as guest count adjustments or premium venue upgrades—before committing funds.",
      badge: "Scenario Lab",
    },
    {
      id: "risk",
      icon: ShieldAlert,
      title: "Event Risk Radar",
      description:
        "Proactive intelligence scanning vendor lead times, payment terms, and scheduling slack to identify potential bottlenecks before they impact delivery.",
      badge: "Risk Defense",
    },
    {
      id: "export",
      icon: FileDown,
      title: "PDF/CSV Export",
      description:
        "Generate clean, shareable run-of-show sheets, vendor briefing summaries, and itemized financial manifests for stakeholders and partners.",
      badge: "Publishing",
    },
  ];

  const workflowStages = [
    {
      step: "01",
      icon: Sliders,
      title: "Define Parameters",
      desc: "Specify your event vision, guest estimates, target dates, and initial budget constraints through structured guided intake.",
    },
    {
      step: "02",
      icon: Sparkles,
      title: "Generate Blueprint",
      desc: "Deterministic planning algorithms produce tailored run-of-show schedules, milestone targets, and operational task checklists.",
    },
    {
      step: "03",
      icon: ShieldAlert,
      title: "Simulate & Mitigate",
      desc: "Model what-if budget trade-offs and monitor the proactive Risk Radar to flag supplier lead-time dependencies early.",
    },
    {
      step: "04",
      icon: Share2,
      title: "Coordinate & Export",
      desc: "Keep stakeholders aligned with dynamic milestone progress, CSV data manifests, and browser-native PDF run-of-show sheets.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 selection:bg-violet-100 selection:text-violet-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {/* Top Accessible Navigation Bar */}
      <LandingNavbar initialUser={user} />

      {/* Main Content Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-white via-violet-50/20 to-slate-50/40 py-16 sm:py-24 lg:py-28 dark:border-slate-800 dark:from-slate-950 dark:via-violet-950/10 dark:to-slate-900">
          {/* Subtle Ambient Radial Glow */}
          <div
            className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-600/10"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Product Positioning Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/90 bg-violet-50/80 px-3.5 py-1 text-xs font-semibold text-violet-700 shadow-2xs dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-300">
                <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <span>Next-Generation Event Intelligence</span>
              </div>

              {/* Preserved Headline with Refined Gradient & Fluid Typography */}
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[1.12] dark:text-white">
                Effortless Event Planning,{" "}
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Orchestrated with AI
                </span>
              </h1>

              {/* Subheading */}
              <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg lg:text-xl dark:text-slate-300 max-w-2xl mx-auto">
                Replace chaotic spreadsheets and fragmented notes. Planora AI unifies intelligent blueprint generation, predictive budget simulations, dynamic milestone tracking, and proactive risk detection into one cohesive workspace.
              </p>

              {/* Reactive Auth-Aware Hero CTAs */}
              <LandingHeroCta initialUser={user} />

              {/* Value Proposition Micro-Cards */}
              <div className="mt-12 grid grid-cols-2 gap-2.5 sm:gap-4 pt-6 text-left sm:grid-cols-4 sm:border-t sm:border-slate-200/80 sm:pt-8 dark:border-slate-800">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span className="leading-snug">Zero Spreadsheet Chaos</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span className="leading-snug">Real-Time Budget Guardrails</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span className="leading-snug">Adaptive Milestones</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span className="leading-snug">Proactive Risk Radar</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Interactive Workspace Preview */}
        <section
          id="preview"
          className="scroll-mt-20 border-b border-slate-200/80 bg-white py-16 sm:py-24 dark:border-slate-800 dark:bg-slate-900"
          aria-labelledby="preview-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <WorkspacePreview />
          </div>
        </section>

        {/* Section 3: Eight Feature Pillars */}
        <section
          id="features"
          className="scroll-mt-20 border-b border-slate-200/80 bg-slate-50/60 py-16 sm:py-24 lg:py-28 dark:border-slate-800 dark:bg-slate-950"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
                <Cpu className="size-3.5" aria-hidden="true" />
                <span>Core Capabilities</span>
              </span>
              <h2
                id="features-heading"
                className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
              >
                Eight Pillars of Precision Event Orchestration
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                Planora AI blends structured workflow automation with context-aware intelligence to give event planners end-to-end clarity.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, idx) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={feature.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-violet-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-700/60"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 group-hover:bg-gradient-to-tr group-hover:from-violet-600 group-hover:to-indigo-600 group-hover:text-white transition-all duration-200 shadow-2xs dark:bg-violet-950/60 dark:text-violet-400">
                          <IconComponent className="size-5" aria-hidden="true" />
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          {feature.badge}
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-950 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
                        {feature.description}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                      <a
                        href="#preview"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-200 group-hover:translate-x-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm"
                        aria-label={`Explore ${feature.title} in preview`}
                      >
                        <span>Pillar {String(idx + 1).padStart(2, "0")}</span>
                        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 4: Four-Stage Workflow */}
        <section
          id="workflow"
          className="scroll-mt-20 border-b border-slate-200/80 bg-white py-16 sm:py-24 lg:py-28 dark:border-slate-800 dark:bg-slate-900"
          aria-labelledby="workflow-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
                <Layers3 className="size-3.5" aria-hidden="true" />
                <span>Methodology</span>
              </span>
              <h2
                id="workflow-heading"
                className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
              >
                How Planora AI Delivers Flawless Events
              </h2>
              <p className="mt-3 text-base text-slate-600 sm:text-lg dark:text-slate-300 max-w-2xl mx-auto">
                A structured four-stage lifecycle guiding planners from initial concept to calm, organized post-event reconciliation.
              </p>
            </div>

            <div className="relative mt-14">
              {/* Subtle Connecting Line on Desktop */}
              <div
                className="hidden lg:block absolute top-12 left-12 right-12 h-0.5 bg-gradient-to-r from-violet-200 via-indigo-200 to-violet-200 dark:from-violet-900/50 dark:via-indigo-900/50 dark:to-violet-900/50 z-0"
                aria-hidden="true"
              />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {workflowStages.map((stage) => {
                  const StageIcon = stage.icon;
                  return (
                    <div
                      key={stage.step}
                      className="relative z-10 flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-6 shadow-xs hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-800"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 px-2.5 py-1 text-xs font-black tracking-wider text-white shadow-2xs">
                            Step {stage.step}
                          </span>
                          <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-violet-600 dark:bg-slate-900 dark:border-slate-800 dark:text-violet-400">
                            <StageIcon className="size-4" aria-hidden="true" />
                          </div>
                        </div>

                        <h3 className="mt-5 text-base font-bold text-slate-950 dark:text-white">
                          {stage.title}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
                          {stage.desc}
                        </p>
                      </div>

                      <div className="mt-5 border-t border-slate-200/60 pt-3 dark:border-slate-800/80">
                        <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-400 flex items-center gap-1">
                          <span>Milestone Checkpoint</span>
                          <ChevronRight className="size-3" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Platform Capabilities & Architecture Status */}
        <section
          id="status"
          className="scroll-mt-20 border-b border-slate-200/80 bg-gradient-to-b from-slate-50 via-violet-50/15 to-slate-50 py-16 sm:py-24 dark:border-slate-800 dark:from-slate-950 dark:via-violet-950/10 dark:to-slate-950"
          aria-labelledby="status-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-violet-200/90 bg-white p-6 shadow-sm sm:p-10 dark:border-violet-900/60 dark:bg-slate-900">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/70 dark:text-violet-300">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    <span>Platform Capabilities &amp; Roadmap</span>
                  </div>
                  <h2
                    id="status-heading"
                    className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-white"
                  >
                    Engineered for Production Precision
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                    Planora AI pairs deterministic algorithmic foundations with context-aware LLM intelligence. Every planning tool in our core suite operates with zero guesswork and robust decimal-safe financial math.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/40">
                      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                      <span>8 Core Engines Live</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2.5 py-1 font-semibold text-violet-800 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900/40">
                      <Bot className="size-3.5 text-violet-600" aria-hidden="true" />
                      <span>Groq AI Copilot Active</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Lock className="size-3.5 text-slate-500" aria-hidden="true" />
                      <span>PostgreSQL Row Level Security</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col shrink-0 lg:max-w-xs w-full">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/60 flex-1">
                    <span className="font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                      <CalendarCheck className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                      <span>Active in Workspaces:</span>
                    </span>
                    <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                      Event setup intake, deterministic plan blueprints, decimal-safe budget tracking, adaptive timelines, Groq-powered AI Copilot, in-browser what-if simulation, and PDF/CSV data exports.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/60 flex-1">
                    <span className="font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                      <ArrowRight className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                      <span>Planned Roadmap:</span>
                    </span>
                    <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                      Multi-organizer role collaboration, persistent cloud scenario branching, and integrated vendor procurement directories.
                    </p>
                  </div>
                </div>
              </div>

              {/* Truthful Architectural Transparency Disclosure */}
              <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p>
                  * What-If simulations calculate in-browser scenario models before manual adoption. PDF export formats via browser-native print stylesheets.
                </p>
                <a
                  href="#preview"
                  className="font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-200 shrink-0"
                >
                  Inspect sample workspace →
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Polish Semantic Footer */}
      <footer role="contentinfo" className="border-t border-slate-200/80 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                <PlanoraLogo size={30} iconClassName="size-7 drop-shadow-2xs" />
                <span className="font-extrabold">Planora</span>
                <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 text-xs font-black tracking-wider text-white shadow-2xs">
                  AI
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                Intelligent event orchestration, financial clarity, and proactive risk defense for modern organizers.
              </p>
            </div>

            <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600 dark:text-slate-400">
              <a
                href="#features"
                className="transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm py-1 px-1.5"
              >
                Features
              </a>
              <a
                href="#preview"
                className="transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm py-1 px-1.5"
              >
                Workspace Preview
              </a>
              <a
                href="#workflow"
                className="transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm py-1 px-1.5"
              >
                Workflow
              </a>
              <a
                href="#status"
                className="transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm py-1 px-1.5"
              >
                Capabilities
              </a>
              {user ? (
                <Link
                  href="/dashboard"
                  className="font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm py-1 px-1.5"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  className="transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm py-1 px-1.5"
                >
                  Sign in
                </Link>
              )}
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 py-1 px-1.5">
                <Lock className="size-3" aria-hidden="true" />
                <span>Protected by design</span>
              </div>
            </nav>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-[11px] text-slate-500 sm:flex-row dark:border-slate-800/80 dark:text-slate-400">
            <p>© {currentYear} Planora AI. All rights reserved.</p>
            <p>Engineered with Next.js 16, React 19, Tailwind CSS v4 &amp; Base UI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
