"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface LandingUser {
  id: string;
  email?: string;
}

interface LandingHeaderAuthProps {
  initialUser: LandingUser | null;
}

/**
 * Responsive top navigation auth buttons for the Planora AI landing page.
 * Server-rendered with initialUser to eliminate layout shift, with real-time
 * client-side onAuthStateChange subscription to react immediately to login/logout.
 *
 * When authenticated: Displays "Dashboard" option instead of "Sign in", and
 * links "Start planning" to "/dashboard/events/new".
 * When unauthenticated: Displays "Sign in" and "Start planning" (preview anchor).
 */
export function LandingHeaderAuth({ initialUser }: LandingHeaderAuthProps) {
  const [user, setUser] = useState<LandingUser | null>(initialUser);
  const [prevInitialUser, setPrevInitialUser] = useState<LandingUser | null>(initialUser);

  // Sync state during render when server-provided initialUser changes (React 19 recommendation)
  if (initialUser !== prevInitialUser) {
    setPrevInitialUser(initialUser);
    setUser(initialUser);
  }

  useEffect(() => {
    try {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
          });
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // In case client Supabase initialization fails (e.g. mock test environment)
    }
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3" data-testid="landing-header-auth">
        <Link
          href="/dashboard"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className:
              "text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium hover:text-violet-600 dark:hover:text-violet-400 focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg",
          })}
          aria-label="Open your dashboard"
        >
          <LayoutDashboard className="size-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/dashboard/events/new"
          className={buttonVariants({
            variant: "default",
            size: "sm",
            className:
              "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium shadow-xs hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg",
          })}
        >
          Start planning
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3" data-testid="landing-header-auth">
      <Link
        href="/sign-in"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className:
            "text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 font-medium focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg",
        })}
      >
        Sign in
      </Link>
      <a
        href="#preview"
        className={buttonVariants({
          variant: "default",
          size: "sm",
          className:
            "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium shadow-xs hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg",
        })}
      >
        Start planning
      </a>
    </div>
  );
}
