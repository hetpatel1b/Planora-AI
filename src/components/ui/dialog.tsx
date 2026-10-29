"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function resolveClassName<T>(
  defaultClasses: string,
  className?: string | ((state: T) => string | undefined)
) {
  if (typeof className === "function") {
    return (state: T) => cn(defaultClasses, className(state));
  }
  return cn(defaultClasses, className);
}

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={resolveClassName(
        "fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function DialogViewport({
  className,
  ...props
}: DialogPrimitive.Viewport.Props) {
  return (
    <DialogPrimitive.Viewport
      data-slot="dialog-viewport"
      className={resolveClassName(
        "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto",
        className
      )}
      {...props}
    />
  );
}

export interface DialogContentProps extends DialogPrimitive.Popup.Props {
  showCloseButton?: boolean;
  container?: HTMLElement | ShadowRoot | React.RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  container,
  keepMounted,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal container={container} keepMounted={keepMounted}>
      <DialogBackdrop />
      <DialogViewport>
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={resolveClassName(
            "relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 focus-visible:outline-none",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              aria-label="Close"
              className="absolute top-4 right-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogViewport>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={resolveClassName(
        "text-base font-bold text-slate-900 dark:text-white",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={resolveClassName(
        "text-xs leading-relaxed text-slate-500 dark:text-slate-400",
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogViewport,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
