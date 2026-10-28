"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createEventSchema,
  updateEventSchema,
  EVENT_STATUSES,
  EVENT_TYPE_PRESETS,
  type EventRow,
  type EventStatus,
} from "@/lib/validations/event";
import { createEventAction, updateEventAction } from "@/lib/actions/events";
import { toDateInputValue, dateInputToIsoString } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sliders,
} from "lucide-react";

interface EventFormProps {
  mode: "create" | "edit";
  initialData?: EventRow;
  onSuccessRedirect?: string;
}

export function EventForm({
  mode,
  initialData,
  onSuccessRedirect,
}: EventFormProps) {
  const router = useRouter();
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);

  // Form field state
  const [name, setName] = React.useState(initialData?.name ?? "");
  const [eventType, setEventType] = React.useState(initialData?.event_type ?? "conference");
  const [customEventType, setCustomEventType] = React.useState(
    initialData && !EVENT_TYPE_PRESETS.some((p) => p.value === initialData.event_type)
      ? initialData.event_type
      : ""
  );
  const [eventDate, setEventDate] = React.useState(
    toDateInputValue(initialData?.event_date)
  );
  const [location, setLocation] = React.useState(initialData?.location ?? "");
  const [guestCount, setGuestCount] = React.useState(
    initialData ? String(initialData.guest_count) : ""
  );
  const [budget, setBudget] = React.useState(
    initialData ? String(initialData.budget) : ""
  );
  const [preferences, setPreferences] = React.useState(
    initialData?.preferences ?? ""
  );
  const [constraints, setConstraints] = React.useState(
    initialData?.constraints ?? ""
  );
  const [culturalRequirements, setCulturalRequirements] = React.useState(
    initialData?.cultural_requirements ?? ""
  );
  const [status, setStatus] = React.useState<EventStatus>(
    initialData?.status ?? "draft"
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[] | undefined>
  >({});
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const isCustomType = eventType === "other";
  const resolvedEventType = isCustomType ? customEventType : eventType;

  // Clean numeric inputs avoiding sticky leading zeros
  const handleGuestCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (/^0\d+$/.test(val)) {
      val = val.replace(/^0+/, "");
    }
    setGuestCount(val);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (/^0\d+$/.test(val)) {
      val = val.replace(/^0+/, "");
    }
    setBudget(val);
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
    setFormError(null);
    setFieldErrors({});
    setSuccessMessage(null);

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
        setFieldErrors(flattened);
        setFormError("Please correct the highlighted errors in the form before submitting.");
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
        setFieldErrors(flattened);
        setFormError("Please correct the highlighted errors in the form before submitting.");
        setTimeout(() => {
          errorSummaryRef.current?.focus();
          errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const result = await createEventAction(rawPayload);
        if (!result.success) {
          setFormError(result.error);
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          setIsSubmitting(false);
          setTimeout(() => {
            errorSummaryRef.current?.focus();
            errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
          return;
        }

        setSuccessMessage("Event workspace created successfully!");
        const targetUrl =
          onSuccessRedirect || `/dashboard/events/${result.data.id}`;
        router.push(targetUrl);
      } else {
        if (!initialData?.id) {
          setFormError("Missing event identifier.");
          setIsSubmitting(false);
          return;
        }

        const result = await updateEventAction(initialData.id, rawPayload);
        if (!result.success) {
          setFormError(result.error);
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          setIsSubmitting(false);
          setTimeout(() => {
            errorSummaryRef.current?.focus();
            errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
          return;
        }

        setSuccessMessage("Event setup updated successfully!");
        const targetUrl =
          onSuccessRedirect || `/dashboard/events/${initialData.id}`;
        router.push(targetUrl);
      }
    } catch {
      setFormError("An unexpected network error occurred. Please try again.");
      setIsSubmitting(false);
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
      {formError && (
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
                    const fieldId =
                      fieldKey === "name"
                        ? "event-name"
                        : fieldKey === "event_type"
                        ? "event-type"
                        : fieldKey === "status"
                        ? "event-status"
                        : fieldKey === "event_date"
                        ? "event-date"
                        : fieldKey === "location"
                        ? "event-location"
                        : fieldKey === "guest_count"
                        ? "guest-count"
                        : fieldKey === "budget"
                        ? "event-budget"
                        : fieldKey === "preferences"
                        ? "event-preferences"
                        : fieldKey === "constraints"
                        ? "event-constraints"
                        : "event-cultural";

                    const fieldLabel =
                      fieldKey === "name"
                        ? "Event Name"
                        : fieldKey === "event_type"
                        ? "Event Classification"
                        : fieldKey === "status"
                        ? "Planning Status"
                        : fieldKey === "event_date"
                        ? "Target Event Date"
                        : fieldKey === "location"
                        ? "Venue or Location"
                        : fieldKey === "guest_count"
                        ? "Estimated Guest Count"
                        : fieldKey === "budget"
                        ? "Target Budget"
                        : fieldKey === "preferences"
                        ? "Preferences"
                        : fieldKey === "constraints"
                        ? "Planning Constraints"
                        : "Cultural Requirements";

                    return (
                      <li key={fieldKey}>
                        <button
                          type="button"
                          onClick={() => focusField(fieldId)}
                          className="text-left font-medium text-rose-700 underline hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded-xs"
                        >
                          {fieldLabel}: {messages[0]}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

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
      <section
        aria-labelledby="stage-1-heading"
        className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 shadow-2xs">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Stage 1 of 3
            </span>
            <h2
              id="stage-1-heading"
              className="text-base font-bold text-slate-950 dark:text-white"
            >
              Event Identity &amp; Type
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Primary title, classification, and planning lifecycle state.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Event Name */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="event-name">
                Event Name{" "}
                <span aria-hidden="true" className="text-rose-500 font-bold">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </Label>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400" aria-hidden="true">
                {name.length} / 150
              </span>
            </div>
            <Input
              id="event-name"
              name="name"
              type="text"
              required
              aria-required="true"
              maxLength={150}
              placeholder="e.g. Horizon Annual Leadership Summit 2027"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={
                fieldErrors.name
                  ? "name-error name-hint"
                  : "name-hint"
              }
              className="focus-visible:ring-violet-500 focus-visible:border-violet-500"
            />
            {fieldErrors.name && (
              <p id="name-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.name[0]}
              </p>
            )}
            <p id="name-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              A distinctive title used across blueprints, budget ledgers, and operational schedules.
            </p>
          </div>

          {/* Event Type Select */}
          <div className="space-y-1.5">
            <Label htmlFor="event-type">
              Event Classification{" "}
              <span aria-hidden="true" className="text-rose-500 font-bold">
                *
              </span>
              <span className="sr-only">(required)</span>
            </Label>
            <div className="relative">
              <select
                id="event-type"
                name="event_type"
                required
                aria-required="true"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                aria-invalid={!!fieldErrors.event_type}
                aria-describedby={
                  fieldErrors.event_type
                    ? "event-type-error event-type-hint"
                    : "event-type-hint"
                }
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                {EVENT_TYPE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            {isCustomType && (
              <div className="pt-2 space-y-1">
                <Label htmlFor="custom-event-type" className="text-xs text-slate-600 dark:text-slate-300">
                  Custom Event Type Description{" "}
                  <span aria-hidden="true" className="text-rose-500 font-bold">
                    *
                  </span>
                  <span className="sr-only">(required)</span>
                </Label>
                <Input
                  id="custom-event-type"
                  name="custom_event_type"
                  type="text"
                  maxLength={50}
                  placeholder="e.g. Hackathon or Product Showcase"
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  aria-invalid={!!fieldErrors.event_type}
                  aria-describedby={
                    fieldErrors.event_type ? "event-type-error" : undefined
                  }
                  className="focus-visible:ring-violet-500 focus-visible:border-violet-500"
                />
              </div>
            )}
            {fieldErrors.event_type && (
              <p id="event-type-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.event_type[0]}
              </p>
            )}
            <p id="event-type-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Determines category breakdowns and default planning milestones.
            </p>
          </div>

          {/* Event Status */}
          <div className="space-y-1.5">
            <Label htmlFor="event-status">
              Planning Status{" "}
              <span aria-hidden="true" className="text-rose-500 font-bold">
                *
              </span>
              <span className="sr-only">(required)</span>
            </Label>
            <select
              id="event-status"
              name="status"
              required
              aria-required="true"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              aria-invalid={!!fieldErrors.status}
              aria-describedby={
                fieldErrors.status
                  ? "event-status-error event-status-hint"
                  : "event-status-hint"
              }
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              {EVENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st === "draft"
                    ? "Draft (Intake in progress)"
                    : st === "planning"
                    ? "In Planning"
                    : st === "confirmed"
                    ? "Confirmed"
                    : st === "in_progress"
                    ? "In Progress"
                    : st === "completed"
                    ? "Completed"
                    : "Cancelled"}
                </option>
              ))}
            </select>
            {fieldErrors.status && (
              <p id="event-status-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.status[0]}
              </p>
            )}
            <p id="event-status-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Current operational phase in the workspace lifecycle.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Timing, Location & Scale */}
      <section
        aria-labelledby="stage-2-heading"
        className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 shadow-2xs">
            <Calendar className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Stage 2 of 3
            </span>
            <h2
              id="stage-2-heading"
              className="text-base font-bold text-slate-950 dark:text-white"
            >
              Schedule, Location &amp; Scale
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target date, venue, expected attendees, and financial ceiling.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Event Date */}
          <div className="space-y-1.5">
            <Label htmlFor="event-date">Target Event Date</Label>
            <Input
              id="event-date"
              name="event_date"
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              aria-invalid={!!fieldErrors.event_date}
              aria-describedby={
                fieldErrors.event_date
                  ? "event-date-error event-date-hint"
                  : "event-date-hint"
              }
              className="pl-3 focus-visible:ring-violet-500 focus-visible:border-violet-500"
            />
            {fieldErrors.event_date && (
              <p id="event-date-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.event_date[0]}
              </p>
            )}
            <p id="event-date-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Can be left empty for preliminary concept drafts.
            </p>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="event-location">Venue or Location</Label>
            <Input
              id="event-location"
              name="location"
              type="text"
              maxLength={300}
              placeholder="e.g. Yerba Buena Center, San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-invalid={!!fieldErrors.location}
              aria-describedby={
                fieldErrors.location
                  ? "location-error location-hint"
                  : "location-hint"
              }
              className="focus-visible:ring-violet-500 focus-visible:border-violet-500"
            />
            {fieldErrors.location && (
              <p id="location-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.location[0]}
              </p>
            )}
            <p id="location-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Physical address, hotel/resort venue, or virtual meeting platform link.
            </p>
          </div>

          {/* Guest Count */}
          <div className="space-y-1.5">
            <Label htmlFor="guest-count">Estimated Guest Count</Label>
            <Input
              id="guest-count"
              name="guest_count"
              type="number"
              min={0}
              max={10000000}
              step={1}
              placeholder="0"
              value={guestCount}
              onChange={handleGuestCountChange}
              aria-invalid={!!fieldErrors.guest_count}
              aria-describedby={
                fieldErrors.guest_count
                  ? "guest-count-error guest-count-hint"
                  : "guest-count-hint"
              }
              className="focus-visible:ring-violet-500 focus-visible:border-violet-500"
            />
            {fieldErrors.guest_count && (
              <p id="guest-count-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.guest_count[0]}
              </p>
            )}
            <p id="guest-count-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Expected attendee scale; informs catering portions, room capacity, and badges.
            </p>
          </div>

          {/* Estimated Budget */}
          <div className="space-y-1.5">
            <Label htmlFor="event-budget">Target Budget (USD $)</Label>
            <div className="relative flex items-center">
              <span
                className="pointer-events-none absolute left-3 text-sm font-semibold text-slate-500 dark:text-slate-400"
                aria-hidden="true"
              >
                $
              </span>
              <Input
                id="event-budget"
                name="budget"
                type="number"
                min={0}
                max={999999999.99}
                step="0.01"
                placeholder="0.00"
                value={budget}
                onChange={handleBudgetChange}
                aria-invalid={!!fieldErrors.budget}
                aria-describedby={
                  fieldErrors.budget
                    ? "event-budget-error event-budget-hint"
                    : "event-budget-hint"
                }
                className="pl-7 focus-visible:ring-violet-500 focus-visible:border-violet-500"
              />
            </div>
            {fieldErrors.budget && (
              <p id="event-budget-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.budget[0]}
              </p>
            )}
            <p id="event-budget-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Initial spending ceiling; tracked in integer cents with live budget variance.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Context, Preferences & Cultural Requirements */}
      <section
        aria-labelledby="stage-3-heading"
        className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 shadow-2xs">
            <Sliders className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Stage 3 of 3
            </span>
            <h2
              id="stage-3-heading"
              className="text-base font-bold text-slate-950 dark:text-white"
            >
              Planning Context &amp; Logistics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Style preferences, operational boundaries, and cultural considerations.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Preferences */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="event-preferences">Preferences &amp; Styling Guidelines</Label>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400" aria-hidden="true">
                {preferences.length} / 2000
              </span>
            </div>
            <Textarea
              id="event-preferences"
              name="preferences"
              maxLength={2000}
              placeholder="e.g. Modern minimalist design, plant-forward catering, acoustic warmth, keynote stage with LED backdrop"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              rows={3}
              aria-invalid={!!fieldErrors.preferences}
              aria-describedby={
                fieldErrors.preferences
                  ? "preferences-error preferences-hint"
                  : "preferences-hint"
              }
              className="focus-visible:ring-violet-500 focus-visible:border-violet-500"
            />
            {fieldErrors.preferences && (
              <p id="preferences-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.preferences[0]}
              </p>
            )}
            <p id="preferences-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Sensory preferences, decorative tone, AV requirements, and guest experience themes.
            </p>
          </div>

          {/* Planning Constraints */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="event-constraints">Planning Constraints &amp; Hard Boundaries</Label>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400" aria-hidden="true">
                {constraints.length} / 2000
              </span>
            </div>
            <Textarea
              id="event-constraints"
              name="constraints"
              maxLength={2000}
              placeholder="e.g. Venue curfew at 11:00 PM, load-in allowed after 7:00 AM, elevator access required for stage gear, decibel cap 85dB"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              rows={3}
              aria-invalid={!!fieldErrors.constraints}
              aria-describedby={
                fieldErrors.constraints
                  ? "constraints-error constraints-hint"
                  : "constraints-hint"
              }
              className="focus-visible:ring-violet-500 focus-visible:border-violet-500"
            />
            {fieldErrors.constraints && (
              <p id="constraints-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.constraints[0]}
              </p>
            )}
            <p id="constraints-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Strict deadlines, venue regulations, load-in curfews, sound limits, and permit cutoffs.
            </p>
          </div>

          {/* Cultural & Dietary Requirements */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="event-cultural">Cultural, Ceremony &amp; Dietary Requirements</Label>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400" aria-hidden="true">
                {culturalRequirements.length} / 2000
              </span>
            </div>
            <Textarea
              id="event-cultural"
              name="cultural_requirements"
              maxLength={2000}
              placeholder="e.g. Kosher & Halal certified stations, quiet prayer room available throughout event, tea welcoming ceremony at 1:30 PM"
              value={culturalRequirements}
              onChange={(e) => setCulturalRequirements(e.target.value)}
              rows={3}
              aria-invalid={!!fieldErrors.cultural_requirements}
              aria-describedby={
                fieldErrors.cultural_requirements
                  ? "cultural-error cultural-hint"
                  : "cultural-hint"
              }
              className="focus-visible:ring-violet-500 focus-visible:border-violet-500"
            />
            {fieldErrors.cultural_requirements && (
              <p id="cultural-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.cultural_requirements[0]}
              </p>
            )}
            <p id="cultural-hint" className="text-[11px] text-slate-500 dark:text-slate-400">
              Dietary certifications (Halal, Kosher, Allergen-free), ceremonial timelines, prayer rooms.
            </p>
          </div>
        </div>
      </section>

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
