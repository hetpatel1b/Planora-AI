import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/validations/task";

export interface PriorityBadgeProps {
  priority: TaskPriority | string;
  className?: string;
}

/**
 * Standardized PriorityBadge component mapping task priority to visual badge variants.
 *
 * Mappings:
 * - "urgent" -> variant: "destructive", Label: "Urgent"
 * - "high"   -> variant: "warning",     Label: "High"
 * - "medium" -> variant: "default",     Label: "Medium"
 * - "low" / unexpected -> variant: "secondary", Label: "Low"
 */
export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const normalized = typeof priority === "string" ? priority.trim().toLowerCase() : "";

  switch (normalized) {
    case "urgent":
      return (
        <Badge variant="destructive" className={className}>
          Urgent
        </Badge>
      );
    case "high":
      return (
        <Badge variant="warning" className={className}>
          High
        </Badge>
      );
    case "medium":
      return (
        <Badge variant="default" className={className}>
          Medium
        </Badge>
      );
    case "low":
    default:
      return (
        <Badge variant="secondary" className={className}>
          Low
        </Badge>
      );
  }
}
