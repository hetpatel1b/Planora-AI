import {
  getStatusBadgeVariant,
  formatStatusLabel,
} from "@/lib/status-utils";

/**
 * Planora AI — Date Utilities
 * 
 * Provides safe timezone-stable formatting for event dates, task due dates,
 * and date input conversions.
 */

/**
 * Formats an ISO event date string safely without timezone date shifts.
 * Always renders in UTC context so that calendar dates do not shift back a day
 * in negative UTC offsets (e.g., UTC-5/UTC-8).
 */
export function formatEventDate(dateString?: string | null): string {
  if (!dateString) return "Date to be determined";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "Invalid date";
  }
}

/**
 * Extracts a YYYY-MM-DD string from an ISO timestamp for HTML <input type="date">.
 */
export function toDateInputValue(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

/**
 * Converts an HTML <input type="date"> value (YYYY-MM-DD) to a timezone-safe ISO string.
 * Uses 12:00:00 UTC (noon UTC) so that in every timezone across the world,
 * the timestamp falls on the identical calendar day.
 */
export function dateInputToIsoString(dateInput?: string | null): string | null {
  if (!dateInput || typeof dateInput !== "string" || !dateInput.trim()) {
    return null;
  }
  const trimmed = dateInput.trim();
  // If already full ISO, return it
  if (trimmed.includes("T")) {
    return trimmed;
  }
  // If YYYY-MM-DD, anchor to noon UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00.000Z`;
  }
  return trimmed;
}

/**
 * Evaluates whether a checklist task is overdue relative to a reference timestamp.
 *
 * Invariants:
 * - Returns false if dueDateStr is missing, null, undefined, or empty.
 * - Returns false if status is "completed" or "cancelled".
 * - Returns false if dueDateStr is an invalid/unparseable date string.
 * - Returns true if the due date timestamp is strictly less than the reference timestamp.
 */
export function isTaskOverdue(
  dueDateStr?: string | null,
  status?: string | null,
  nowMs: number = Date.now()
): boolean {
  if (!dueDateStr || typeof dueDateStr !== "string" || !dueDateStr.trim()) {
    return false;
  }
  const normalizedStatus = status?.trim().toLowerCase();
  if (normalizedStatus === "completed" || normalizedStatus === "cancelled") {
    return false;
  }
  const due = new Date(dueDateStr).getTime();
  return !isNaN(due) && due < nowMs;
}

/**
 * Calculates a task due date relative to an event date and daysBefore offset.
 *
 * Invariants:
 * - Returns null if eventDateStr is missing, null, undefined, or empty.
 * - Returns null if daysBefore is null or undefined.
 * - Returns null if eventDateStr cannot be parsed as a valid timestamp.
 * - Restricts calculated year to 2000..2100 bounds to prevent epoch overflow.
 * - Returns an ISO 8601 timestamp string.
 */
export function calculateTaskDueDate(
  eventDateStr: string | null | undefined,
  daysBefore: number | null | undefined
): string | null {
  if (!eventDateStr || daysBefore === null || daysBefore === undefined) {
    return null;
  }
  const eventTime = new Date(eventDateStr).getTime();
  if (isNaN(eventTime)) return null;

  const dueTime = eventTime - daysBefore * 24 * 60 * 60 * 1000;
  const dueDate = new Date(dueTime);
  const year = dueDate.getFullYear();
  if (year < 2000 || year > 2100) return null;

  return dueDate.toISOString();
}

/**
 * Status badge formatting utilities.
 * @see "@/components/shared/status-badge" for canonical implementation and component.
 */
export { getStatusBadgeVariant, formatStatusLabel };
