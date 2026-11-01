import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl, CANONICAL_HOST, NON_CANONICAL_HOSTS } from "@/lib/auth-utils";

/**
 * Supabase Auth Callback Route Handler.
 * Exchanges authorization code for a session token and redirects to the safe intended destination.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next =
    requestUrl.searchParams.get("next") ||
    requestUrl.searchParams.get("redirectTo");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Validate the destination using our open-redirect guard
  const safeDestination = getSafeRedirectUrl(next, "/dashboard");

  // Handle provider-level error (e.g. user canceled OAuth flow)
  if (error) {
    const errorRedirectUrl = new URL("/sign-in", request.url);
    errorRedirectUrl.searchParams.set(
      "error",
      errorDescription || "Authentication was canceled or encountered an issue."
    );
    return NextResponse.redirect(errorRedirectUrl);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError) {
        // Build safe absolute redirect URL, honoring forwarded proxy headers and enforcing canonical domain
        const forwardedHost = request.headers.get("x-forwarded-host");
        const hostHeader = request.headers.get("host");
        const effectiveHost = (forwardedHost || hostHeader || "")
          .split(":")[0]
          .trim()
          .toLowerCase();
        const targetHost = NON_CANONICAL_HOSTS.has(effectiveHost)
          ? CANONICAL_HOST
          : effectiveHost;

        const isLocalEnv = process.env.NODE_ENV === "development";

        if (!isLocalEnv && targetHost) {
          return NextResponse.redirect(
            new URL(safeDestination, `https://${targetHost}`)
          );
        }

        return NextResponse.redirect(new URL(safeDestination, request.url));
      }
    } catch {
      // In case of network or internal errors, fail gracefully without leaking details
    }
  }

  // If code exchange failed or no code was received
  const fallbackRedirect = new URL("/sign-in", request.url);
  fallbackRedirect.searchParams.set(
    "error",
    "Unable to verify authentication. Please try signing in again."
  );
  return NextResponse.redirect(fallbackRedirect);
}
