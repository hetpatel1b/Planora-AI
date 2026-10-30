"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency-utils";
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";

export interface ScenarioDiffSummary {
  hasTargetBudgetChange: boolean;
  oldTargetBudget: number;
  newTargetBudget: number;
  totalChangesCount: number;
  modified: Array<{ name: string; oldVal: number; newVal: number; delta: number }>;
  added: Array<{ name: string; category: string; amount: number }>;
  deleted: Array<{ name: string; amount: number }>;
}

export interface WhatIfReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isApplying: boolean;
  applyError: string | null;
  applySuccess: string | null;
  itemDiff: ScenarioDiffSummary;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Review and confirmation modal for applying a What-If Budget Scenario to the live ledger.
 * Manages modal accessibility, accessible focus trapping, keyboard Escape dismissal, and change diff review.
 */
export function WhatIfReviewModal({
  isOpen,
  onClose,
  onConfirm,
  isApplying,
  applyError,
  applySuccess,
  itemDiff,
  triggerRef,
}: WhatIfReviewModalProps) {
  const modalRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    // Remember the element that had focus before the modal opened
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const triggerEl = triggerRef?.current;

    // Focus first interactive element inside modal
    const modalEl = modalRef.current;
    if (modalEl) {
      const focusable = modalEl.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    // Lock body scrolling while modal dialog is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        // If focus accidentally drifted outside modal, redirect into trap
        if (!modalRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
          return;
        }

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to invoking element
      if (triggerEl) {
        triggerEl.focus();
      } else if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isApplying) {
      onClose();
    }
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-apply-title"
      aria-describedby="confirm-apply-description"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3
            id="confirm-apply-title"
            className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2"
          >
            <FileSpreadsheet className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Confirm Budget Scenario Application</span>
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onClose();
              triggerRef?.current?.focus();
            }}
            aria-label="Close scenario review"
            className="size-7 p-0"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close scenario review</span>
          </Button>
        </div>

        <p id="confirm-apply-description" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Applying this scenario will permanently update your saved budget items. All calculations are re-validated server-side.
        </p>

        {/* Itemized Diff Summary */}
        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-950/40">
          {itemDiff.hasTargetBudgetChange && (
            <div className="flex items-center justify-between font-mono pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-sans font-semibold text-slate-700 dark:text-slate-300">
                Target Budget Ceiling:
              </span>
              <span>
                {formatMoney(itemDiff.oldTargetBudget)} &rarr; {formatMoney(itemDiff.newTargetBudget)}
              </span>
            </div>
          )}

          {itemDiff.modified.map((m) => (
            <div key={m.name} className="flex items-center justify-between">
              <span className="truncate pr-2 font-medium text-slate-700 dark:text-slate-300">
                {m.name}
              </span>
              <span className="font-mono shrink-0">
                {formatMoney(m.oldVal)} &rarr; {formatMoney(m.newVal)} ({m.delta > 0 ? "+" : ""}{formatMoney(m.delta)})
              </span>
            </div>
          ))}

          {itemDiff.added.map((a) => (
            <div key={a.name} className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-medium">
              <span className="truncate pr-2">+ {a.name} ({a.category})</span>
              <span className="font-mono shrink-0">{formatMoney(a.amount)}</span>
            </div>
          ))}

          {itemDiff.deleted.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-rose-700 dark:text-rose-300 line-through">
              <span className="truncate pr-2">- {d.name}</span>
              <span className="font-mono shrink-0">{formatMoney(d.amount)}</span>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {applyError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200 flex items-start gap-2"
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
            <p>{applyError}</p>
          </div>
        )}

        {/* Success Message */}
        {applySuccess && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 flex items-start gap-2"
          >
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
            <p>{applySuccess}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              triggerRef?.current?.focus();
            }}
            disabled={isApplying}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isApplying}
            className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs"
          >
            {isApplying ? "Persisting Scenario..." : "Confirm & Persist to Saved Budget"}
          </Button>
        </div>
      </div>
    </div>
  );
}

