import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient, resetBrowserClientInstanceForTesting } from "./client";
import * as ssr from "@supabase/ssr";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(),
}));

describe("src/lib/supabase/client.ts", () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    resetBrowserClientInstanceForTesting();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://example-test.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb-publishable-key-xyz",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.window = originalWindow;
    resetBrowserClientInstanceForTesting();
  });

  it("throws descriptive error when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => createClient()).toThrow(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be defined."
    );
  });

  it("throws descriptive error when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(() => createClient()).toThrow(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be defined."
    );
  });

  it("creates a client with persistent session, autoRefreshToken, and singleton options in browser environment", () => {
    // Simulate browser window
    const mockClient = { auth: {} };
    vi.mocked(ssr.createBrowserClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof ssr.createBrowserClient>
    );

    global.window = {} as unknown as Window & typeof globalThis;

    const client1 = createClient();
    expect(ssr.createBrowserClient).toHaveBeenCalledTimes(1);
    expect(ssr.createBrowserClient).toHaveBeenCalledWith(
      "https://example-test.supabase.co",
      "sb-publishable-key-xyz",
      expect.objectContaining({
        isSingleton: true,
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        }),
      })
    );

    // Subsequent calls return the same singleton instance without re-instantiation
    const client2 = createClient();
    expect(ssr.createBrowserClient).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });

  it("creates non-cached instance without persistent cookies when window is undefined (SSR mode)", () => {
    delete (global as { window?: unknown }).window;

    const mockClientA = { id: "a" };
    const mockClientB = { id: "b" };
    vi.mocked(ssr.createBrowserClient)
      .mockReturnValueOnce(
        mockClientA as unknown as ReturnType<typeof ssr.createBrowserClient>
      )
      .mockReturnValueOnce(
        mockClientB as unknown as ReturnType<typeof ssr.createBrowserClient>
      );

    const client1 = createClient();
    const client2 = createClient();

    expect(ssr.createBrowserClient).toHaveBeenCalledTimes(2);
    expect(client1).not.toBe(client2);
    expect(ssr.createBrowserClient).toHaveBeenCalledWith(
      "https://example-test.supabase.co",
      "sb-publishable-key-xyz",
      expect.objectContaining({
        isSingleton: false,
        auth: expect.objectContaining({
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }),
      })
    );
  });
});

