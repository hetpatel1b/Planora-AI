import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Creates a redirect response preserving all cookies set on the source response.
 * This prevents dropped Supabase auth cookies (such as rotated refresh tokens)
 * when redirecting between public and protected routes.
 */
export function createRedirectResponse(
  url: URL | string,
  sourceResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

/**
 * Next.js 16 Proxy convention (renamed from middleware).
 * Handles Supabase SSR session token refreshes and protects authenticated routes.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthRoute = pathname === "/sign-in" || pathname === "/sign-up";

  // Check if any Supabase session cookie is present (standard or chunked)
  const hasAuthCookie = request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") &&
        (c.name.endsWith("-auth-token") || c.name.includes("-auth-token."))
    );

  // If visiting an unauthenticated public route without session cookies,
  // skip the external GoTrue network roundtrip.
  if (!isDashboardRoute && !isAuthRoute && !hasAuthCookie) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        const prevCookies = response.cookies.getAll();
        response = NextResponse.next({
          request,
        });
        prevCookies.forEach((c) => response.cookies.set(c));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
      },
    },
  });

  // Server-verified identity check using getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /dashboard and any nested routes
  if (isDashboardRoute) {
    if (!user) {
      const redirectUrl = new URL("/sign-in", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return createRedirectResponse(redirectUrl, response);
    }
  }

  // Redirect authenticated users trying to access sign-in or sign-up
  if (isAuthRoute && user) {
    return createRedirectResponse(new URL("/dashboard", request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
