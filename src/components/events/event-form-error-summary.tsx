import * as React from "react";
import { AlertCircle } from "lucide-react";

export interface EventFormErrorSummaryProps {
  formError: string | null;
  fieldErrors: Record<string, string[] | undefined>;
  onFocusField: (fieldId: string) => void;
  errorSummaryRef: React.RefObject<HTMLDivElement | null>;
}

const FIELD_METADATA: Record<string, { id: string; label: string }> = {
  name: { id: "event-name", label: "Event Name" },
  event_type: { id: "event-type", label: "Event Classification" },
  status: { id: "event-status", label: "Planning Status" },
  event_date: { id: "event-date", label: "Target Event Date" },
  location: { id: "event-location", label: "Venue or Location" },
  guest_count: { id: "guest-count", label: "Estimated Guest Count" },
  budget: { id: "event-budget", label: "Target Budget" },
  preferences: { id: "event-preferences", label: "Preferences" },
  constraints: { id: "event-constraints", label: "Planning Constraints" },
  cultural_requirements: { id: "event-cultural", label: "Cultural Requirements" },
};

export function EventFormErrorSummary({
  formError,
  fieldErrors,
  onFocusField,
  errorSummaryRef,
}: EventFormErrorSummaryProps) {
  if (!formError) return null;

  return (
    <div
      ref={errorSummaryRef}
      tabIndex={-1}
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-rose-200 bg-rose-50/95 p-4 text-xs text-rose-900 shadow-2xs outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <p className="font-semibold">{formError}</p>
          {Object.keys(fieldErrors).length > 0 && (
            <ul className="mt-2 list-disc pl-4 space-y-1 text-[11px]">
              {Object.entries(fieldErrors).map(([fieldKey, messages]) => {
                if (!messages || messages.length === 0) return null;
                const meta = FIELD_METADATA[fieldKey] || { id: "event-name", label: fieldKey };

                return (
                  <li key={fieldKey}>
                    <button
                      type="button"
                      onClick={() => onFocusField(meta.id)}
                      className="text-left font-medium text-rose-700 underline hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded-xs"
                    >
                      {meta.label}: {messages[0]}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

