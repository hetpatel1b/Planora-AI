"use client";

import * as React from "react";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskRow,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validations/task";
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import { toDateInputValue, dateInputToIsoString } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Loader2, X, Plus, Edit2, CheckSquare } from "lucide-react";

interface TaskDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: TaskRow) => void;
  task?: TaskRow | null;
  initialIsVendor?: boolean;
}

export function TaskDialog({
  eventId,
  isOpen,
  onClose,
  onSuccess,
  task,
  initialIsVendor = false,
}: TaskDialogProps) {
  if (!isOpen) return null;

  return (
    <TaskDialogModal
      key={task ? `edit-${task.id}` : `create-task-${initialIsVendor ? "vendor" : "general"}`}
      eventId={eventId}
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      task={task}
      initialIsVendor={initialIsVendor}
    />
  );
}

function TaskDialogModal({
  eventId,
  isOpen,
  onClose,
  onSuccess,
  task,
  initialIsVendor = false,
}: TaskDialogProps) {
  const isEditing = Boolean(task);

  const [title, setTitle] = React.useState(task?.title || "");
  const [description, setDescription] = React.useState(task?.description || "");
  const [dueDateInput, setDueDateInput] = React.useState(
    task?.due_date ? toDateInputValue(task.due_date) : ""
  );
  const [priority, setPriority] = React.useState<TaskPriority>(
    task?.priority || "medium"
  );
  const [status, setStatus] = React.useState<TaskStatus>(
    task?.status || "pending"
  );
  const [isVendorChecklist, setIsVendorChecklist] = React.useState(
    task ? task.is_vendor_checklist : initialIsVendor
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const isoDueDate = dateInputToIsoString(dueDateInput);

    try {
      if (isEditing && task) {
        const result = await updateTaskAction(task.id, eventId, {
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          due_date: isoDueDate,
          priority,
          status,
          is_vendor_checklist: isVendorChecklist,
        });

        if (!result.success) {
          setError(result.error || "Failed to update task.");
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          setIsSubmitting(false);
          return;
        }

        onSuccess(result.data);
      } else {
        const result = await createTaskAction(eventId, {
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          due_date: isoDueDate,
          priority,
          status,
          is_vendor_checklist: isVendorChecklist,
        });

        if (!result.success) {
          setError(result.error || "Failed to create task.");
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          setIsSubmitting(false);
          return;
        }

        onSuccess(result.data);
      }

      onClose();
    } catch {
      setError("An unexpected error occurred while saving the task.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              {isEditing ? <Edit2 className="size-4" /> : <Plus className="size-4" />}
            </div>
            <DialogHeader className="gap-0.5">
              <DialogTitle>
                {isEditing ? "Edit Checklist Task" : "Add Checklist Task"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update details, timeline date, and status"
                  : "Create a new timeline milestone or checklist item"}
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogClose
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            aria-label="Close dialog"
          >
            <X className="size-4" />
            <span className="sr-only">Close dialog</span>
          </DialogClose>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs font-semibold">
              Task Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="task-title"
              type="text"
              required
              maxLength={200}
              placeholder="e.g., Finalize catering menu and bar contract"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="text-xs"
              aria-invalid={!!fieldErrors.title}
              aria-describedby={fieldErrors.title ? "task-title-error" : undefined}
            />
            {fieldErrors.title && (
              <p id="task-title-error" className="text-[11px] text-rose-600 dark:text-rose-400">
                {fieldErrors.title[0]}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-description" className="text-xs font-semibold">
              Description / Notes (Optional)
            </Label>
            <Textarea
              id="task-description"
              rows={3}
              maxLength={2000}
              placeholder="Add logistical details, vendor contacts, or specific requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="text-xs"
              aria-invalid={!!fieldErrors.description}
              aria-describedby={fieldErrors.description ? "task-description-error" : undefined}
            />
            {fieldErrors.description && (
              <p id="task-description-error" className="text-[11px] text-rose-600 dark:text-rose-400">
                {fieldErrors.description[0]}
              </p>
            )}
          </div>

          {/* Due Date & Priority Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="task-due-date" className="text-xs font-semibold">
                Due Date (Optional)
              </Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDateInput}
                onChange={(e) => setDueDateInput(e.target.value)}
                disabled={isSubmitting}
                className="text-xs"
                aria-invalid={!!fieldErrors.due_date}
                aria-describedby={fieldErrors.due_date ? "task-due-date-error" : undefined}
              />
              {fieldErrors.due_date && (
                <p id="task-due-date-error" className="text-[11px] text-rose-600 dark:text-rose-400">
                  {fieldErrors.due_date[0]}
                </p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label htmlFor="task-priority" className="text-xs font-semibold">
                Priority
              </Label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={isSubmitting}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)} Priority
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Vendor Checklist Flag Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="task-status" className="text-xs font-semibold">
                Status
              </Label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={isSubmitting}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "in_progress"
                      ? "In Progress"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor Checklist Flag */}
            <div className="flex items-center gap-2 pt-6">
              <input
                id="task-vendor-checklist"
                type="checkbox"
                checked={isVendorChecklist}
                onChange={(e) => setIsVendorChecklist(e.target.checked)}
                disabled={isSubmitting}
                className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <Label
                htmlFor="task-vendor-checklist"
                className="cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Vendor Checklist Item
              </Label>
            </div>
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim()}
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                <>
                  <CheckSquare className="size-3.5" />
                  <span>Update Task</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>Add Task</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
