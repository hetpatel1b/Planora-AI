"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LandingUser } from "./landing-header-auth";

interface LandingHeroCtaProps {
  initialUser: LandingUser | null;
}

/**
 * Responsive Hero section CTA buttons for the Planora AI landing page.
 * Displays "Go to Dashboard" when authenticated, or "Start planning" when unauthenticated.
 */
export function LandingHeroCta({ initialUser }: LandingHeroCtaProps) {
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

  return (
    <div
      className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
      data-testid="landing-hero-cta"
    >
      {user ? (
        <Link
          href="/dashboard"
          className={buttonVariants({
            variant: "default",
            size: "lg",
            className:
              "w-full sm:w-auto bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-semibold px-6 py-2.5 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-violet-500 rounded-xl transition-all duration-150",
          })}
        >
          <LayoutDashboard className="size-4" aria-hidden="true" />
          <span>Go to Dashboard</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <a
          href="#preview"
          className={buttonVariants({
            variant: "default",
            size: "lg",
            className:
              "w-full sm:w-auto bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-semibold px-6 py-2.5 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-violet-500 rounded-xl transition-all duration-150",
          })}
        >
          <span>Start planning</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      )}
      <a
        href="#features"
        className={buttonVariants({
          variant: "outline",
          size: "lg",
          className:
            "w-full sm:w-auto border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800 px-6 py-2.5 font-medium rounded-xl shadow-xs hover:shadow-sm focus-visible:ring-2 focus-visible:ring-violet-500 transition-all duration-150",
        })}
      >
        Explore features
      </a>
    </div>
  );
}
