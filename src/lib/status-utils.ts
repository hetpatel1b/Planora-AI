/**
 * Planora AI — Status Formatting & Badge Variant Utilities
 *
 * Deterministic helpers for mapping event and task status values
 * to human-readable display labels and shadcn badge variants.
 */

export type StatusBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

/**
 * Returns the appropriate shadcn badge variant for event or task status values.
 */
export function getStatusBadgeVariant(status?: string | null): StatusBadgeVariant {
  switch (status?.trim().toLowerCase()) {
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

/**
 * Formats a raw status key into a user-facing human-readable string.
 */
export function formatStatusLabel(status?: string | null): string {
  if (!status) return "";
  switch (status.trim().toLowerCase()) {
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

