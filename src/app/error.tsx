"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root-level App Router client error boundary.
 * Captures unexpected top-level rendering exceptions and provides clean recovery.
 */
export default function RootError({ error, reset }: RootErrorProps) {
  React.useEffect(() => {
    // Redacted safe error logging for observability
    console.error("[RootError] Global error caught:", error.message || "Unknown error");
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-xl text-center space-y-4 dark:border-amber-900/60 dark:bg-slate-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-950 dark:text-white">
            Something Went Wrong
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            An unexpected error occurred while loading this page. Please try refreshing or return to the homepage.
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
            <span>Try Again</span>
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto gap-2"
            >
              <Home className="size-3.5" aria-hidden="true" />
              <span>Return Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

