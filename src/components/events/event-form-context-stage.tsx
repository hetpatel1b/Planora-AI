import * as React from "react";
import { Sliders } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface EventFormContextStageProps {
  preferences: string;
  setPreferences: (val: string) => void;
  constraints: string;
  setConstraints: (val: string) => void;
  culturalRequirements: string;
  setCulturalRequirements: (val: string) => void;
  fieldErrors: Record<string, string[] | undefined>;
}

export function EventFormContextStage({
  preferences,
  setPreferences,
  constraints,
  setConstraints,
  culturalRequirements,
  setCulturalRequirements,
  fieldErrors,
}: EventFormContextStageProps) {
  return (
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
  );
}

