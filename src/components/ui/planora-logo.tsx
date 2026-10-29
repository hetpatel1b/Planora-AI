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

export function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

