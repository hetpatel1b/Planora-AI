"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WidgetErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  fallbackMessage?: string;
}

export interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Component-level error boundary for isolating widget and section failures.
 * Prevents localized client rendering exceptions from crashing the parent workspace or dashboard.
 */
export class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Redacted safe error logging for observability
    console.error("[WidgetErrorBoundary] Localized widget error caught:", error.message, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 text-center dark:border-rose-900/60 dark:bg-rose-950/40 space-y-3"
        >
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">
              {this.props.title || "Section Temporarily Unavailable"}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {this.props.fallbackMessage ||
                "This workspace section encountered an unexpected rendering error. Other features remain operational."}
            </p>
          </div>
          <div className="pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={this.handleReset}
              className="gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>Retry Section</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

