import * as React from "react";
import { Badge } from "@/components/ui/badge";

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

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Standardized StatusBadge component rendering a unified status badge.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} className={className}>
      {formatStatusLabel(status)}
    </Badge>
  );
}

