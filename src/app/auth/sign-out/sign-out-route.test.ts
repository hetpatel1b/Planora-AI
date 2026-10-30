import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import * as serverSupabase from "@/lib/supabase/server";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/mocks/supabase";

describe("POST /auth/sign-out", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabase = createMockSupabaseClient();
    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof serverSupabase.createClient>>
    );
  });

  it("signs out current user and returns HTTP 303 redirect to /sign-in", async () => {
    const request = new NextRequest("http://localhost:3000/auth/sign-out", {
      method: "POST",
    });

    const response = await POST(request);

    expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/sign-in");
  });

  it("signs out successfully when valid matching Origin is provided", async () => {
    const request = new NextRequest("http://localhost:3000/auth/sign-out", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    const response = await POST(request);
    expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(303);
  });

  it("rejects cross-origin POST with 403 Forbidden when Origin does not match (CSRF)", async () => {
    const request = new NextRequest("http://localhost:3000/auth/sign-out", {
      method: "POST",
      headers: { origin: "https://malicious-site.com" },
    });

    const response = await POST(request);
    expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toContain("CSRF");
  });

  it("rejects cross-origin POST with 403 Forbidden when Referer does not match", async () => {
    const request = new NextRequest("http://localhost:3000/auth/sign-out", {
      method: "POST",
      headers: { referer: "https://malicious-site.com/attack" },
    });

    const response = await POST(request);
    expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toContain("CSRF");
  });
});

