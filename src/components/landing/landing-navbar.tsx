"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard, ArrowRight } from "lucide-react";
import { LandingHeaderAuth, type LandingUser } from "./landing-header-auth";
import { buttonVariants } from "@/components/ui/button";
import { PlanoraLogo } from "@/components/ui/planora-logo";

interface LandingNavbarProps {
  initialUser: LandingUser | null;
}

export function LandingNavbar({ initialUser }: LandingNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileOpen]);

  const closeMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <>
      {/* Skip to Main Content Link for Keyboard & Screen Reader Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Status Pill */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-950 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg py-1 px-1.5 -ml-1.5"
              aria-label="Planora AI home"
              onClick={closeMenu}
            >
              <PlanoraLogo
                size={38}
                iconClassName="size-[34px] sm:size-[38px] drop-shadow-2xs"
                priority
              />
              <span className="text-lg font-extrabold tracking-tight">Planora</span>
              <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 text-[11px] font-black tracking-wider text-white shadow-2xs">
                AI
              </span>
            </Link>

            <span className="hidden rounded-full border border-violet-200 bg-violet-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 sm:inline-flex items-center gap-1.5 dark:border-violet-900/50 dark:bg-violet-950/50 dark:text-violet-300">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span>Live Platform</span>
            </span>
          </div>

          {/* Desktop Navigation Links (Visible on Large Screens) */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 text-sm font-medium text-slate-600 lg:gap-2 lg:flex dark:text-slate-300"
          >
            {initialUser && (
              <Link
                href="/dashboard"
                className="relative px-3 py-1.5 font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
              >
                Dashboard
              </Link>
            )}
            <a
              href="#features"
              className="relative px-3 py-1.5 transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md group"
            >
              <span>Features</span>
              <span
                className="absolute bottom-0 left-3 right-3 h-0.5 bg-violet-600 dark:bg-violet-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-full origin-left"
                aria-hidden="true"
              />
            </a>
            <a
              href="#preview"
              className="relative px-3 py-1.5 transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md group"
            >
              <span>Workspace Preview</span>
              <span
                className="absolute bottom-0 left-3 right-3 h-0.5 bg-violet-600 dark:bg-violet-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-full origin-left"
                aria-hidden="true"
              />
            </a>
            <a
              href="#workflow"
              className="relative px-3 py-1.5 transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md group"
            >
              <span>Workflow</span>
              <span
                className="absolute bottom-0 left-3 right-3 h-0.5 bg-violet-600 dark:bg-violet-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-full origin-left"
                aria-hidden="true"
              />
            </a>
            <a
              href="#status"
              className="relative px-3 py-1.5 transition-colors hover:text-violet-600 dark:hover:text-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md group"
            >
              <span>Capabilities</span>
              <span
                className="absolute bottom-0 left-3 right-3 h-0.5 bg-violet-600 dark:bg-violet-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 rounded-full origin-left"
                aria-hidden="true"
              />
            </a>
          </nav>

          {/* Desktop Auth Controls & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Auth Buttons (Preserves LandingHeaderAuth test contract) */}
            <div className="hidden sm:block">
              <LandingHeaderAuth initialUser={initialUser} />
            </div>

            {/* Mobile / Tablet Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              aria-controls="mobile-navigation"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Accessible Mobile & Tablet Navigation Panel */}
        {mobileOpen && (
          <div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className="fixed inset-x-0 top-16 z-50 border-b border-slate-200 bg-white/95 px-4 pt-4 pb-6 shadow-xl backdrop-blur-lg lg:hidden dark:border-slate-800 dark:bg-slate-950/95 transition-all duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="flex flex-col space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
                Navigation
              </span>

              {initialUser && (
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/50"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="size-4" aria-hidden="true" />
                    <span>Go to Dashboard</span>
                  </span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}

              <a
                href="#features"
                onClick={closeMenu}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Features</span>
                <span className="text-xs text-slate-400">8 Pillars</span>
              </a>

              <a
                href="#preview"
                onClick={closeMenu}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Workspace Preview</span>
                <span className="text-xs text-slate-400">Interactive Demo</span>
              </a>

              <a
                href="#workflow"
                onClick={closeMenu}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Workflow</span>
                <span className="text-xs text-slate-400">4 Stages</span>
              </a>

              <a
                href="#status"
                onClick={closeMenu}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Capabilities & Roadmap</span>
                <span className="text-xs text-slate-400">Architecture</span>
              </a>

              <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-2">
                  Account
                </span>
                <div className="sm:hidden px-1">
                  <LandingHeaderAuth initialUser={initialUser} />
                </div>
                {initialUser ? (
                  <Link
                    href="/dashboard/events/new"
                    onClick={closeMenu}
                    className={buttonVariants({
                      variant: "default",
                      className:
                        "w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium justify-center shadow-xs",
                    })}
                  >
                    <span>Create New Event</span>
                    <ArrowRight className="size-4 ml-1" />
                  </Link>
                ) : (
                  <a
                    href="#preview"
                    onClick={closeMenu}
                    className={buttonVariants({
                      variant: "default",
                      className:
                        "w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium justify-center shadow-xs",
                    })}
                  >
                    <span>Start Planning Preview</span>
                    <ArrowRight className="size-4 ml-1" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
