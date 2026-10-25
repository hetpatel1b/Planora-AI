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

  return (
    <>
      <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900/60">
        <div>
          {/* Card Header: Type, Status & Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <Tag className="size-3" />
                <span>{event.event_type}</span>
              </span>
              <Badge variant={getStatusBadgeVariant(event.status)}>
                {formatStatusLabel(event.status)}
              </Badge>
            </div>

            {/* Quick Card Controls */}
            <div className="flex items-center gap-1">
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                title="Edit event setup"
                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              >
                <Edit3 className="size-3.5" />
              </Link>
              <button
                type="button"
                title="Delete event"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Event Title */}
          <Link
            href={`/dashboard/events/${event.id}`}
            className="mt-3 block group-hover:text-indigo-600 transition"
          >
            <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white line-clamp-1">
              {event.name}
            </h3>
          </Link>

          {/* Core Metadata */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 pt-4 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{formatEventDate(event.event_date)}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{event.location || "Location TBD"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="size-3.5 text-indigo-500 shrink-0" />
              <span>{event.guest_count.toLocaleString()} attendees</span>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="size-3.5 text-indigo-500 shrink-0" />
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {formatCurrency(Number(event.budget))}
              </span>
            </div>
          </div>

          {/* Preferences / Constraints snippet */}
          {(event.preferences || event.constraints) && (
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 italic">
              &ldquo;{event.preferences || event.constraints}&rdquo;
            </p>
          )}
        </div>

        {/* Card Footer: Open Workspace */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
          >
            <span>Open Event Workspace</span>
            <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

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
