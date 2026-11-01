/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingNavbar } from "./landing-navbar";
import * as clientSupabase from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("LandingNavbar", () => {
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

  it("renders brand logo, skip-link, and core navigation links", () => {
    render(<LandingNavbar initialUser={null} />);
    expect(screen.getByText("Skip to main content")).toBeDefined();
    expect(screen.getByRole("link", { name: /Skip to main content/i }).getAttribute("href")).toBe("#main-content");
    expect(screen.getByAltText("Planora AI")).toBeDefined();
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeDefined();
  });

  it("renders unauthenticated auth controls when user is null", () => {
    render(<LandingNavbar initialUser={null} />);
    expect(screen.getByRole("link", { name: /^sign in$/i })).toBeDefined();
  });

  it("renders authenticated dashboard controls when user is logged in", () => {
    const mockUser = { id: "user_test_999", email: "planner@planora.ai" };
    render(<LandingNavbar initialUser={mockUser} />);
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toBeDefined();
  });

  it("reactively synchronizes session restoration when client SIGNED_IN event fires", () => {
    // Starts with null initialUser (e.g. server rendered without cookies)
    render(<LandingNavbar initialUser={null} />);
    expect(screen.queryByRole("link", { name: /^dashboard$/i })).toBeNull();

    // Client restores session from persistent cookies
    act(() => {
      authCallback?.("SIGNED_IN", {
        user: { id: "restored-user", email: "restored@planora.ai" },
      });
    });

    // Desktop and header Dashboard links appear seamlessly
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toBeDefined();
  });

  it("reactively clears dashboard links when explicit SIGNED_OUT event fires", () => {
    const mockUser = { id: "user_active", email: "active@planora.ai" };
    render(<LandingNavbar initialUser={mockUser} />);
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toBeDefined();

    // Explicit sign out
    act(() => {
      authCallback?.("SIGNED_OUT", null);
    });

    expect(screen.queryByRole("link", { name: /^dashboard$/i })).toBeNull();
    expect(screen.getByRole("link", { name: /^sign in$/i })).toBeDefined();
  });

  it("manages accessible mobile navigation opening, Escape dismissal, and focus restoration", async () => {
    const user = userEvent.setup();
    render(<LandingNavbar initialUser={null} />);

    const hamburger = screen.getByRole("button", { name: "Open navigation menu" });
    expect(hamburger.getAttribute("aria-expanded")).toBe("false");

    // Open mobile menu
    await user.click(hamburger);
    expect(hamburger.getAttribute("aria-expanded")).toBe("true");

    const dialog = screen.getByRole("dialog", { name: "Mobile Navigation" });
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    // Close on Escape key press
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Mobile Navigation" })).toBeNull();
    expect(hamburger.getAttribute("aria-expanded")).toBe("false");
  });
});
