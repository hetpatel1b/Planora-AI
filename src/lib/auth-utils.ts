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
