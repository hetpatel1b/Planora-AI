import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  getSafeRedirectUrl,
  getRequestHostname,
  getCanonicalRedirectUrl,
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  NON_CANONICAL_HOSTS,
} from "./auth-utils";

describe("auth-utils: canonical domain enforcement", () => {
  it("exports valid canonical domain constants", () => {
    expect(CANONICAL_HOST).toBe("planora-ai-b55w.vercel.app");
    expect(CANONICAL_ORIGIN).toBe("https://planora-ai-b55w.vercel.app");
    expect(NON_CANONICAL_HOSTS.has("planora-ai-b55w-hetpatel1bs-projects.vercel.app")).toBe(true);
  });

  describe("getRequestHostname", () => {
    it("extracts hostname from x-forwarded-host with port stripping", () => {
      const req = new NextRequest("http://localhost:3000/dashboard", {
        headers: { "x-forwarded-host": "planora-ai-b55w.vercel.app:443" },
      });
      expect(getRequestHostname(req)).toBe("planora-ai-b55w.vercel.app");
    });

    it("falls back to host header if x-forwarded-host is missing", () => {
      const req = new NextRequest("http://localhost:3000/dashboard", {
        headers: { host: "planora-ai-b55w-hetpatel1bs-projects.vercel.app" },
      });
      expect(getRequestHostname(req)).toBe("planora-ai-b55w-hetpatel1bs-projects.vercel.app");
    });

    it("falls back to nextUrl.host if headers are absent", () => {
      const req = new NextRequest("https://planora-ai-b55w.vercel.app/");
      expect(getRequestHostname(req)).toBe("planora-ai-b55w.vercel.app");
    });
  });

  describe("getCanonicalRedirectUrl", () => {
    it("redirects non-canonical production alias to canonical domain preserving path and query", () => {
      const req = new NextRequest(
        "https://planora-ai-b55w-hetpatel1bs-projects.vercel.app/dashboard/events?status=active&view=grid",
        {
          headers: {
            host: "planora-ai-b55w-hetpatel1bs-projects.vercel.app",
          },
        }
      );

      const redirectUrl = getCanonicalRedirectUrl(req);
      expect(redirectUrl).not.toBeNull();
      expect(redirectUrl?.toString()).toBe(
        "https://planora-ai-b55w.vercel.app/dashboard/events?status=active&view=grid"
      );
    });

    it("returns null if already on canonical domain (prevents redirect loop)", () => {
      const req = new NextRequest("https://planora-ai-b55w.vercel.app/dashboard", {
        headers: {
          host: "planora-ai-b55w.vercel.app",
        },
      });

      expect(getCanonicalRedirectUrl(req)).toBeNull();
    });

    it("returns null for localhost, 127.0.0.1, and local development hostnames", () => {
      const reqLocalhost = new NextRequest("http://localhost:3000/");
      expect(getCanonicalRedirectUrl(reqLocalhost)).toBeNull();

      const reqLoopback = new NextRequest("http://127.0.0.1:3000/sign-in");
      expect(getCanonicalRedirectUrl(reqLoopback)).toBeNull();

      const reqPlanoraLocal = new NextRequest("http://planora.local:3000/", {
        headers: { host: "planora.local:3000" },
      });
      expect(getCanonicalRedirectUrl(reqPlanoraLocal)).toBeNull();
    });

    it("returns null for preview branches or unlisted domains", () => {
      const reqPreview = new NextRequest("https://planora-ai-git-feature-hetpatel1bs-projects.vercel.app/", {
        headers: { host: "planora-ai-git-feature-hetpatel1bs-projects.vercel.app" },
      });
      expect(getCanonicalRedirectUrl(reqPreview)).toBeNull();
    });
  });
});

describe("auth-utils: getSafeRedirectUrl", () => {
  it("allows safe internal relative paths", () => {
    expect(getSafeRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/events/123")).toBe("/events/123");
    expect(getSafeRedirectUrl("/profile?tab=settings#account")).toBe("/profile?tab=settings#account");
  });

  it("falls back to default fallback (/dashboard) when target is empty, null, or undefined", () => {
    expect(getSafeRedirectUrl(null)).toBe("/dashboard");
    expect(getSafeRedirectUrl(undefined)).toBe("/dashboard");
    expect(getSafeRedirectUrl("")).toBe("/dashboard");
    expect(getSafeRedirectUrl("   ")).toBe("/dashboard");
  });

  it("respects custom fallback", () => {
    expect(getSafeRedirectUrl(null, "/welcome")).toBe("/welcome");
    expect(getSafeRedirectUrl("https://evil.com", "/login")).toBe("/login");
  });

  it("blocks open redirect attempts with absolute URLs", () => {
    expect(getSafeRedirectUrl("https://attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("http://attacker.com")).toBe("/dashboard");
  });

  it("blocks protocol-relative URL bypasses (// or /\\)", () => {
    expect(getSafeRedirectUrl("//attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/\\attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/\\\\attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("///attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/\\/attacker.com")).toBe("/dashboard");
  });

  it("blocks control characters and CRLF injection attempts", () => {
    expect(getSafeRedirectUrl("/dashboard\r\nLocation: https://evil.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/dashboard\nSet-Cookie: evil=1")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/page\0evil")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/tab\tevil")).toBe("/dashboard");
  });

  it("blocks embedded URI schemes before query or hash (e.g. javascript:)", () => {
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/javascript:alert(1)")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/login:path")).toBe("/dashboard");
  });

  it("permits colons in query parameters and hash fragments", () => {
    expect(getSafeRedirectUrl("/search?filter=time:1200")).toBe("/search?filter=time:1200");
    expect(getSafeRedirectUrl("/page#section:intro")).toBe("/page#section:intro");
  });
});
