import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sparkles,
  Layers,
  DollarSign,
  Clock,
  Bot,
  Sliders,
  ShieldAlert,
  FileDown,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Users,
  MapPin,
  AlertTriangle,
  Lock,
  ChevronRight,
  ShieldCheck,
  Send,
} from "lucide-react";

export default function Home() {
  const currentYear = new Date().getFullYear();

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
      icon: DollarSign,
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

  const workflowSteps = [
    {
      step: "01",
      title: "Define Parameters",
      desc: "Specify your event vision, guest estimates, dates, and budget boundaries through guided setup.",
    },
    {
      step: "02",
      title: "Generate Blueprint",
      desc: "AI produces an end-to-end plan covering milestones, run-of-show schedules, and operational checklists.",
    },
    {
      step: "03",
      title: "Simulate & Mitigate",
      desc: "Test what-if budget scenarios and review the Risk Radar to catch logistical blind spots early.",
    },
    {
      step: "04",
      title: "Coordinate & Export",
      desc: "Keep team and vendors aligned with live milestone tracking and one-click PDF/CSV exports.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="group flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white"
              aria-label="Planora AI home"
            >
              <span>Planora</span>
              <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 text-xs font-black tracking-wider text-white">
                AI
              </span>
            </a>
            <span className="hidden rounded-full border border-violet-200 bg-violet-50/80 px-2.5 py-0.5 text-xs font-medium text-violet-700 sm:inline-block dark:border-violet-900/50 dark:bg-violet-950/50 dark:text-violet-300">
              Phases 1–4 Implemented
            </span>
          </div>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300"
          >
            <a
              href="#features"
              className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Features
            </a>
            <a
              href="#preview"
              className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Workspace Preview
            </a>
            <a
              href="#workflow"
              className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Workflow
            </a>
            <a
              href="#status"
              className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Status
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "text-slate-700 dark:text-slate-300",
              })}
            >
              Sign in
            </Link>
            <a
              href="#preview"
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className:
                  "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors",
              })}
            >
              Start planning
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-b from-white via-slate-50/50 to-indigo-50/20 py-20 sm:py-28 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/70 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-xs dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>Next-Generation Event Intelligence</span>
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                Effortless Event Planning,{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent">
                  Orchestrated with AI
                </span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-300">
                Replace chaotic spreadsheets and fragmented notes. Planora AI
                unifies intelligent blueprint generation, predictive budget
                simulations, dynamic milestone tracking, and proactive risk
                detection into one cohesive workspace.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <a
                  href="#preview"
                  className={buttonVariants({
                    variant: "default",
                    size: "lg",
                    className:
                      "w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 shadow-md font-medium px-6 py-2.5",
                  })}
                >
                  <span>Start planning</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </a>
                <a
                  href="#features"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className:
                      "w-full sm:w-auto border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 px-6 py-2.5",
                  })}
                >
                  Explore features
                </a>
              </div>

              {/* Value proposition badges */}
              <div className="mt-12 grid grid-cols-2 gap-3 pt-6 text-left sm:grid-cols-4 sm:border-t sm:border-slate-200/80 sm:pt-8 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Zero Spreadsheet Chaos</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Real-Time Budget Guardrails</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Adaptive Milestones</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Proactive Risk Radar</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Event Planning Workspace Preview */}
        <section
          id="preview"
          className="border-b border-slate-200/80 bg-white py-16 sm:py-24 dark:border-slate-800 dark:bg-slate-900"
          aria-labelledby="preview-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <span>Illustrative Sample Data</span>
                  <span className="text-indigo-500">•</span>
                  <span>Core Planning Live</span>
                </div>
                <h2
                  id="preview-heading"
                  className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white"
                >
                  Interactive Event Workspace Preview
                </h2>
                <p className="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-400">
                  A high-fidelity preview demonstrating how Planora AI unifies
                  budgets, schedules, and AI copilot alerts in active projects.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="cursor-not-allowed opacity-75 text-xs"
                  aria-label="Export Run of Show (preview disabled)"
                >
                  <FileDown className="size-3.5" />
                  <span>Export Run of Show (Demo)</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled
                  className="cursor-not-allowed bg-indigo-600/80 text-white text-xs opacity-80"
                  aria-label="Simulate Scenarios (preview disabled)"
                >
                  <Sliders className="size-3.5" />
                  <span>Simulate Scenarios (Demo)</span>
                </Button>
              </div>
            </div>

            {/* Event Header Card */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      Corporate Conference
                    </span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Status: On Track • 68% Prepared
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                    Apex Horizon Tech Summit 2026
                  </h3>
                  <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    Annual flagship engineering summit and partner ecosystem
                    showcase
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 sm:text-sm dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Oct 24–26, 2026</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Moscone West, San Francisco</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <span>450 Confirmed Attendees</span>
                  </div>
                </div>
              </div>

              {/* Sample Dashboard Modules Grid */}
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Module 1: Smart Budget Manager */}
                <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Smart Budget Manager
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Under Target
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-slate-950 dark:text-white">
                        $58,400
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {" "}
                        committed
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Budget: $85,000
                    </span>
                  </div>

                  {/* Allocation Bar */}
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: "68.7%" }}
                        role="progressbar"
                        aria-valuenow={68.7}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Budget consumption: 68.7 percent"
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>$26,600 buffer remaining</span>
                      <span>68.7% utilized</span>
                    </div>
                  </div>

                  {/* Breakdown lines */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Venue & Facilities
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        $35,000 (41%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Audiovisual & Streaming
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        $14,500 (17%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Catering & Refreshments
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        $8,900 (10%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Module 2: Dynamic Timeline & Checklist */}
                <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Dynamic Timeline
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      T-4 days to Milestone
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 line-through decoration-slate-400 dark:text-slate-200">
                          Finalize Keynote Speaker Contracts
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Completed Oct 12 • Confirmed
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Clock className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          AV Production & Live Stream Dry Run
                        </p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          Due in 3 days • Pending Tech Spec
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Calendar className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                          Attendee Badge & Swag Delivery
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Scheduled for Oct 22
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>14 of 18 tasks complete</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        77% done
                      </span>
                    </div>
                  </div>
                </div>

                {/* Module 3: Event Risk Radar & Copilot */}
                <div className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Risk Radar & Copilot
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      1 Low Advisory
                    </span>
                  </div>

                  {/* Advisory Box */}
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/30">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span>Vendor Lead Time Warning</span>
                    </div>
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                      Main stage LED wall installation sign-off required 10 days
                      prior. SLA expires in 48 hours.
                    </p>
                  </div>

                  {/* AI Copilot Suggestion Box */}
                  <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs dark:border-indigo-900/40 dark:bg-indigo-950/30">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-800 dark:text-indigo-300">
                      <Bot className="size-3.5 shrink-0" />
                      <span>Planora Copilot Recommendation</span>
                    </div>
                    <p className="mt-1 text-[11px] text-indigo-900/80 dark:text-indigo-300/80">
                      &quot;Adjust catering headcount buffer to +6% based on
                      late registration trends for similar 3-day tech
                      summits.&quot;
                    </p>
                  </div>

                  {/* Simulated Demo Input */}
                  <div className="mt-auto pt-3">
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                      <input
                        type="text"
                        disabled
                        placeholder="Ask Copilot anything... (Phase 5 planned)"
                        className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
                        aria-label="Copilot query input (disabled in demo)"
                      />
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled
                        className="cursor-not-allowed text-slate-400"
                        aria-label="Send query (disabled in demo)"
                      >
                        <Send className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Overview Section */}
        <section
          id="features"
          className="border-b border-slate-200/80 bg-slate-50/60 py-20 sm:py-28 dark:border-slate-800 dark:bg-slate-950"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Core Capabilities
              </span>
              <h2
                id="features-heading"
                className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
              >
                Eight Pillars of Precision Event Orchestration
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                Planora AI blends structured workflow automation with
                context-aware intelligence to give event planners end-to-end
                clarity.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={feature.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700/60"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200 dark:bg-indigo-950/60 dark:text-indigo-400">
                          <IconComponent className="size-5" aria-hidden="true" />
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
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
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400">
                        <span>Pillar {feature.id.toUpperCase()}</span>
                        <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section
          id="workflow"
          className="border-b border-slate-200/80 bg-white py-20 sm:py-24 dark:border-slate-800 dark:bg-slate-900"
          aria-labelledby="workflow-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Methodology
              </span>
              <h2
                id="workflow-heading"
                className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
              >
                How Planora AI Delivers Flawless Events
              </h2>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
                A structured four-stage lifecycle guiding planners from
                initial inspiration to stress-free post-event reconciliation.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.map((step) => (
                <div
                  key={step.step}
                  className="relative rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <span className="text-3xl font-black text-indigo-200 dark:text-indigo-900/60">
                    {step.step}
                  </span>
                  <h3 className="mt-2 text-base font-bold text-slate-950 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Project Status & Architecture Callout */}
        <section
          id="status"
          className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-indigo-50/30 py-16 sm:py-20 dark:border-slate-800 dark:from-slate-950 dark:to-indigo-950/20"
          aria-labelledby="status-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-indigo-200/80 bg-white p-8 shadow-xs sm:p-10 dark:border-indigo-900/50 dark:bg-slate-900">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                    <ShieldCheck className="size-3.5" />
                    <span>Project Roadmap & Architecture Status</span>
                  </div>
                  <h2
                    id="status-heading"
                    className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white"
                  >
                    Phases 1–4 Implemented — Core Planning Live
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Planora AI has completed core planning capabilities: event workspace setup, deterministic blueprint generation with selective review and acceptance, decimal-safe budget management, and dynamic timeline checklists. Conversational AI Copilot (Phase 5), What-If Budget Simulator, Event Risk Radar (Phase 6), and PDF/CSV Export (Phase 7) remain on the planned roadmap.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/50">
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      Phases 1–4 (Active):
                    </span>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      Intelligent Setup, Deterministic Plans, Budgets &amp; Timelines
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/50">
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      Phase 5 (Upcoming):
                    </span>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      Conversational AI Copilot via Groq LLM integration
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                <span>Planora</span>
                <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 text-xs font-black tracking-wider text-white">
                  AI
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Intelligent event orchestration, financial clarity, and risk
                defense.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
              <a
                href="#features"
                className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Features
              </a>
              <a
                href="#preview"
                className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Workspace Preview
              </a>
              <a
                href="#workflow"
                className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Workflow
              </a>
              <a
                href="#status"
                className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Roadmap
              </a>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Lock className="size-3" />
                <span>Protected by design</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-[11px] text-slate-500 sm:flex-row dark:border-slate-800/80 dark:text-slate-400">
            <p>© {currentYear} Planora AI. All rights reserved.</p>
            <p>Phases 1–4 Implemented • Built with Next.js &amp; Base UI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
