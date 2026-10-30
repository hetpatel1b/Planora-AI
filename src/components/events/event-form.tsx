"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createEventSchema,
  updateEventSchema,
  EVENT_TYPE_PRESETS,
  type EventRow,
  type EventStatus,
} from "@/lib/validations/event";
import { createEventAction, updateEventAction } from "@/lib/actions/events";
import { toDateInputValue, dateInputToIsoString } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { EventFormErrorSummary } from "@/components/events/event-form-error-summary";
import { EventFormIdentityStage } from "@/components/events/event-form-identity-stage";
import { EventFormLogisticsStage } from "@/components/events/event-form-logistics-stage";
import { EventFormContextStage } from "@/components/events/event-form-context-stage";

interface EventFormProps {
  mode: "create" | "edit";
  initialData?: EventRow;
  onSuccessRedirect?: string;
}

export interface EventFormFields {
  name: string;
  eventType: string;
  customEventType: string;
  eventDate: string;
  location: string;
  guestCount: string;
  budget: string;
  preferences: string;
  constraints: string;
  culturalRequirements: string;
  status: EventStatus;
}

export interface EventFormState {
  fields: EventFormFields;
  isSubmitting: boolean;
  formError: string | null;
  fieldErrors: Record<string, string[] | undefined>;
  successMessage: string | null;
}

export type EventFormAction =
  | { type: "SET_FIELD"; field: keyof EventFormFields; value: string }
  | { type: "SET_STATUS"; status: EventStatus }
  | { type: "SET_GUEST_COUNT"; value: string }
  | { type: "SET_BUDGET"; value: string }
  | { type: "SUBMIT_START" }
  | {
      type: "SUBMIT_VALIDATION_ERROR";
      formError: string;
      fieldErrors: Record<string, string[] | undefined>;
    }
  | { type: "SUBMIT_SUCCESS"; message: string }
  | {
      type: "SUBMIT_ERROR";
      formError: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function initEventFormState(initialData?: EventRow): EventFormState {
  return {
    fields: {
      name: initialData?.name ?? "",
      eventType: initialData?.event_type ?? "wedding",
      customEventType:
        initialData && !EVENT_TYPE_PRESETS.some((p) => p.value === initialData.event_type)
          ? initialData.event_type
          : "",
      eventDate: toDateInputValue(initialData?.event_date),
      location: initialData?.location ?? "",
      guestCount: initialData ? String(initialData.guest_count) : "",
      budget: initialData ? String(initialData.budget) : "",
      preferences: initialData?.preferences ?? "",
      constraints: initialData?.constraints ?? "",
      culturalRequirements: initialData?.cultural_requirements ?? "",
      status: initialData?.status ?? "draft",
    },
    isSubmitting: false,
    formError: null,
    fieldErrors: {},
    successMessage: null,
  };
}

function eventFormReducer(state: EventFormState, action: EventFormAction): EventFormState {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        fields: {
          ...state.fields,
          [action.field]: action.value,
        },
      };
    case "SET_STATUS":
      return {
        ...state,
        fields: {
          ...state.fields,
          status: action.status,
        },
      };
    case "SET_GUEST_COUNT": {
      let val = action.value;
      if (/^0\d+$/.test(val)) {
        val = val.replace(/^0+/, "");
      }
      return {
        ...state,
        fields: {
          ...state.fields,
          guestCount: val,
        },
      };
    }
    case "SET_BUDGET": {
      let val = action.value;
      if (/^0\d+$/.test(val)) {
        val = val.replace(/^0+/, "");
      }
      return {
        ...state,
        fields: {
          ...state.fields,
          budget: val,
        },
      };
    }
    case "SUBMIT_START":
      return {
        ...state,
        isSubmitting: true,
        formError: null,
        fieldErrors: {},
        successMessage: null,
      };
    case "SUBMIT_VALIDATION_ERROR":
      return {
        ...state,
        isSubmitting: false,
        formError: action.formError,
        fieldErrors: action.fieldErrors,
      };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        isSubmitting: false,
        formError: null,
        fieldErrors: {},
        successMessage: action.message,
      };
    case "SUBMIT_ERROR":
      return {
        ...state,
        isSubmitting: false,
        formError: action.formError,
        fieldErrors: action.fieldErrors ?? {},
      };
    default:
      return state;
  }
}

export function EventForm({
  mode,
  initialData,
  onSuccessRedirect,
}: EventFormProps) {
  const router = useRouter();
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);

  // Consolidated form state machine via useReducer
  const [state, dispatch] = React.useReducer(
    eventFormReducer,
    initialData,
    initEventFormState
  );

  const { fields, isSubmitting, formError, fieldErrors, successMessage } = state;
  const {
    name,
    eventType,
    customEventType,
    eventDate,
    location,
    guestCount,
    budget,
    preferences,
    constraints,
    culturalRequirements,
    status,
  } = fields;

  const setName = (value: string) =>
    dispatch({ type: "SET_FIELD", field: "name", value });
  const setEventType = (value: string) =>
    dispatch({ type: "SET_FIELD", field: "eventType", value });
  const setCustomEventType = (value: string) =>
    dispatch({ type: "SET_FIELD", field: "customEventType", value });
  const setEventDate = (value: string) =>
    dispatch({ type: "SET_FIELD", field: "eventDate", value });
  const setLocation = (value: string) =>
    dispatch({ type: "SET_FIELD", field: "location", value });
  const setPreferences = (value: string) =>
    dispatch({ type: "SET_FIELD", field: "preferences", value });
  const setConstraints = (value: string) =>
    dispatch({ type: "SET_FIELD", field: "constraints", value });
  const setCulturalRequirements = (value: string) =>
    dispatch({ type: "SET_FIELD", field: "culturalRequirements", value });
  const setStatus = (statusValue: EventStatus) =>
    dispatch({ type: "SET_STATUS", status: statusValue });

  const isCustomType = eventType === "other";
  const resolvedEventType = isCustomType ? customEventType : eventType;

  // Clean numeric inputs avoiding sticky leading zeros
  const handleGuestCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_GUEST_COUNT", value: e.target.value });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_BUDGET", value: e.target.value });
  };

  const focusField = (fieldId: string) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SUBMIT_START" });

    // Prepare raw values
    const rawPayload = {
      name: name.trim(),
      event_type: resolvedEventType.trim(),
      event_date: dateInputToIsoString(eventDate),
      location: location.trim() || null,
      guest_count: guestCount.trim() === "" ? 0 : Number(guestCount),
      budget: budget.trim() === "" ? 0 : Number(budget),
      preferences: preferences.trim() || null,
      constraints: constraints.trim() || null,
      cultural_requirements: culturalRequirements.trim() || null,
      status,
    };

    // Client-side schema validation
    if (mode === "create") {
      const clientValidation = createEventSchema.safeParse(rawPayload);
      if (!clientValidation.success) {
        const flattened = clientValidation.error.flatten().fieldErrors;
        dispatch({
          type: "SUBMIT_VALIDATION_ERROR",
          formError: "Please correct the highlighted errors in the form before submitting.",
          fieldErrors: flattened,
        });
        setTimeout(() => {
          errorSummaryRef.current?.focus();
          errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }
    } else {
      const clientValidation = updateEventSchema.safeParse(rawPayload);
      if (!clientValidation.success) {
        const flattened = clientValidation.error.flatten().fieldErrors;
        dispatch({
          type: "SUBMIT_VALIDATION_ERROR",
          formError: "Please correct the highlighted errors in the form before submitting.",
          fieldErrors: flattened,
        });
        setTimeout(() => {
          errorSummaryRef.current?.focus();
          errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }
    }

    try {
      if (mode === "create") {
        const result = await createEventAction(rawPayload);
        if (!result.success) {
          dispatch({
            type: "SUBMIT_ERROR",
            formError: result.error,
            fieldErrors: result.fieldErrors,
          });
          setTimeout(() => {
            errorSummaryRef.current?.focus();
            errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
          return;
        }

        dispatch({
          type: "SUBMIT_SUCCESS",
          message: "Event workspace created successfully!",
        });
        const targetUrl =
          onSuccessRedirect || `/dashboard/events/${result.data.id}`;
        router.push(targetUrl);
      } else {
        if (!initialData?.id) {
          dispatch({
            type: "SUBMIT_ERROR",
            formError: "Missing event identifier.",
          });
          return;
        }

        const result = await updateEventAction(initialData.id, rawPayload);
        if (!result.success) {
          dispatch({
            type: "SUBMIT_ERROR",
            formError: result.error,
            fieldErrors: result.fieldErrors,
          });
          setTimeout(() => {
            errorSummaryRef.current?.focus();
            errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
          return;
        }

        dispatch({
          type: "SUBMIT_SUCCESS",
          message: "Event setup updated successfully!",
        });
        const targetUrl =
          onSuccessRedirect || `/dashboard/events/${initialData.id}`;
        router.push(targetUrl);
      }
    } catch {
      dispatch({
        type: "SUBMIT_ERROR",
        formError: "An unexpected network error occurred. Please try again.",
      });
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 50);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-8 text-slate-900 dark:text-slate-100"
    >
      {/* Form Error Banner with Programmatic Focus */}
      <EventFormErrorSummary
        formError={formError}
        fieldErrors={fieldErrors}
        onFocusField={focusField}
        errorSummaryRef={errorSummaryRef}
      />

      {/* Form Success Banner */}
      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" aria-hidden="true" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Section 1: Core Event Classification */}
      <EventFormIdentityStage
        name={name}
        setName={setName}
        eventType={eventType}
        setEventType={setEventType}
        isCustomType={isCustomType}
        customEventType={customEventType}
        setCustomEventType={setCustomEventType}
        status={status}
        setStatus={setStatus}
        fieldErrors={fieldErrors}
        presets={EVENT_TYPE_PRESETS}
      />

      {/* Section 2: Timing, Location & Scale */}
      <EventFormLogisticsStage
        eventDate={eventDate}
        setEventDate={setEventDate}
        location={location}
        setLocation={setLocation}
        guestCount={guestCount}
        onGuestCountChange={handleGuestCountChange}
        budget={budget}
        onBudgetChange={handleBudgetChange}
        fieldErrors={fieldErrors}
      />

      {/* Section 3: Context, Preferences & Cultural Requirements */}
      <EventFormContextStage
        preferences={preferences}
        setPreferences={setPreferences}
        constraints={constraints}
        setConstraints={setConstraints}
        culturalRequirements={culturalRequirements}
        setCulturalRequirements={setCulturalRequirements}
        fieldErrors={fieldErrors}
      />

      {/* Action Footer with Enhanced Mobile Touch Targets */}
      <div className="flex flex-col-reverse items-center justify-end gap-3 sm:flex-row pt-2">
        <Link
          href={initialData ? `/dashboard/events/${initialData.id}` : "/dashboard"}
          className="inline-flex h-11 sm:h-9 min-h-[44px] sm:min-h-0 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Cancel
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 w-full gap-2 bg-violet-600 text-white shadow-xs hover:bg-violet-700 sm:w-auto focus-visible:ring-violet-500 transition-colors font-semibold text-xs px-5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              <span>{mode === "create" ? "Creating workspace..." : "Saving updates..."}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              <span>{mode === "create" ? "Create Event Workspace" : "Save Changes"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
