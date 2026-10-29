import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { proxy, createRedirectResponse } from "./proxy";
import * as ssr from "@supabase/ssr";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("src/proxy.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
    };
  });

  describe("createRedirectResponse", () => {
    it("copies all cookies from source response to the redirect response", () => {
      const sourceResponse = NextResponse.next();
      sourceResponse.cookies.set("sb-test-auth-token", "jwt-token-value", {
        path: "/",
        httpOnly: true,
        maxAge: 3600,
        sameSite: "lax",
      });
      sourceResponse.cookies.set("sb-test-auth-token.1", "jwt-chunk-value", {
        path: "/",
        httpOnly: true,
      });

      const redirectRes = createRedirectResponse(
        new URL("https://example.com/dashboard"),
        sourceResponse
      );

      expect(redirectRes.status).toBe(307);
      expect(redirectRes.headers.get("location")).toBe("https://example.com/dashboard");

      const cookies = redirectRes.cookies.getAll();
      expect(cookies).toHaveLength(2);
      expect(cookies.find((c) => c.name === "sb-test-auth-token")?.value).toBe("jwt-token-value");
      expect(cookies.find((c) => c.name === "sb-test-auth-token.1")?.value).toBe("jwt-chunk-value");
    });
  });

  describe("proxy router enforcement & session persistence", () => {
    it("bypasses Supabase identity check on unauthenticated public routes without session cookies", async () => {
      const request = new NextRequest("https://example.com/");
      const response = await proxy(request);

      expect(ssr.createServerClient).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("redirects unauthenticated user accessing /dashboard to /sign-in with redirectTo param", async () => {
      const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
      vi.mocked(ssr.createServerClient).mockReturnValue({
        auth: { getUser: mockGetUser },
      } as unknown as ReturnType<typeof ssr.createServerClient>);

      const request = new NextRequest("https://example.com/dashboard/events");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/sign-in");
      expect(location).toContain("redirectTo=%2Fdashboard%2Fevents");
    });

    it("redirects authenticated user accessing /sign-in to /dashboard and preserves refreshed session cookies", async () => {
      let cookieCapture: { setAll: (cookies: Array<{ name: string; value: string; options?: unknown }>) => void } | null = null;

      vi.mocked(ssr.createServerClient).mockImplementation((_url, _key, options) => {
        cookieCapture = options?.cookies as unknown as typeof cookieCapture;
        return {
          auth: {
            getUser: vi.fn().mockImplementation(async () => {
              // Simulate token refresh triggered during getUser()
              cookieCapture?.setAll([
                {
                  name: "sb-test-auth-token",
                  value: "new-refreshed-jwt",
                  options: { path: "/", httpOnly: true, maxAge: 7200 },
                },
              ]);
              return {
                data: { user: { id: "user-123", email: "planner@planora.ai" } },
                error: null,
              };
            }),
          },
        } as unknown as ReturnType<typeof ssr.createServerClient>;
      });

      const request = new NextRequest("https://example.com/sign-in", {
        headers: {
          cookie: "sb-test-auth-token=old-stale-jwt",
        },
      });

      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://example.com/dashboard");

      // Verify the rotated refresh token cookie was preserved on redirect!
      const refreshedCookie = response.cookies.get("sb-test-auth-token");
      expect(refreshedCookie).toBeDefined();
      expect(refreshedCookie?.value).toBe("new-refreshed-jwt");
    });

    it("redirects authenticated user accessing /sign-up to /dashboard", async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "planner@planora.ai" } },
        error: null,
      });
      vi.mocked(ssr.createServerClient).mockReturnValue({
        auth: { getUser: mockGetUser },
      } as unknown as ReturnType<typeof ssr.createServerClient>);

      const request = new NextRequest("https://example.com/sign-up", {
        headers: {
          cookie: "sb-test-auth-token=active-token",
        },
      });

      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://example.com/dashboard");
    });

    it("allows authenticated user to access /dashboard", async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "planner@planora.ai" } },
        error: null,
      });
      vi.mocked(ssr.createServerClient).mockReturnValue({
        auth: { getUser: mockGetUser },
      } as unknown as ReturnType<typeof ssr.createServerClient>);

      const request = new NextRequest("https://example.com/dashboard", {
        headers: {
          cookie: "sb-test-auth-token=active-token",
        },
      });

      const response = await proxy(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("identifies chunked Supabase auth cookies (e.g. sb-*-auth-token.0) on landing page and verifies identity", async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: "user-123", email: "planner@planora.ai" } },
        error: null,
      });
      vi.mocked(ssr.createServerClient).mockReturnValue({
        auth: { getUser: mockGetUser },
      } as unknown as ReturnType<typeof ssr.createServerClient>);

      const request = new NextRequest("https://example.com/", {
        headers: {
          cookie: "sb-projectref-auth-token.0=chunk0; sb-projectref-auth-token.1=chunk1",
        },
      });

      const response = await proxy(request);

      expect(ssr.createServerClient).toHaveBeenCalled();
      expect(mockGetUser).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });
});
