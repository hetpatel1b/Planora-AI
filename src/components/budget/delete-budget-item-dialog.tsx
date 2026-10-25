"use client";

import * as React from "react";
import type { BudgetItemRow } from "@/lib/validations/budget";
import { deleteBudgetItemAction } from "@/lib/actions/budget";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteBudgetItemDialogProps {
  eventId: string;
  item: BudgetItemRow | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (itemId: string) => void;
}

export function DeleteBudgetItemDialog({
  eventId,
  item,
  isOpen,
  onClose,
  onDeleted,
}: DeleteBudgetItemDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !item) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteBudgetItemAction(item.id, eventId);
      if (!result.success) {
        setError(result.error || "Failed to delete budget item.");
        setIsDeleting(false);
        return;
      }

      onDeleted(item.id);
      onClose();
    } catch {
      setError("An unexpected error occurred while deleting the budget item.");
      setIsDeleting(false);
    }
  };

  const formattedEstimated = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(item.estimated_amount);

  const formattedActual = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(item.actual_amount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-budget-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="delete-budget-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Delete Budget Item
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                &ldquo;{item.item_name}&rdquo;
              </span>
              ? This expense record will be permanently removed.
            </p>

            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Category:</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {item.category}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between text-slate-600 dark:text-slate-400">
                <span>Estimated:</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {formattedEstimated}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between text-slate-600 dark:text-slate-400">
                <span>Actual:</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {formattedActual}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
            className="gap-1.5 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Delete Item</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
