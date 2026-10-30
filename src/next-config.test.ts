import { describe, it, expect, afterEach } from "vitest";
import { vi } from "vitest";
import nextConfig from "../next.config";

describe("next.config.ts security headers and CSP", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("omits 'unsafe-eval' from Content-Security-Policy script-src in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const headerConfigs = await nextConfig.headers?.();
    expect(headerConfigs).toBeDefined();

    const rootConfig = headerConfigs?.find((h) => h.source === "/:path*");
    expect(rootConfig).toBeDefined();

    const cspHeader = rootConfig?.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    expect(cspHeader).toBeDefined();

    const cspValue = cspHeader?.value ?? "";
    expect(cspValue).toContain("script-src 'self' 'unsafe-inline'");
    expect(cspValue).not.toContain("'unsafe-eval'");
  });

  it("permits 'unsafe-eval' in Content-Security-Policy script-src during development for Turbopack tooling", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const headerConfigs = await nextConfig.headers?.();
    expect(headerConfigs).toBeDefined();

    const rootConfig = headerConfigs?.find((h) => h.source === "/:path*");
    expect(rootConfig).toBeDefined();

    const cspHeader = rootConfig?.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    expect(cspHeader).toBeDefined();

    const cspValue = cspHeader?.value ?? "";
    expect(cspValue).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  });

  it("preserves all required baseline security headers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const headerConfigs = await nextConfig.headers?.();
    const headers = headerConfigs?.[0]?.headers ?? [];

    const headerMap = new Map(headers.map((h) => [h.key, h.value]));

    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(headerMap.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains; preload");
    expect(headerMap.get("X-DNS-Prefetch-Control")).toBe("on");
    expect(headerMap.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headerMap.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(headerMap.has("Content-Security-Policy")).toBe(true);
  });
});
