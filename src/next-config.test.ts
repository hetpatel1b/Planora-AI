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

  it("omits loopback endpoints from connect-src in pure production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    vi.stubEnv("PLAYWRIGHT_TEST_BASE_URL", "");
    const headerConfigs = await nextConfig.headers?.();
    const cspHeader = headerConfigs?.[0]?.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    const cspValue = cspHeader?.value ?? "";
    expect(cspValue).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
    expect(cspValue).not.toContain("127.0.0.1");
    expect(cspValue).not.toContain("localhost");
  });

  it("permits loopback endpoints in connect-src during development or CI for isolated test containers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "true");
    const headerConfigs = await nextConfig.headers?.();
    const cspHeader = headerConfigs?.[0]?.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    const cspValue = cspHeader?.value ?? "";
    expect(cspValue).toContain("http://127.0.0.1:*");
    expect(cspValue).toContain("http://localhost:*");
    expect(cspValue).toContain("ws://127.0.0.1:*");
    expect(cspValue).toContain("ws://localhost:*");
  });

  it("appends custom self-hosted NEXT_PUBLIC_SUPABASE_URL origin to connect-src", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CI", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.customdomain.org");
    const headerConfigs = await nextConfig.headers?.();
    const cspHeader = headerConfigs?.[0]?.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    const cspValue = cspHeader?.value ?? "";
    expect(cspValue).toContain("https://supabase.customdomain.org");
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
