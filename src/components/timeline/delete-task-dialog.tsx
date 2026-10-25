"use client";

import * as React from "react";
import type { TaskRow } from "@/lib/validations/task";
import { deleteTaskAction } from "@/lib/actions/tasks";
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

interface DeleteTaskDialogProps {
  eventId: string;
  task: TaskRow | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (taskId: string) => void;
}

export function DeleteTaskDialog({
  eventId,
  task,
  isOpen,
  onClose,
  onDeleted,
}: DeleteTaskDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!task) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteTaskAction(task.id, eventId);
      if (!result.success) {
        setError(result.error || "Failed to delete task.");
        setIsDeleting(false);
        return;
      }

      onDeleted(task.id);
      onClose();
    } catch {
      setError("An unexpected error occurred while deleting the task.");
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
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <AlertTriangle className="size-5" />
          </div>

          <div className="flex-1 space-y-1">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete Task
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently remove this task?
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/50">
          <p className="font-semibold text-slate-900 dark:text-white truncate">
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-slate-500 dark:text-slate-400">
              {task.description}
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
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
            className="gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Delete Task</span>
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
