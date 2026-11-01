import type { NextRequest } from "next/server";

export const CANONICAL_HOST = "planora-ai-b55w.vercel.app";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

/**
 * Known non-canonical production aliases that must be redirected
 * to the canonical production domain to ensure unified cookie scoping.
 */
export const NON_CANONICAL_HOSTS = new Set([
  "planora-ai-b55w-hetpatel1bs-projects.vercel.app",
]);

/**
 * Safely validates and extracts the normalized hostname from a NextRequest.
 */
export function getRequestHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const rawHost = forwardedHost || hostHeader || request.nextUrl.host || "";
  return rawHost.split(":")[0].trim().toLowerCase();
}

/**
 * Enforces the canonical production domain.
 * If the incoming request matches a known non-canonical production alias
 * (e.g. planora-ai-b55w-hetpatel1bs-projects.vercel.app), returns the safe
 * canonical URL preserving the pathname and query parameters.
 *
 * Returns null if:
 * - Request is already on the canonical domain (prevents redirect loops)
 * - Request is running locally (localhost / 127.0.0.1 / *.local)
 * - Request is on an unmapped preview or development branch
 */
export function getCanonicalRedirectUrl(request: NextRequest): URL | null {
  const hostname = getRequestHostname(request);

  // Never redirect localhost or local test suites
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  ) {
    return null;
  }

  // If already on canonical domain, no redirect needed (prevents loops)
  if (hostname === CANONICAL_HOST) {
    return null;
  }

  // Redirect known non-canonical production alias to canonical domain
  if (NON_CANONICAL_HOSTS.has(hostname)) {
    const url = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      CANONICAL_ORIGIN
    );
    return url;
  }

  return null;
}

/**
 * Safely validates and sanitizes redirection targets to prevent open-redirect vulnerabilities.
 * 
 * Rules:
 * - Must be a valid relative path starting with a single '/'
 * - Must not start with '//' or '/\' (protocol-relative URL bypasses)
 * - Must not contain control characters or URI schemes (e.g. javascript:, http:, https:)
 */
export function getSafeRedirectUrl(target?: string | null, fallback = "/dashboard"): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();

  // Reject control characters (prevents CRLF injection and HTTP response splitting)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  // Must begin with a single slash
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Block protocol-relative URLs (e.g. //evil.com, /\evil.com, ///evil.com, /\\evil.com)
  if (/^\/[/\\]/.test(trimmed)) {
    return fallback;
  }

  // Ensure there is no scheme before a slash (e.g. /javascript:...)
  // Check if colon appears before any query '?' or hash '#'
  const pathPart = trimmed.split(/[?#]/)[0];
  if (pathPart.includes(":")) {
    return fallback;
  }

  return trimmed;
}
