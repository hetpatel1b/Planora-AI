import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { proxy, createRedirectResponse } from "@/proxy";
import * as ssr from "@supabase/ssr";
import { createClient as createBrowserClient, resetBrowserClientInstanceForTesting } from "@/lib/supabase/client";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
  createBrowserClient: vi.fn(),
}));

describe("Authentication Persistence Comprehensive Verification (Scenarios 1-10)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    resetBrowserClientInstanceForTesting();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
    };
  });

  // TEST 1 — SIGN-IN
  it("TEST 1 — SIGN-IN: Browser client is initialized with persistent session and automatic refresh enabled", () => {
    const mockClient = { auth: { signInWithPassword: vi.fn() } };
    vi.mocked(ssr.createBrowserClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof ssr.createBrowserClient>
    );
    global.window = {} as unknown as Window & typeof globalThis;

    const client = createBrowserClient();
    expect(ssr.createBrowserClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        isSingleton: true,
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        }),
      })
    );
    expect(client).toBe(mockClient);
  });

  // TEST 2 — SESSION RESTORATION
  it("TEST 2 — SESSION RESTORATION: Proxy restores valid authenticated session from persistent cookies", async () => {
    const mockUser = { id: "persisted-user-123", email: "persisted@planora.ai" };
    vi.mocked(ssr.createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof ssr.createServerClient>);

    const request = new NextRequest("https://example.com/dashboard", {
      headers: {
        cookie: "sb-test-project-auth-token=valid-persisted-jwt",
      },
    });

    const response = await proxy(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  // TEST 3 — PAGE RELOAD
  it("TEST 3 — PAGE RELOAD: Reloading protected route does not redirect a valid authenticated user", async () => {
    const mockUser = { id: "reload-user-456", email: "reloader@planora.ai" };
    vi.mocked(ssr.createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof ssr.createServerClient>);

    const request = new NextRequest("https://example.com/dashboard/events/new", {
      headers: {
        cookie: "sb-test-project-auth-token=active-token",
      },
    });

    // First visit
    const response1 = await proxy(request);
    expect(response1.status).toBe(200);

    // Page reload simulation
    const reloadRequest = new NextRequest("https://example.com/dashboard/events/new", {
      headers: {
        cookie: "sb-test-project-auth-token=active-token",
      },
    });
    const response2 = await proxy(reloadRequest);
    expect(response2.status).toBe(200);
    expect(response2.headers.get("location")).toBeNull();
  });

  // TEST 4 — BROWSER REOPEN
  it("TEST 4 — BROWSER REOPEN: Singleton browser client maintains session across component lifecycles", () => {
    const mockClient = { auth: { getSession: vi.fn() } };
    vi.mocked(ssr.createBrowserClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof ssr.createBrowserClient>
    );
    global.window = {} as unknown as Window & typeof globalThis;

    // Component A creates client
    const instanceA = createBrowserClient();
    // Component B creates client
    const instanceB = createBrowserClient();

    // Must be identical singleton instance
    expect(instanceA).toBe(instanceB);
    expect(ssr.createBrowserClient).toHaveBeenCalledTimes(1);
  });

  // TEST 5 — SESSION EXPIRATION
  it("TEST 5 — SESSION EXPIRATION: Expired/unauthenticated session on protected route redirects to /sign-in", async () => {
    vi.mocked(ssr.createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "JWT expired" },
        }),
      },
    } as unknown as ReturnType<typeof ssr.createServerClient>);

    const request = new NextRequest("https://example.com/dashboard/events/test-id", {
      headers: {
        cookie: "sb-test-project-auth-token=expired-token",
      },
    });

    const response = await proxy(request);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/sign-in");
    expect(location).toContain("redirectTo=%2Fdashboard%2Fevents%2Ftest-id");
  });

  // TEST 6 — EXPLICIT SIGN-OUT
  it("TEST 6 — EXPLICIT SIGN-OUT: After signing out and cookies cleared, accessing dashboard redirects to /sign-in", async () => {
    const request = new NextRequest("https://example.com/dashboard");
    // No cookies attached (simulating sign-out clearance)
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in");
  });

  // TEST 7 — PROTECTED ROUTES
  it("TEST 7 — PROTECTED ROUTES: All /dashboard nested paths require authentication", async () => {
    const protectedPaths = [
      "/dashboard",
      "/dashboard/events/new",
      "/dashboard/events/abc-123",
      "/dashboard/events/abc-123/edit",
      "/dashboard/events/abc-123/export/pdf",
    ];

    for (const path of protectedPaths) {
      const request = new NextRequest(`https://example.com${path}`);
      const response = await proxy(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/sign-in");
    }
  });

  // TEST 8 — SESSION REFRESH
  it("TEST 8 — SESSION REFRESH: Token rotation preserves new cookies on request headers and response", async () => {
    let capturedCookies: Array<{ name: string; value: string; options?: unknown }> = [];

    vi.mocked(ssr.createServerClient).mockImplementation((_url, _key, options) => {
      const cookieHandler = options?.cookies as unknown as {
        setAll: (cookies: Array<{ name: string; value: string; options?: unknown }>) => void;
      };
      return {
        auth: {
          getUser: vi.fn().mockImplementation(async () => {
            // Simulate refresh token rotation during getUser
            capturedCookies = [
              {
                name: "sb-test-project-auth-token",
                value: "newly-rotated-access-token",
                options: { path: "/", maxAge: 3600 * 24 * 400 },
              },
            ];
            cookieHandler.setAll(capturedCookies);
            return {
              data: { user: { id: "refreshed-user-id", email: "user@planora.ai" } },
              error: null,
            };
          }),
        },
      } as unknown as ReturnType<typeof ssr.createServerClient>;
    });

    const request = new NextRequest("https://example.com/dashboard", {
      headers: {
        cookie: "sb-test-project-auth-token=old-expiring-token",
      },
    });

    const response = await proxy(request);
    expect(response.status).toBe(200);

    // Verify response carries the rotated token cookie
    const setCookie = response.cookies.get("sb-test-project-auth-token");
    expect(setCookie).toBeDefined();
    expect(setCookie?.value).toBe("newly-rotated-access-token");
  });

  // TEST 9 — AUTHENTICATION INITIALIZATION
  it("TEST 9 — AUTHENTICATION INITIALIZATION: createRedirectResponse copies all cookies from source response", () => {
    const sourceResponse = NextResponse.next();
    sourceResponse.cookies.set("sb-test-auth-token", "active-session", { path: "/" });

    const redirect = createRedirectResponse("https://example.com/dashboard", sourceResponse);
    expect(redirect.status).toBe(307);
    expect(redirect.cookies.get("sb-test-auth-token")?.value).toBe("active-session");
  });

  // TEST 10 — EXISTING FEATURES
  it("TEST 10 — EXISTING FEATURES: Authenticated user visiting /sign-in is redirected to /dashboard", async () => {
    const mockUser = { id: "active-user-789", email: "active@planora.ai" };
    vi.mocked(ssr.createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof ssr.createServerClient>);

    const request = new NextRequest("https://example.com/sign-in", {
      headers: {
        cookie: "sb-test-project-auth-token=active-token",
      },
    });

    const response = await proxy(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/dashboard");
  });
});
