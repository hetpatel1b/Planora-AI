import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.ComponentProps<"label">;

function Label({ className, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 select-none",
        className
      )}
      {...props}
    />
  );
}

export { Label };
