"use client";

import * as React from "react";
import Link from "next/link";
import { type EventRow } from "@/lib/validations/event";
import { formatEventDate, getStatusBadgeVariant, formatStatusLabel } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  Tag,
  Clock,
  Sliders,
  ChevronDown,
  Sparkles,
  Edit3,
} from "lucide-react";

export interface EventSummaryBarProps {
  event: EventRow;
}

export function EventSummaryBar({ event }: EventSummaryBarProps) {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const formattedDate = formatEventDate(event.event_date);
  const locationLabel = event.location?.trim() || "Location not determined";
  const guestCountLabel = `${Number(event.guest_count || 0).toLocaleString()} guests`;
  const budgetFormatted = formatCurrency(Number(event.budget || 0));

  const createdDateFormatted = new Date(event.created_at).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Top Meta Row */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300">
              <Tag className="size-3" aria-hidden="true" />
              <span>{event.event_type}</span>
            </span>
            <Badge variant={getStatusBadgeVariant(event.status)}>
              {formatStatusLabel(event.status)}
            </Badge>
            <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Created {createdDateFormatted}
            </span>
          </div>

          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl dark:text-white">
            {event.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/events/${event.id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <Edit3 className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
              <span>Modify Setup</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Core Summary Metrics Grid */}
      <div className="mt-5 grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 border-t border-slate-100 pt-5 lg:grid-cols-4 dark:border-slate-800/80">
        {/* Target Date */}
        <div
          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40 min-w-0"
          title={`Target Event Date: ${formattedDate}`}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Calendar className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Target Date
            </p>
            <p className="mt-0.5 font-semibold text-xs text-slate-900 dark:text-white truncate">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Venue / Location */}
        <div
          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40 min-w-0"
          title={`Location: ${locationLabel}`}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <MapPin className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Venue / Location
            </p>
            <p className="mt-0.5 font-semibold text-xs text-slate-900 dark:text-white truncate">
              {locationLabel}
            </p>
          </div>
        </div>

        {/* Expected Attendees */}
        <div
          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40 min-w-0"
          title={`Guest Capacity: ${guestCountLabel}`}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Users className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Attendees
            </p>
            <p className="mt-0.5 font-semibold text-xs text-slate-900 dark:text-white truncate">
              {guestCountLabel}
            </p>
          </div>
        </div>

        {/* Target Budget */}
        <div
          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5 dark:border-slate-800/60 dark:bg-slate-950/40 min-w-0"
          title={`Target Budget Ceiling: ${budgetFormatted}`}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <IndianRupee className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Target Budget
            </p>
            <p className="mt-0.5 font-semibold text-xs text-slate-900 dark:text-white truncate">
              {budgetFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure Toggle for Brief & Logistics */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          aria-expanded={isDetailsOpen}
          aria-controls="event-logistics-disclosure"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm py-1 cursor-pointer"
        >
          <Sliders className="size-3.5" aria-hidden="true" />
          <span>{isDetailsOpen ? "Hide Planning Brief & Logistics" : "View Planning Brief & Logistics"}</span>
          <ChevronDown
            className={`size-3.5 transition-transform duration-200 ${
              isDetailsOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {isDetailsOpen && (
          <div
            id="event-logistics-disclosure"
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 pt-3 border-t border-dashed border-slate-200/80 dark:border-slate-800 animate-in fade-in"
          >
            {/* Preferences */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-950/30">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Sliders className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <h3 className="text-xs font-bold text-slate-950 dark:text-white">
                  Preferences &amp; Styling
                </h3>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {event.preferences || "No specific design or styling preferences provided."}
              </p>
            </div>

            {/* Constraints */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-950/30">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Clock className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <h3 className="text-xs font-bold text-slate-950 dark:text-white">
                  Planning Constraints
                </h3>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {event.constraints || "No strict operational or logistical constraints recorded."}
              </p>
            </div>

            {/* Cultural & Dietary */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-950/30">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <h3 className="text-xs font-bold text-slate-950 dark:text-white">
                  Cultural &amp; Dietary Requirements
                </h3>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {event.cultural_requirements || "No specific cultural ceremonies or dietary requirements logged."}
              </p>
            </div>

            <div className="sm:col-span-3 text-[11px] text-slate-400 dark:text-slate-500 pt-1 flex items-center justify-between flex-wrap gap-2">
              <span>Workspace ID: <code className="font-mono">{event.id}</code></span>
              <span>All parameters isolated by PostgreSQL Row Level Security.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

