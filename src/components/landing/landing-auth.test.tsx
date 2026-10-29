/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { render, screen, act } from "@testing-library/react";
import { LandingHeaderAuth } from "./landing-header-auth";
import { LandingHeroCta } from "./landing-hero-cta";
import * as clientSupabase from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("LandingHeaderAuth", () => {
  let authCallback: ((event: string, session: { user: { id: string; email: string } } | null) => void) | null = null;
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
    vi.mocked(clientSupabase.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn().mockImplementation((cb) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
        }),
      },
    } as unknown as ReturnType<typeof clientSupabase.createClient>);
  });

  describe("Server-Side Rendering (SSR)", () => {
    it("renders 'Sign in' link when user is unauthenticated", () => {
      const html = renderToString(<LandingHeaderAuth initialUser={null} />);
      expect(html).toContain("Sign in");
      expect(html).toContain('href="/sign-in"');
      expect(html).toContain('href="#preview"');
      expect(html).not.toContain('href="/dashboard"');
    });

    it("renders 'Dashboard' option instead of 'Sign in' when user is already signed in", () => {
      const mockUser = { id: "user_test_123", email: "planner@planora.ai" };
      const html = renderToString(<LandingHeaderAuth initialUser={mockUser} />);
      expect(html).toContain("Dashboard");
      expect(html).toContain('href="/dashboard"');
      expect(html).not.toContain("Sign in");
      expect(html).not.toContain('href="/sign-in"');
      expect(html).toContain('href="/dashboard/events/new"');
    });
  });

  describe("Client Hydration & Auth State Synchronization", () => {
    it("preserves server-rendered initialUser when client INITIAL_SESSION fires with null session", () => {
      const mockUser = { id: "user_test_123", email: "planner@planora.ai" };
      render(<LandingHeaderAuth initialUser={mockUser} />);

      // Simulate the exact Supabase SSR behavior: initial tick fires INITIAL_SESSION before async cookie extraction
      act(() => {
        authCallback?.("INITIAL_SESSION", null);
      });

      // Must NOT wipe out user to null; Dashboard link must remain present!
      expect(screen.getByRole("link", { name: /Open your dashboard/i })).toBeDefined();
      expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    });

    it("clears user session when SIGNED_OUT event is explicitly received", () => {
      const mockUser = { id: "user_test_123", email: "planner@planora.ai" };
      render(<LandingHeaderAuth initialUser={mockUser} />);

      // Dashboard should initially be visible
      expect(screen.getByRole("link", { name: /Open your dashboard/i })).toBeDefined();

      // Trigger sign out event
      act(() => {
        authCallback?.("SIGNED_OUT", null);
      });

      // Now "Sign in" should be visible
      expect(screen.getByRole("link", { name: /sign in/i })).toBeDefined();
      expect(screen.queryByRole("link", { name: /Open your dashboard/i })).toBeNull();
    });

    it("updates to authenticated state when SIGNED_IN event is received", () => {
      render(<LandingHeaderAuth initialUser={null} />);
      expect(screen.getByRole("link", { name: /sign in/i })).toBeDefined();

      // Trigger sign in event
      act(() => {
        authCallback?.("SIGNED_IN", {
          user: { id: "new-user-456", email: "new@planora.ai" },
        });
      });

      expect(screen.getByRole("link", { name: /Open your dashboard/i })).toBeDefined();
      expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    });
  });
});

describe("LandingHeroCta", () => {
  let authCallback: ((event: string, session: { user: { id: string; email: string } } | null) => void) | null = null;
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
    vi.mocked(clientSupabase.createClient).mockReturnValue({
      auth: {
        onAuthStateChange: vi.fn().mockImplementation((cb) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
        }),
      },
    } as unknown as ReturnType<typeof clientSupabase.createClient>);
  });

  describe("Server-Side Rendering (SSR)", () => {
    it("renders 'Start planning' targeting preview anchor when user is unauthenticated", () => {
      const html = renderToString(<LandingHeroCta initialUser={null} />);
      expect(html).toContain("Start planning");
      expect(html).toContain('href="#preview"');
      expect(html).not.toContain("Go to Dashboard");
    });

    it("renders 'Go to Dashboard' targeting /dashboard when user is already signed in", () => {
      const mockUser = { id: "user_test_123", email: "planner@planora.ai" };
      const html = renderToString(<LandingHeroCta initialUser={mockUser} />);
      expect(html).toContain("Go to Dashboard");
      expect(html).toContain('href="/dashboard"');
    });
  });

  describe("Client Hydration & Auth State Synchronization", () => {
    it("preserves 'Go to Dashboard' when client INITIAL_SESSION fires with null session", () => {
      const mockUser = { id: "user_test_123", email: "planner@planora.ai" };
      render(<LandingHeroCta initialUser={mockUser} />);

      act(() => {
        authCallback?.("INITIAL_SESSION", null);
      });

      expect(screen.getByRole("link", { name: /Go to Dashboard/i })).toBeDefined();
      expect(screen.queryByRole("link", { name: /^Start planning$/i })).toBeNull();
    });

    it("transitions from 'Go to Dashboard' to 'Start planning' on SIGNED_OUT event", () => {
      const mockUser = { id: "user_test_123", email: "planner@planora.ai" };
      render(<LandingHeroCta initialUser={mockUser} />);

      act(() => {
        authCallback?.("SIGNED_OUT", null);
      });

      expect(screen.getByRole("link", { name: /^Start planning$/i })).toBeDefined();
      expect(screen.queryByRole("link", { name: /Go to Dashboard/i })).toBeNull();
    });

    it("transitions from 'Start planning' to 'Go to Dashboard' on SIGNED_IN event", () => {
      render(<LandingHeroCta initialUser={null} />);

      act(() => {
        authCallback?.("SIGNED_IN", {
          user: { id: "signed-in-user", email: "user@planora.ai" },
        });
      });

      expect(screen.getByRole("link", { name: /Go to Dashboard/i })).toBeDefined();
      expect(screen.queryByRole("link", { name: /^Start planning$/i })).toBeNull();
    });
  });
});
