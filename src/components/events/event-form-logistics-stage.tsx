import * as React from "react";
import { Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface EventFormLogisticsStageProps {
  eventDate: string;
  setEventDate: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  guestCount: string;
  onGuestCountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  budget: string;
  onBudgetChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fieldErrors: Record<string, string[] | undefined>;
}

export function EventFormLogisticsStage({
  eventDate,
  setEventDate,
  location,
  setLocation,
  guestCount,
  onGuestCountChange,
  budget,
  onBudgetChange,
  fieldErrors,
}: EventFormLogisticsStageProps) {
  return (
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
            onChange={onGuestCountChange}
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
          <Label htmlFor="event-budget">Target Budget (INR ₹)</Label>
          <div className="relative flex items-center">
            <span
              className="pointer-events-none absolute left-3 text-sm font-semibold text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            >
              ₹
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
              onChange={onBudgetChange}
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
  );
}

