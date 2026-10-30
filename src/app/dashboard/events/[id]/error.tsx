"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";

interface EventDetailErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Client error boundary for individual event workspace routes (/dashboard/events/[id]).
 * Isolates workspace failures and provides safe user recovery options.
 */
export default function EventDetailError({ error, reset }: EventDetailErrorProps) {
  React.useEffect(() => {
    // Redacted safe error logging for observability
    console.error("[EventDetailError] Workspace error caught:", error.message || "Unknown event workspace error");
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-xl text-center space-y-4 dark:border-rose-900/60 dark:bg-slate-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            Workspace Error
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            We were unable to render this event workspace. This might be due to a temporary network issue or an incomplete event record.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={reset}
            className="w-full sm:w-auto gap-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span>Retry Workspace</span>
          </Button>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto gap-2"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>Return to Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

