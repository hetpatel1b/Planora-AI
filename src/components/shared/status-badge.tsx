import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  type StatusBadgeVariant,
  getStatusBadgeVariant,
  formatStatusLabel,
} from "@/lib/status-utils";

export type { StatusBadgeVariant };
export { getStatusBadgeVariant, formatStatusLabel };

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

