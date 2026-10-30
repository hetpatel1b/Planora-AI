"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Layers,
  ListTodo,
  ClipboardCheck,
  IndianRupee,
  ShieldAlert,
} from "lucide-react";

export interface WorkspaceNavProps {
  taskCount: number;
  vendorCount?: number;
  totalRisks: number;
  hasHighRisks: boolean;
  hasActivePlan: boolean;
  activeSection: string;
  onNavigate?: (sectionId: string) => void;
}

export function WorkspaceNav({
  taskCount,
  vendorCount = 0,
  totalRisks,
  hasHighRisks,
  hasActivePlan,
  activeSection,
  onNavigate,
}: WorkspaceNavProps) {
  const navItems = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "plan",
      label: "Plan Blueprint",
      icon: Layers,
      badge: hasActivePlan ? "Active" : null,
      badgeVariant: "default" as const,
    },
    {
      id: "timeline",
      label: "Timeline & Checklist",
      icon: ListTodo,
      badge: `${taskCount}`,
      badgeVariant: "default" as const,
    },
    {
      id: "vendor-checklist",
      label: "Vendor Checklist",
      icon: ClipboardCheck,
      badge: typeof vendorCount === "number" && vendorCount > 0 ? `${vendorCount}` : null,
      badgeVariant: "default" as const,
    },
    {
      id: "budget",
      label: "Budget Manager",
      icon: IndianRupee,
      badge: null,
    },
    {
      id: "risks",
      label: "Risk Radar",
      icon: ShieldAlert,
      badge: totalRisks > 0 ? `${totalRisks}` : null,
      badgeVariant: hasHighRisks ? ("destructive" as const) : ("default" as const),
    },
  ];

  const handleScrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(id);
    }
    const targetElementId = id === "vendor-checklist" ? "timeline" : id;
    const element = document.getElementById(targetElementId);
    if (element) {
      const isReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({
        behavior: isReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  return (
    <nav
      aria-label="Workspace Sections Navigation"
      className="sticky top-16 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 shadow-2xs"
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2.5 no-scrollbar scroll-smooth touch-pan-x pr-4 sm:pr-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleScrollTo(item.id, e)}
                aria-current={isActive ? "location" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer ${
                  isActive
                    ? "bg-violet-50 text-violet-700 shadow-2xs dark:bg-violet-950/70 dark:text-violet-300"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`size-3.5 shrink-0 ${
                    isActive
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-slate-500 group-hover:text-slate-600 dark:text-slate-400"
                  }`}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      item.badgeVariant === "destructive"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : isActive
                        ? "bg-violet-200/80 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

