"use client";

import * as React from "react";
import Link from "next/link";
import { type EventRow } from "@/lib/validations/event";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/export/export-menu";
import { DeleteEventDialogWrapper } from "@/components/events/delete-event-dialog-wrapper";
import { ArrowLeft, Edit3, Tag } from "lucide-react";

export interface WorkspaceHeaderProps {
  event: EventRow;
}

export function WorkspaceHeader({ event }: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Left: Breadcrumb Navigation & Identity */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md px-1 py-0.5 shrink-0"
            title="Return to Dashboard"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700 select-none" aria-hidden="true">
            /
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="max-w-[95px] xs:max-w-[150px] sm:max-w-xs md:max-w-md truncate text-xs sm:text-sm font-bold text-slate-950 dark:text-white"
              title={event.name}
            >
              {event.name}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-300">
              <Tag className="size-3" aria-hidden="true" />
              <span>{event.event_type}</span>
            </span>
            <StatusBadge status={event.status} className="hidden xs:inline-flex" />
          </div>
        </nav>

        {/* Right: Actions (Export, Edit, Delete) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ExportMenu eventId={event.id} eventName={event.name} />

          <Link href={`/dashboard/events/${event.id}/edit`}>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900"
              title="Edit event setup and parameters"
              aria-label="Edit event setup and parameters"
            >
              <Edit3 className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Edit Setup</span>
            </Button>
          </Link>

          <DeleteEventDialogWrapper
            eventId={event.id}
            eventName={event.name}
            redirectToDashboard
          />
        </div>
      </div>
    </header>
  );
}

