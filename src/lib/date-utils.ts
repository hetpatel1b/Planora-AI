/**
 * Planora AI — Date Utilities
 * 
 * Provides safe timezone-stable formatting for event dates and statuses.
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
 * Formats currency values cleanly with standard INR (₹) formatting.
 * @deprecated Prefer importing directly from `@/lib/currency-utils`.
 */
export { formatCurrency } from "@/lib/currency-utils";

/**
 * Returns human-readable label for status values.
 */
export function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
    case "completed":
      return "success";
    case "in_progress":
      return "warning";
    case "cancelled":
      return "destructive";
    case "planning":
      return "default";
    case "draft":
    default:
      return "secondary";
  }
}

export function formatStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "planning":
      return "In Planning";
    case "confirmed":
      return "Confirmed";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
