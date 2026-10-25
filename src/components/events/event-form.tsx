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
    initialData ? String(initialData.guest_count) : "0"
  );
  const [budget, setBudget] = React.useState(
    initialData ? String(initialData.budget) : "0"
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
        setFieldErrors(clientValidation.error.flatten().fieldErrors);
        setFormError("Please correct the errors in the form before submitting.");
        return;
      }
    } else {
      const clientValidation = updateEventSchema.safeParse(rawPayload);
      if (!clientValidation.success) {
        setFieldErrors(clientValidation.error.flatten().fieldErrors);
        setFormError("Please correct the errors in the form before submitting.");
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
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-8 text-slate-900 dark:text-slate-100"
    >
      {/* Form Error Banner */}
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{formError}</p>
          </div>
        </div>
      )}

      {/* Form Success Banner */}
      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Section 1: Core Event Classification */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
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
            <Label htmlFor="event-name">
              Event Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="event-name"
              type="text"
              required
              placeholder="e.g. Horizon Annual Leadership Summit 2027"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
            />
            {fieldErrors.name && (
              <p id="name-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          {/* Event Type Select */}
          <div className="space-y-1.5">
            <Label htmlFor="event-type">
              Event Classification <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <select
                id="event-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                aria-invalid={!!fieldErrors.event_type}
                aria-describedby={fieldErrors.event_type ? "event-type-error" : undefined}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                {EVENT_TYPE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            {isCustomType && (
              <div className="pt-2">
                <Label htmlFor="custom-event-type" className="sr-only">
                  Custom Event Type
                </Label>
                <Input
                  id="custom-event-type"
                  type="text"
                  placeholder="Specify custom event type"
                  aria-label="Specify custom event type"
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  aria-invalid={!!fieldErrors.event_type}
                  aria-describedby={fieldErrors.event_type ? "event-type-error" : undefined}
                />
              </div>
            )}
            {fieldErrors.event_type && (
              <p id="event-type-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.event_type[0]}
              </p>
            )}
          </div>

          {/* Event Status */}
          <div className="space-y-1.5">
            <Label htmlFor="event-status">
              Planning Status <span className="text-rose-500">*</span>
            </Label>
            <select
              id="event-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              aria-invalid={!!fieldErrors.status}
              aria-describedby={fieldErrors.status ? "event-status-error" : undefined}
              className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
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
          </div>
        </div>
      </div>

      {/* Section 2: Timing, Location & Scale */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Calendar className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
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
            <div className="relative">
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                aria-invalid={!!fieldErrors.event_date}
                aria-describedby={fieldErrors.event_date ? "event-date-error event-date-hint" : "event-date-hint"}
                className="pl-3"
              />
            </div>
            {fieldErrors.event_date && (
              <p id="event-date-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.event_date[0]}
              </p>
            )}
            <p id="event-date-hint" className="text-[11px] text-slate-400">
              Can be left empty for preliminary concept drafts.
            </p>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="event-location">Venue or Location</Label>
            <div className="relative">
              <Input
                id="event-location"
                type="text"
                placeholder="e.g. Yerba Buena Center, San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-invalid={!!fieldErrors.location}
                aria-describedby={fieldErrors.location ? "location-error" : undefined}
              />
            </div>
            {fieldErrors.location && (
              <p id="location-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.location[0]}
              </p>
            )}
          </div>

          {/* Guest Count */}
          <div className="space-y-1.5">
            <Label htmlFor="guest-count">
              Estimated Guest Count
            </Label>
            <div className="relative">
              <Input
                id="guest-count"
                type="number"
                min={0}
                max={10000000}
                step={1}
                placeholder="0"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                aria-invalid={!!fieldErrors.guest_count}
                aria-describedby={fieldErrors.guest_count ? "guest-count-error" : undefined}
              />
            </div>
            {fieldErrors.guest_count && (
              <p id="guest-count-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.guest_count[0]}
              </p>
            )}
          </div>

          {/* Estimated Budget */}
          <div className="space-y-1.5">
            <Label htmlFor="event-budget">
              Target Budget (USD $)
            </Label>
            <div className="relative">
              <Input
                id="event-budget"
                type="number"
                min={0}
                max={999999999.99}
                step="0.01"
                placeholder="0.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                aria-invalid={!!fieldErrors.budget}
                aria-describedby={fieldErrors.budget ? "event-budget-error" : undefined}
              />
            </div>
            {fieldErrors.budget && (
              <p id="event-budget-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.budget[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Context, Preferences & Cultural Requirements */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Sliders className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
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
            <Label htmlFor="event-preferences">Preferences &amp; Styling Guidelines</Label>
            <Textarea
              id="event-preferences"
              placeholder="e.g. Modern minimalist design, plant-forward catering, acoustic warmth, keynote stage with LED backdrop"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              rows={3}
              aria-invalid={!!fieldErrors.preferences}
              aria-describedby={fieldErrors.preferences ? "preferences-error" : undefined}
            />
            {fieldErrors.preferences && (
              <p id="preferences-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.preferences[0]}
              </p>
            )}
          </div>

          {/* Planning Constraints */}
          <div className="space-y-1.5">
            <Label htmlFor="event-constraints">Planning Constraints &amp; Hard Boundaries</Label>
            <Textarea
              id="event-constraints"
              placeholder="e.g. Venue curfew at 11:00 PM, load-in allowed after 7:00 AM, elevator access required for stage gear, decibel cap 85dB"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              rows={3}
              aria-invalid={!!fieldErrors.constraints}
              aria-describedby={fieldErrors.constraints ? "constraints-error" : undefined}
            />
            {fieldErrors.constraints && (
              <p id="constraints-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.constraints[0]}
              </p>
            )}
          </div>

          {/* Cultural & Dietary Requirements */}
          <div className="space-y-1.5">
            <Label htmlFor="event-cultural">Cultural, Ceremony &amp; Dietary Requirements</Label>
            <Textarea
              id="event-cultural"
              placeholder="e.g. Kosher & Halal certified stations, quiet prayer room available throughout event, tea welcoming ceremony at 1:30 PM"
              value={culturalRequirements}
              onChange={(e) => setCulturalRequirements(e.target.value)}
              rows={3}
              aria-invalid={!!fieldErrors.cultural_requirements}
              aria-describedby={fieldErrors.cultural_requirements ? "cultural-error" : undefined}
            />
            {fieldErrors.cultural_requirements && (
              <p id="cultural-error" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fieldErrors.cultural_requirements[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col-reverse items-center justify-end gap-3 sm:flex-row">
        <Link
          href={initialData ? `/dashboard/events/${initialData.id}` : "/dashboard"}
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancel
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gap-2 bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 sm:w-auto dark:bg-indigo-600 dark:hover:bg-indigo-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>{mode === "create" ? "Creating workspace..." : "Saving updates..."}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              <span>{mode === "create" ? "Create Event Workspace" : "Save Changes"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
