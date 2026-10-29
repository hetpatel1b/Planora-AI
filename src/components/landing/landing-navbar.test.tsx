/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingNavbar } from "./landing-navbar";

describe("LandingNavbar", () => {
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
