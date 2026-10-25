"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

function resolveClassName<T>(
  defaultClasses: string,
  className?: string | ((state: T) => string | undefined)
) {
  if (typeof className === "function") {
    return (state: T) => cn(defaultClasses, className(state));
  }
  return cn(defaultClasses, className);
}

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogClose = AlertDialogPrimitive.Close;

function AlertDialogBackdrop({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-backdrop"
      className={resolveClassName(
        "fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogViewport({
  className,
  ...props
}: AlertDialogPrimitive.Viewport.Props) {
  return (
    <AlertDialogPrimitive.Viewport
      data-slot="alert-dialog-viewport"
      className={resolveClassName(
        "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto",
        className
      )}
      {...props}
    />
  );
}

export interface AlertDialogContentProps extends AlertDialogPrimitive.Popup.Props {
  container?: HTMLElement | ShadowRoot | React.RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

function AlertDialogContent({
  className,
  children,
  container,
  keepMounted,
  ...props
}: AlertDialogContentProps) {
  return (
    <AlertDialogPortal container={container} keepMounted={keepMounted}>
      <AlertDialogBackdrop />
      <AlertDialogViewport>
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          className={resolveClassName(
            "relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 focus-visible:outline-none",
            className
          )}
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Popup>
      </AlertDialogViewport>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={resolveClassName(
        "text-base font-bold text-slate-900 dark:text-white",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={resolveClassName(
        "text-xs leading-relaxed text-slate-600 dark:text-slate-400",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "sm",
  ...props
}: AlertDialogPrimitive.Close.Props & VariantProps<typeof buttonVariants>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={
        typeof className === "function"
          ? (state) => cn(buttonVariants({ variant, size }), className(state))
          : cn(buttonVariants({ variant, size }), className)
      }
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  variant = "destructive",
  size = "sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-action"
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogBackdrop,
  AlertDialogViewport,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogClose,
};
