"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { triggerCsvDownload } from "@/lib/download-csv";
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  ChevronDown,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export interface ExportMenuProps {
  eventId: string;
  eventName: string;
  className?: string;
}

export function ExportMenu({ eventId, eventName, className }: ExportMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isDownloadingTasks, setIsDownloadingTasks] = React.useState(false);
  const [isDownloadingBudget, setIsDownloadingBudget] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key, with focus restoration
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setErrorMessage(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setErrorMessage(null);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Set focus to the first interactive menu item when opened via keyboard/click
  React.useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const firstItem = dropdownRef.current.querySelector<HTMLElement>(
        'a[role="menuitem"], button[role="menuitem"]:not([disabled])'
      );
      firstItem?.focus();
    }
  }, [isOpen]);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!dropdownRef.current) return;

    const items = Array.from(
      dropdownRef.current.querySelectorAll<HTMLElement>(
        'a[role="menuitem"], button[role="menuitem"]:not([disabled])'
      )
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex === -1 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setErrorMessage(null);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      // Natural Tab key closes the menu and allows normal tab progression
      setIsOpen(false);
      setErrorMessage(null);
    }
  };

  const handleDownloadTasks = async () => {
    if (isDownloadingTasks) return;
    setIsDownloadingTasks(true);
    setErrorMessage(null);

    const fallback = `planora-${eventId}-tasks.csv`;
    const result = await triggerCsvDownload(
      `/api/events/${eventId}/export/tasks`,
      fallback
    );

    setIsDownloadingTasks(false);
    if (!result.success) {
      setErrorMessage(result.error || "Failed to download tasks CSV.");
    } else {
      setIsOpen(false);
    }
  };

  const handleDownloadBudget = async () => {
    if (isDownloadingBudget) return;
    setIsDownloadingBudget(true);
    setErrorMessage(null);

    const fallback = `planora-${eventId}-budget.csv`;
    const result = await triggerCsvDownload(
      `/api/events/${eventId}/export/budget`,
      fallback
    );

    setIsDownloadingBudget(false);
    if (!result.success) {
      setErrorMessage(result.error || "Failed to download budget CSV.");
    } else {
      setIsOpen(false);
    }
  };

  const isDownloadingAny = isDownloadingTasks || isDownloadingBudget;

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className ?? ""}`}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        id="export-menu-trigger"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "export-menu-dropdown" : undefined}
        aria-label={`Export options for ${eventName}`}
        onClick={() => {
          setIsOpen(!isOpen);
          setErrorMessage(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (!isOpen) {
              e.preventDefault();
              setIsOpen(true);
              setErrorMessage(null);
            }
          }
        }}
        className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
      >
        <FileDown className="size-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>Export</span>
        <ChevronDown
          className={`size-3 text-slate-500 dark:text-slate-400 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          id="export-menu-dropdown"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="export-menu-trigger"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-50 mt-1.5 w-60 sm:w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:ring-white/10"
        >
          {errorMessage && (
            <div
              role="alert"
              className="mb-1.5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <p className="leading-tight">{errorMessage}</p>
            </div>
          )}

          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Export Options
          </div>

          {/* 1. Export Plan as PDF */}
          <Link
            href={`/dashboard/events/${eventId}/export/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            id="export-pdf-action"
            tabIndex={-1}
            onClick={() => {
              setIsOpen(false);
              triggerRef.current?.focus();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus:bg-slate-100 focus:text-slate-950 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white dark:focus:bg-slate-900 dark:focus:text-white"
          >
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <div>
                <p className="font-semibold">Event Dossier (PDF)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Print-ready brief with all sections
                </p>
              </div>
            </div>
            <span className="inline-flex items-center">
              <ExternalLink className="size-3 text-slate-400" aria-hidden="true" />
              <span className="sr-only"> (opens in new tab)</span>
            </span>
          </Link>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          {/* 2. Download Tasks as CSV */}
          <button
            type="button"
            role="menuitem"
            id="export-tasks-csv-action"
            tabIndex={-1}
            disabled={isDownloadingAny}
            onClick={handleDownloadTasks}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus:bg-slate-100 focus:text-slate-950 focus:outline-none disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white dark:focus:bg-slate-900 dark:focus:text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {isDownloadingTasks ? (
                <Loader2 className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <div>
                <p className="font-semibold">Checklist Tasks (CSV)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Full milestone &amp; checklist ledger
                </p>
              </div>
            </div>
            {isDownloadingTasks && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                Exporting...
              </span>
            )}
          </button>

          {/* 3. Download Budget as CSV */}
          <button
            type="button"
            role="menuitem"
            id="export-budget-csv-action"
            tabIndex={-1}
            disabled={isDownloadingAny}
            onClick={handleDownloadBudget}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus:bg-slate-100 focus:text-slate-950 focus:outline-none disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white dark:focus:bg-slate-900 dark:focus:text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {isDownloadingBudget ? (
                <Loader2 className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              ) : (
                <FileSpreadsheet className="size-4 text-indigo-600 dark:text-indigo-400" />
              )}
              <div>
                <p className="font-semibold">Budget Ledger (CSV)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Itemized expenses &amp; variances
                </p>
              </div>
            </div>
            {isDownloadingBudget && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                Exporting...
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
