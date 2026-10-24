"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deleteEventAction } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteEventDialogProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  redirectToDashboard?: boolean;
}

export function DeleteEventDialog({
  eventId,
  eventName,
  isOpen,
  onClose,
  onDeleted,
  redirectToDashboard = false,
}: DeleteEventDialogProps) {
  const router = useRouter();
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

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteEventAction(eventId);
      if (!result.success) {
        setError(result.error || "Failed to delete event.");
        setIsDeleting(false);
        return;
      }

      onClose();
      if (onDeleted) {
        onDeleted();
      }
      if (redirectToDashboard) {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred while deleting the event.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3
              id="delete-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Delete Event Workspace
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                &ldquo;{eventName}&rdquo;
              </span>
              ? All setup data, constraints, and workspace records for this event will be permanently removed.
            </p>
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
                <span>Delete Event</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
