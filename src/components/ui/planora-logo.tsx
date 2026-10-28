import Image from "next/image";
import { cn } from "@/lib/utils";

interface PlanoraLogoProps {
  /**
   * Logo dimension in pixels, or a preset string ('sm' = 28px, 'md' = 36px, 'lg' = 42px).
   * Default is 38px matching the required desktop navbar scale.
   */
  size?: number | "sm" | "md" | "lg";
  /**
   * Whether to render the brand wordmark ("Planora") and "AI" badge beside the logo mark.
   * Default is false (icon mark only).
   */
  showWordmark?: boolean;
  /**
   * High-priority image loading flag for above-the-fold brand elements like the navbar.
   */
  priority?: boolean;
  /**
   * Optional CSS classes for the root container (or image if wordmark is hidden).
   */
  className?: string;
  /**
   * Optional CSS classes applied directly to the image element.
   */
  iconClassName?: string;
}

export function PlanoraLogo({
  size = 38,
  showWordmark = false,
  priority = true,
  className,
  iconClassName,
}: PlanoraLogoProps) {
  let dimension = 38;
  if (typeof size === "number") {
    dimension = size;
  } else if (size === "sm") {
    dimension = 28;
  } else if (size === "md") {
    dimension = 36;
  } else if (size === "lg") {
    dimension = 42;
  }

  const logoImage = (
    <Image
      src="/planora-logo.png"
      alt={showWordmark ? "" : "Planora AI"}
      width={dimension}
      height={dimension}
      priority={priority}
      className={cn(
        "aspect-square rounded-xl object-contain shrink-0 transition-transform duration-200 group-hover:scale-105",
        iconClassName
      )}
    />
  );

  if (!showWordmark) {
    return <span className={cn("inline-flex items-center", className)}>{logoImage}</span>;
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {logoImage}
      <span className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
        Planora
      </span>
      <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 py-0.5 text-[11px] font-black tracking-wider text-white shadow-2xs">
        AI
      </span>
    </div>
  );
}

