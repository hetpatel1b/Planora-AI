"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bot,
  Send,
  FileDown,
  Sliders,
  IndianRupee,
  TrendingDown,
  Info,
} from "lucide-react";

export function WorkspacePreview() {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    task1: true,
    task2: false,
    task3: false,
  });

  const [copilotInput, setCopilotInput] = useState("");
  const [activeCopilotAnswer, setActiveCopilotAnswer] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const samplePrompts = [
    {
      label: "Check AV contract SLA",
      query: "What is the lead time deadline for the main stage LED wall?",
      response:
        "The vendor SLA requires stage LED sign-off 10 days prior (Oct 14). With the summit starting Oct 24, approval is required within 48 hours to avoid express freight surcharges.",
    },
    {
      label: "Analyze catering buffer",
      query: "Should we adjust our catering headcount for the summit?",
      response:
        "Registration velocity indicates 450 confirmed with 25 pending. Adding a +6% buffer (₹534 estimated) provides safe margin without exceeding your ₹85k budget cap.",
    },
    {
      label: "Summarize budget variance",
      query: "Give me an executive variance summary of Apex Horizon 2026.",
      response:
        "Total commitments are ₹58,400 against the ₹85,000 cap (₹26,600 buffer, 68.7% utilized). Venue is locked at 41%, AV at 17%, and catering at 10%.",
    },
  ];

  const handlePromptSelect = (prompt: (typeof samplePrompts)[0]) => {
    setCopilotInput(prompt.query);
    setActiveCopilotAnswer(prompt.response);
  };

  const handleCopilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    // Check if query matches sample prompt or provide a helpful illustrative reply
    const matched = samplePrompts.find((p) =>
      copilotInput.toLowerCase().includes(p.label.toLowerCase().slice(0, 5))
    );

    if (matched) {
      setActiveCopilotAnswer(matched.response);
    } else {
      setActiveCopilotAnswer(
        `Planora AI Copilot analyzes your live event parameters: "${copilotInput.trim()}". In active project workspaces, responses are synthesized with your real budget allocations, vendor milestones, and task checklists.`
      );
    }
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const totalTasks = 18;
  const initialDone = 14;
  const dynamicDone =
    initialDone +
    (completedTasks.task2 ? 1 : 0) +
    (completedTasks.task3 ? 1 : 0) -
    (!completedTasks.task1 ? 1 : 0);
  const completionPercentage = Math.round((dynamicDone / totalTasks) * 100);

  return (
    <div className="relative">
      {/* Top Controls Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-xs font-semibold text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
            <span className="flex size-2 rounded-full bg-violet-600 animate-pulse" aria-hidden="true" />
            <span>Interactive Workspace Preview</span>
            <span className="text-violet-400">•</span>
            <span>Illustrative Sample Data</span>
          </div>
          <h2
            id="preview-heading"
            className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-white"
          >
            Interactive Event Workspace Preview
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl sm:text-base dark:text-slate-400">
            Explore how Planora AI unifies financial variance tracking, milestone dependencies, and conversational copilot intelligence in live event projects.
          </p>
        </div>

        {/* Demo Action Buttons with Clear Status Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDemoNotice(
                "Illustrative demo control. In active workspaces, one-click export generates formatted browser-native PDF print sheets and itemized CSV manifests."
              );
              setTimeout(() => setDemoNotice(null), 5000);
            }}
            className="text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-colors"
            aria-label="Export Run of Show preview demo"
          >
            <FileDown className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
            <span>Export Run of Show</span>
            <span className="ml-1 rounded-sm bg-slate-100 px-1 py-0.2 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
              Demo
            </span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              setDemoNotice(
                "Illustrative demo control. In active workspaces, What-If Simulator lets you model attendee and line-item variances before committing funds."
              );
              setTimeout(() => setDemoNotice(null), 5000);
            }}
            className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-xs"
            aria-label="Simulate Scenarios preview demo"
          >
            <Sliders className="size-3.5" aria-hidden="true" />
            <span>Simulate Scenarios</span>
            <span className="ml-1 rounded-sm bg-violet-800/60 px-1 py-0.2 text-[10px] font-semibold text-white">
              Demo
            </span>
          </Button>
        </div>
      </div>

      {/* Demo Notice Alert Banner (shows briefly when demo buttons are clicked) */}
      {demoNotice && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2.5 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-900 shadow-xs dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-200 animate-in fade-in duration-200"
        >
          <Info className="size-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          <p className="flex-1">{demoNotice}</p>
          <button
            type="button"
            onClick={() => setDemoNotice(null)}
            className="text-xs font-semibold underline hover:no-underline text-violet-700 dark:text-violet-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Event Header Showcase Card */}
      <div className="mt-8 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/70 to-slate-50/40 p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-950/80 dark:text-violet-300">
                Corporate Conference
              </span>
              <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                <span>Status: On Track • {completionPercentage}% Prepared</span>
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Workspace ID: #APX-2026
              </span>
            </div>
            <h3 className="mt-2.5 text-xl font-extrabold text-slate-950 sm:text-2xl dark:text-white">
              Apex Horizon Tech Summit 2026
            </h3>
            <p className="text-xs text-slate-600 sm:text-sm dark:text-slate-400 mt-0.5">
              Annual flagship engineering summit and partner ecosystem showcase
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-medium text-slate-600 sm:text-sm dark:text-slate-400">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700">
              <Calendar className="size-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
              <span>Oct 24–26, 2026</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700">
              <MapPin className="size-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
              <span>Moscone West, San Francisco</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700">
              <Users className="size-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
              <span>450 Confirmed Attendees</span>
            </div>
          </div>
        </div>

        {/* Modules Grid: 1 col on mobile, 2 col on tablet (with module 3 spanning), 3 col on desktop */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Module 1: Smart Budget Manager */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-violet-700/60 transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <IndianRupee className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                  <span>Smart Budget Manager</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/40">
                  <TrendingDown className="size-3" aria-hidden="true" />
                  <span>Under Target</span>
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                    ₹58,400
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {" "}committed
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                    Budget Cap:
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-200">
                    ₹85,000
                  </span>
                </div>
              </div>

              {/* Progress / Utilization Bar */}
              <div className="mt-4">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-500"
                    style={{ width: "68.7%" }}
                    role="progressbar"
                    aria-valuenow={68.7}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Budget consumption: 68.7 percent"
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ₹26,600 buffer remaining
                  </span>
                  <span>68.7% utilized</span>
                </div>
              </div>

              {/* Categorized Breakdown Lines */}
              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3.5 text-xs dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-violet-600" aria-hidden="true" />
                    <span>Venue & Facilities</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    ₹35,000 <span className="font-normal text-slate-500">(41%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-indigo-500" aria-hidden="true" />
                    <span>Audiovisual & Production</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    ₹14,500 <span className="font-normal text-slate-500">(17%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-purple-400" aria-hidden="true" />
                    <span>Catering & Hospitality</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    ₹8,900 <span className="font-normal text-slate-500">(10%)</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Variance Health: Positive</span>
              <span className="font-medium text-violet-600 dark:text-violet-400">
                Zero Overages
              </span>
            </div>
          </div>

          {/* Module 2: Dynamic Timeline & Checklist */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-violet-700/60 transition-all duration-200">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Clock className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                  <span>Dynamic Timeline</span>
                </span>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900/40">
                  T-4 Days to Dry Run
                </span>
              </div>

              {/* Interactive checklist item list */}
              <div className="mt-4 space-y-3">
                {/* Task 1 */}
                <div
                  onClick={() => toggleTask("task1")}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleTask("task1");
                    }
                  }}
                  aria-label="Toggle task 1 completion in demo"
                >
                  <CheckCircle2
                    className={`mt-0.5 size-4 shrink-0 transition-colors ${
                      completedTasks.task1
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        completedTasks.task1
                          ? "text-slate-500 line-through decoration-slate-400 dark:text-slate-400"
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      Finalize Keynote Speaker Contracts
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Completed Oct 12 • 4 of 4 Signed
                    </p>
                  </div>
                </div>

                {/* Task 2 */}
                <div
                  onClick={() => toggleTask("task2")}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleTask("task2");
                    }
                  }}
                  aria-label="Toggle task 2 completion in demo"
                >
                  <CheckCircle2
                    className={`mt-0.5 size-4 shrink-0 transition-colors ${
                      completedTasks.task2
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        completedTasks.task2
                          ? "text-slate-500 line-through decoration-slate-400 dark:text-slate-400"
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      AV Production & Live Stream Dry Run
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Due in 3 days • Pending Tech Spec
                    </p>
                  </div>
                </div>

                {/* Task 3 */}
                <div
                  onClick={() => toggleTask("task3")}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleTask("task3");
                    }
                  }}
                  aria-label="Toggle task 3 completion in demo"
                >
                  <Calendar
                    className={`mt-0.5 size-4 shrink-0 transition-colors ${
                      completedTasks.task3
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        completedTasks.task3
                          ? "text-slate-500 line-through decoration-slate-400 dark:text-slate-400"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      Attendee Badge & Swag Delivery
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Scheduled for Oct 22 • Vendor En Route
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {dynamicDone} of {totalTasks} tasks complete
                </span>
                <span className="font-semibold text-violet-700 dark:text-violet-400">
                  {completionPercentage}% complete
                </span>
              </div>
            </div>
          </div>

          {/* Module 3: Event Risk Radar & Copilot (Spans 2 cols on tablet, 1 col on desktop) */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-violet-700/60 transition-all duration-200 md:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Bot className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                  <span>Risk Radar & Copilot</span>
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/40">
                  1 Low Advisory
                </span>
              </div>

              {/* Advisory Callout Box */}
              <div className="mt-3.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>Vendor Lead Time Warning</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-400">
                  Main stage LED wall installation sign-off required 10 days prior. Vendor SLA expires in 48 hours.
                </p>
              </div>

              {/* AI Copilot Suggestion Box */}
              <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-xs dark:border-violet-900/40 dark:bg-violet-950/30">
                <div className="flex items-center gap-1.5 font-bold text-violet-900 dark:text-violet-300">
                  <Bot className="size-3.5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                  <span>Planora Copilot Recommendation</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-violet-900/90 dark:text-violet-200/90 italic">
                  &quot;Adjust catering buffer to +6% based on late registration trends for similar 3-day tech summits.&quot;
                </p>
              </div>

              {/* Simulated Answer if active */}
              {activeCopilotAnswer && (
                <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    <span>Copilot Response (Demo)</span>
                    <button
                      type="button"
                      onClick={() => setActiveCopilotAnswer(null)}
                      className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-950 dark:text-indigo-100">
                    {activeCopilotAnswer}
                  </p>
                </div>
              )}

              {/* Sample Query Prompt Chips */}
              <div className="mt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Try sample prompt:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePromptSelect(p)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-violet-700 dark:hover:bg-violet-950/50 dark:hover:text-violet-300"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Demo Query Input */}
            <form onSubmit={handleCopilotSubmit} className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 dark:border-slate-700 dark:bg-slate-800 transition-all">
                <input
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  placeholder="Ask Copilot about this event... (Interactive Demo)"
                  className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                  aria-label="Copilot query input (interactive demo)"
                />
                <Button
                  type="submit"
                  size="icon-xs"
                  variant="ghost"
                  disabled={!copilotInput.trim()}
                  className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-200 disabled:opacity-40"
                  aria-label="Send query in demo"
                >
                  <Send className="size-3" aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 text-center">
                Interactive preview • Live Copilot powered by Groq LLM in active projects
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

