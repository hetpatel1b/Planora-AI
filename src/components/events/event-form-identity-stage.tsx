"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import {
  EVENT_STATUSES,
  type EventStatus,
} from "@/lib/validations/event";

export interface PresetType {
  value: string;
  label: string;
}

export interface EventFormIdentityStageProps {
  name: string;
  setName: (val: string) => void;
  eventType: string;
  setEventType: (val: string) => void;
  isCustomType: boolean;
  customEventType: string;
  setCustomEventType: (val: string) => void;
  status: EventStatus;
  setStatus: (val: EventStatus) => void;
  fieldErrors: Record<string, string[] | undefined>;
  presets: readonly PresetType[];
}

export function EventFormIdentityStage({
  name,
  setName,
  eventType,
  setEventType,
  isCustomType,
  customEventType,
  setCustomEventType,
  status,
  setStatus,
  fieldErrors,
  presets,
}: EventFormIdentityStageProps) {
  return (
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
            <span
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            >
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
            placeholder="e.g. Maya & Rohan's Wedding Celebration or Liam's 30th Birthday"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={
              fieldErrors.name ? "name-error name-hint" : "name-hint"
            }
            className="focus-visible:ring-violet-500 focus-visible:border-violet-500"
          />
          {fieldErrors.name && (
            <p
              id="name-error"
              className="text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              {fieldErrors.name[0]}
            </p>
          )}
          <p
            id="name-hint"
            className="text-[11px] text-slate-500 dark:text-slate-400"
          >
            A distinctive title used across blueprints, budget ledgers, and
            operational schedules.
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
          {/* Core Problem Statement Categories Quick Chips */}
          <div
            className="flex flex-wrap items-center gap-1.5 pb-1"
            role="group"
            aria-label="Core event categories"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
              Core:
            </span>
            {[
              { value: "wedding", label: "💍 Wedding & Reception" },
              { value: "birthday", label: "🎂 Birthday Party" },
              { value: "community", label: "🤝 Community Gathering" },
            ].map((core) => {
              const isSelected = eventType === core.value;
              return (
                <button
                  key={core.value}
                  type="button"
                  onClick={() => setEventType(core.value)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-violet-600 text-white shadow-2xs dark:bg-violet-600 dark:text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                  aria-pressed={isSelected}
                >
                  {core.label}
                </button>
              );
            })}
          </div>
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
              {presets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          {isCustomType && (
            <div className="pt-2 space-y-1">
              <Label
                htmlFor="custom-event-type"
                className="text-xs text-slate-600 dark:text-slate-300"
              >
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
            <p
              id="event-type-error"
              className="text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              {fieldErrors.event_type[0]}
            </p>
          )}
          <p
            id="event-type-hint"
            className="text-[11px] text-slate-500 dark:text-slate-400"
          >
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
            <p
              id="event-status-error"
              className="text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              {fieldErrors.status[0]}
            </p>
          )}
          <p
            id="event-status-hint"
            className="text-[11px] text-slate-500 dark:text-slate-400"
          >
            Current phase in the planning lifecycle.
          </p>
        </div>
      </div>
    </section>
  );
}

