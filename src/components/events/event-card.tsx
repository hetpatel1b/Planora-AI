"use client";

import * as React from "react";
import Link from "next/link";
import { type EventRow } from "@/lib/validations/event";
import {
  formatEventDate,
  getStatusBadgeVariant,
  formatStatusLabel,
} from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { Badge } from "@/components/ui/badge";
import { DeleteEventDialog } from "@/components/events/delete-event-dialog";
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ArrowRight,
  Edit3,
  Trash2,
  Tag,
} from "lucide-react";

interface EventCardProps {
  event: EventRow;
  onDeleted?: () => void;
}

export function EventCard({ event, onDeleted }: EventCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const formattedDate = event.event_date
    ? formatEventDate(event.event_date)
    : "Date TBD";
  const locationLabel = event.location?.trim() || "Location TBD";
  const guestCountLabel = `${Number(event.guest_count || 0).toLocaleString()} attendees`;
  const budgetFormatted = formatCurrency(Number(event.budget || 0));

  return (
    <>
      <article
        aria-labelledby={`event-title-${event.id}`}
        className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-700/60"
      >
        <div>
          {/* Card Header: Classification, Status & Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900/40">
                <Tag className="size-3" aria-hidden="true" />
                <span>{event.event_type}</span>
              </span>
              <Badge variant={getStatusBadgeVariant(event.status)}>
                {formatStatusLabel(event.status)}
              </Badge>
            </div>

            {/* Quick Card Controls (Touch-friendly minimum 44px tap zone on mobile) */}
            <div className="flex items-center gap-0.5 -mr-1">
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                title={`Edit ${event.name}`}
                aria-label={`Edit ${event.name}`}
                className="flex size-9 sm:size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <Edit3 className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Edit {event.name}</span>
              </Link>
              <button
                type="button"
                title={`Delete ${event.name}`}
                aria-label={`Delete ${event.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteDialogOpen(true);
                }}
                className="flex size-9 sm:size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition-colors"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Delete {event.name}</span>
              </button>
            </div>
          </div>

          {/* Event Title with Hover & Native Tooltip Support */}
          <Link
            href={`/dashboard/events/${event.id}`}
            title={event.name}
            className="mt-3 block group-hover:text-violet-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
          >
            <h3
              id={`event-title-${event.id}`}
              className="text-lg font-bold tracking-tight text-slate-950 dark:text-white line-clamp-1"
            >
              {event.name}
            </h3>
          </Link>

          {/* Core Event Metadata Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
            <div className="flex items-center gap-2 min-w-0" title={`Scheduled date: ${formattedDate}`}>
              <Calendar className="size-3.5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2 min-w-0" title={`Location: ${locationLabel}`}>
              <MapPin className="size-3.5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{locationLabel}</span>
            </div>

            <div className="flex items-center gap-2 min-w-0" title={`Guest count: ${guestCountLabel}`}>
              <Users className="size-3.5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{guestCountLabel}</span>
            </div>

            <div className="flex items-center gap-2 min-w-0" title={`Budget cap: ${budgetFormatted}`}>
              <DollarSign className="size-3.5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {budgetFormatted}
              </span>
            </div>
          </div>

          {/* Preferences / Constraints snippet */}
          {(event.preferences || event.constraints) && (
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 italic bg-slate-50/70 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
              &ldquo;{event.preferences || event.constraints}&rdquo;
            </p>
          )}
        </div>

        {/* Card Footer: Open Event Workspace CTA */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="inline-flex w-full items-center justify-between text-xs font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm py-1"
          >
            <span>Open Event Workspace</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </article>

      <DeleteEventDialog
        eventId={event.id}
        eventName={event.name}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDeleted={onDeleted}
      />
    </>
  );
}
