import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import * as serverSupabase from "@/lib/supabase/server";

describe("POST /auth/sign-out", () => {
  it("signs out current user and returns HTTP 303 redirect to /sign-in", async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      auth: {
        signOut: mockSignOut,
      },
    };

    vi.spyOn(serverSupabase, "createClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof serverSupabase.createClient>>
    );

    const request = new NextRequest("http://localhost:3000/auth/sign-out", {
      method: "POST",
    });

    const response = await POST(request);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/sign-in");
  });
});

