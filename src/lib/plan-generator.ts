import {
  aiPlanBlueprintSchema,
  type AIPlanBlueprint,
  type PlanMilestone,
  type PlanSuggestedTask,
  type PlanProposedBudgetItem,
} from "@/lib/validations/plan";
import {
  type EventTypeTemplate,
  normalizeEventType,
  TEMPLATES,
} from "@/lib/plan-templates";
import { formatCurrency } from "@/lib/currency-utils";

/**
 * Planora AI — Deterministic Event Plan Generator Engine (F02)
 *
 * Produces comprehensive, rule-based event blueprints conforming strictly
 * to `aiPlanBlueprintSchema`. Provides repeatable, validated planning artifacts
 * without external AI dependencies or persistent side effects.
 */

export interface EventPlanInput {
  name: string;
  event_type: string;
  event_date?: string | null;
  location?: string | null;
  guest_count?: number | null;
  budget?: number | string | null;
  preferences?: string | null;
  constraints?: string | null;
  cultural_requirements?: string | null;
}

export interface GeneratePlanOptions {
  /** Reference date used for timeline milestone calculations. Defaults to new Date(). */
  referenceDate?: Date;
}

/**
 * Computes a milestone date relative to event date and reference date.
 * Guarantees that the suggested milestone date is never after the event date.
 */
function computeMilestoneDate(
  eventDateStr: string | null | undefined,
  daysBefore: number,
  refDate: Date
): string | null {
  if (!eventDateStr) return null;
  const eventDate = new Date(eventDateStr);
  if (isNaN(eventDate.getTime())) return null;

  const eventTime = eventDate.getTime();
  const refTime = refDate.getTime();

  // If the event date is in the past or today, anchor to the event date itself
  if (eventTime <= refTime) {
    return eventDate.toISOString().split("T")[0];
  }

  const daysUntilEvent = Math.max(0, Math.floor((eventTime - refTime) / (1000 * 60 * 60 * 24)));

  let targetTime: number;
  if (daysUntilEvent >= daysBefore) {
    targetTime = eventTime - daysBefore * 24 * 60 * 60 * 1000;
  } else {
    // Proportional placement between reference date and event date
    const ratio = Math.max(0, Math.min(1, daysBefore / 180));
    const offsetDays = Math.round(daysUntilEvent * (1 - ratio));
    targetTime = refTime + offsetDays * 24 * 60 * 60 * 1000;
  }

  // Ensure milestone date is bounded: refTime <= targetTime <= eventTime
  targetTime = Math.min(eventTime, Math.max(refTime, targetTime));
  return new Date(targetTime).toISOString().split("T")[0];
}

/**
 * Apportions target budget into integer cents across line items.
 * Guarantees exact sum matching target budget with zero rounding drift or negative amounts.
 */
function allocateBudgetItems(
  targetBudget: number,
  items: Array<{ category: string; item_name: string; ratio: number; notes?: string }>
): PlanProposedBudgetItem[] {
  const targetCents = Math.round(Math.max(0, targetBudget) * 100);

  if (targetCents === 0) {
    return items.map((item) => ({
      category: item.category,
      item_name: item.item_name,
      estimated_amount: 0,
      notes: item.notes || "Estimated cost pending quote or target budget allocation.",
    }));
  }

  const totalRatio = items.reduce((acc, it) => acc + it.ratio, 0);
  const normalizedRatios = items.map((it) => it.ratio / (totalRatio > 0 ? totalRatio : 1));

  let allocatedCentsSum = 0;
  const centsArray: number[] = [];

  for (let i = 0; i < items.length; i++) {
    const itemCents = Math.floor(targetCents * normalizedRatios[i]);
    centsArray.push(itemCents);
    allocatedCentsSum += itemCents;
  }

  // Assign any remainder cents from floor rounding to the first item (primary venue/space)
  const remainderCents = targetCents - allocatedCentsSum;
  if (remainderCents > 0 && centsArray.length > 0) {
    centsArray[0] += remainderCents;
  }

  return items.map((item, idx) => ({
    category: item.category,
    item_name: item.item_name,
    estimated_amount: Number((centsArray[idx] / 100).toFixed(2)),
    notes: item.notes ?? null,
  }));
}


/**
 * Safely extracts a bounded excerpt from user text, trimming whitespace
 * and appending an ellipsis if truncation is necessary.
 */
function truncateExcerpt(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  const sliceTarget = maxLength - 1;
  const lastSpace = trimmed.lastIndexOf(" ", sliceTarget);
  const cutIndex = lastSpace > maxLength * 0.7 ? lastSpace : sliceTarget;
  return trimmed.slice(0, cutIndex).trimEnd() + "…";
}

/**
 * Builds a dynamic, cohesive summary text based on input parameters.
 * Guarantees that the composed output strictly respects the 2,000-character schema ceiling.
 */
function buildEventSummary(
  event: EventPlanInput,
  template: EventTypeTemplate
): string {
  const name = event.name.trim();
  const guestCount = event.guest_count && event.guest_count > 0 ? event.guest_count : null;
  const budget = typeof event.budget === "number" ? event.budget : Number(event.budget) || 0;
  const location = event.location?.trim() || null;

  const formattedBudget = formatCurrency(budget, {
    maximumFractionDigits: 0,
  });

  let summary = `Strategic event blueprint for "${name}", designed as a ${template.category}.`;

  if (location && guestCount) {
    summary += ` The gathering is planned for ${guestCount.toLocaleString()} attendees at ${location}.`;
  } else if (guestCount) {
    summary += ` The gathering is planned to host approximately ${guestCount.toLocaleString()} attendees.`;
  } else if (location) {
    summary += ` The event will be hosted at ${location}.`;
  }

  if (budget > 0) {
    summary += ` This blueprint targets an overall budget ceiling of ${formattedBudget}, with strategic allocations designed to balance core venue requirements, hospitality, and entertainment.`;
  } else {
    summary += ` This blueprint provides a structured planning foundation, prioritizing critical milestones and operational checklists while overall budget parameters are finalized.`;
  }

  if (event.preferences) {
    // Bound excerpt so preferences and constraints fit comfortably within the 2,000-char limit
    const prefExcerpt = truncateExcerpt(event.preferences, 400);
    summary += ` Design directives incorporate the planner's aesthetic preference: "${prefExcerpt}".`;
  }

  if (event.constraints) {
    const constExcerpt = truncateExcerpt(event.constraints, 400);
    summary += ` Special operational consideration has been integrated to address noted constraints: "${constExcerpt}".`;
  }

  // Hard safety limit: ensure composed string never exceeds aiPlanBlueprintSchema 2,000 character maximum
  if (summary.length > 2000) {
    summary = truncateExcerpt(summary, 2000);
  }

  return summary;
}

/**
 * Generates custom contextual recommendations based on specific event constraints, scale, location, budget, and timeline.
 */
function buildContextualRecommendations(
  event: EventPlanInput,
  template: EventTypeTemplate,
  refDate: Date
): string[] {
  const recommendations = [...template.recommendations];

  // 1. Guest Scale Dynamics
  const guestCount = event.guest_count && event.guest_count > 0 ? event.guest_count : 0;
  if (guestCount >= 200) {
    recommendations.push(
      `With ${guestCount.toLocaleString()} attendees anticipated, implement zoned registration and at least 3 distinct beverage stations to prevent bottlenecks.`
    );
  } else if (guestCount > 0 && guestCount <= 30) {
    recommendations.push(
      `For an intimate group of ${guestCount} guests, prioritize personalized hospitality touches and single-table seating arrangements.`
    );
  }

  // 2. Personal Styling & Theme Directives
  if (event.preferences && event.preferences.trim()) {
    const prefExcerpt = truncateExcerpt(event.preferences, 150);
    recommendations.push(
      `Incorporate organizer's custom styling directive: "${prefExcerpt}". Align floral, lighting, and decor vendors around this design palette.`
    );
  }

  // 3. Location & Venue Operational Guidance
  if (event.location && event.location.trim()) {
    const locLower = event.location.toLowerCase();
    const locExcerpt = truncateExcerpt(event.location, 60);
    if (
      locLower.includes("outdoor") ||
      locLower.includes("lawn") ||
      locLower.includes("garden") ||
      locLower.includes("beach") ||
      locLower.includes("park") ||
      locLower.includes("terrace") ||
      locLower.includes("farm")
    ) {
      recommendations.push(
        `For the outdoor venue at ${locExcerpt}, secure rain canopy/tenting options and confirm portable power generators for audio/lighting.`
      );
    } else if (
      locLower.includes("hall") ||
      locLower.includes("banquet") ||
      locLower.includes("hotel") ||
      locLower.includes("ballroom") ||
      locLower.includes("center")
    ) {
      recommendations.push(
        `Verify venue loading dock access hours, stage ceiling clearance, and outside catering guidelines at ${locExcerpt}.`
      );
    }
  }

  // 4. Budget-Tier Strategic Guidance
  const rawBudget = typeof event.budget === "number" ? event.budget : Number(event.budget) || 0;
  if (rawBudget >= 1_000_000) {
    recommendations.push(
      "With a premium budget ceiling, contract a dedicated day-of event coordinator and multi-camera live video coverage."
    );
  } else if (rawBudget > 0 && rawBudget < 150_000) {
    recommendations.push(
      "To optimize budget efficiency, prioritize high-impact focal points (stage and entry backdrop) and negotiate bundled vendor services."
    );
  }

  // 5. Timeline Urgency Guidance
  if (event.event_date) {
    const eventTime = new Date(event.event_date).getTime();
    if (!isNaN(eventTime)) {
      const daysUntil = Math.floor((eventTime - refDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= 30) {
        recommendations.push(
          `With only ${daysUntil} days until the event date, place urgent vendor contract deposits within 48 hours to secure availability.`
        );
      }
    }
  }

  // 6. Cultural and Dietary Protocols
  if (event.cultural_requirements && event.cultural_requirements.trim()) {
    const culturalExcerpt = truncateExcerpt(event.cultural_requirements, 200);
    recommendations.push(
      `Brief all culinary and stage partners on designated cultural and dietary protocols: "${culturalExcerpt}".`
    );
  }

  // 7. Venue Constraints
  if (event.constraints && event.constraints.trim()) {
    const constraintExcerpt = truncateExcerpt(event.constraints, 200);
    recommendations.push(
      `Ensure contractual vendor agreements strictly accommodate venue constraints: "${constraintExcerpt}".`
    );
  }

  // Schema limits recommendations to at most 10 items
  return recommendations.slice(0, 10);
}

/**
 * Main deterministic generator function.
 *
 * Produces a validated `AIPlanBlueprint` conforming strictly to `aiPlanBlueprintSchema`.
 */
export function generateEventPlan(
  event: EventPlanInput,
  options?: GeneratePlanOptions
): AIPlanBlueprint {
  const refDate = options?.referenceDate ?? new Date();
  const templateKey = normalizeEventType(event.event_type || "");
  const template = TEMPLATES[templateKey] || TEMPLATES.generic;

  // 1. High-level Summary & Themes (integrating user preferences into theme concepts)
  const summary = buildEventSummary(event, template);
  const userTheme = event.preferences?.trim()
    ? truncateExcerpt(`Custom Aesthetic — ${event.preferences.trim()}`, 200)
    : null;
  const themes = userTheme
    ? [userTheme, ...template.themes.filter((t) => t !== userTheme)].slice(0, 5)
    : template.themes.slice(0, 5);

  // 2. Schedule Milestones
  const scheduleMilestones: PlanMilestone[] = template.milestones.map((m) => ({
    title: m.title,
    timeframe: m.timeframe,
    description: m.description,
    suggested_date: computeMilestoneDate(event.event_date, m.daysBefore, refDate),
  }));

  // 3. Suggested Tasks
  const suggestedTasks: PlanSuggestedTask[] = template.tasks.map((t) => ({
    title: t.title,
    description: t.description,
    priority: t.priority,
    category: t.category,
    is_vendor_checklist: t.is_vendor_checklist,
    suggested_days_before: t.daysBefore,
  }));

  // 4. Proposed Budget Allocations
  const rawBudget = typeof event.budget === "number" ? event.budget : Number(event.budget) || 0;
  const budgetCeiling = Math.max(0, Math.min(rawBudget, 9_999_999_999.99));
  const proposedBudgetItems = allocateBudgetItems(budgetCeiling, template.budgetDistribution);

  // 5. Contextual Recommendations
  const keyRecommendations = buildContextualRecommendations(event, template, refDate);

  // 6. Metadata Provenance
  const metadata = {
    source: "deterministic" as const,
    model: "planora-rules-v1",
    generatedAt: refDate.toISOString(),
    promptSummary: `Deterministic blueprint synthesized for ${event.name.trim()} (${template.category}).`,
  };

  const rawBlueprint = {
    summary,
    themes,
    scheduleMilestones,
    suggestedTasks,
    proposedBudgetItems,
    keyRecommendations,
    metadata,
  };

  // Strictly validate through existing Zod schema before returning
  return aiPlanBlueprintSchema.parse(rawBlueprint);
}
