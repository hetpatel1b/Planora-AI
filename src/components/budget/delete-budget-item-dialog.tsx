"use client";

import * as React from "react";
import type { BudgetItemRow } from "@/lib/validations/budget";
import { deleteBudgetItemAction } from "@/lib/actions/budget";
import { formatMoney } from "@/lib/currency-utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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

  if (!item) return null;

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

  const formattedEstimated = formatMoney(item.estimated_amount);
  const formattedActual = formatMoney(item.actual_amount);

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isDeleting) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete Budget Item
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  &ldquo;{item.item_name}&rdquo;
                </span>
                ? This expense record will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>

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

        <AlertDialogFooter>
          <AlertDialogCancel
            type="button"
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
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
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
