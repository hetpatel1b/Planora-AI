"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deleteEventAction } from "@/lib/actions/events";
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
                Delete Event Workspace
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  &ldquo;{eventName}&rdquo;
                </span>
                ? All setup data, constraints, and workspace records for this event will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
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
                <span>Delete Event</span>
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
