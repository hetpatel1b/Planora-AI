import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Cached singleton browser client instance.
 * Ensures a single client instance is shared across the entire browser runtime,
 * preventing duplicate event listeners, auth state race conditions, and excessive memory allocations.
 */
let browserClientInstance: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Creates or retrieves the singleton Supabase client for use in browser/client components.
 * Configured with persistent sessions, automatic token refresh, and URL session detection.
 * Manages authentication state in long-lived cookies automatically.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be defined."
    );
  }

  // In non-browser environments (SSR, static generation, or unit tests without window),
  // return a client instance without caching to prevent cross-request leakage.
  if (typeof window === "undefined") {
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      isSingleton: false,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  // In the browser, maintain a single client instance
  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      isSingleton: true,
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClientInstance;
}

/**
 * Test utility to reset the cached browser client between unit tests.
 * @internal
 */
export function resetBrowserClientInstanceForTesting() {
  browserClientInstance = undefined;
}
