import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { LandingNavbar } from "./landing-navbar";

describe("LandingNavbar", () => {
  it("renders brand logo, skip-link, and core navigation links", () => {
    const html = renderToString(<LandingNavbar initialUser={null} />);
    expect(html).toContain("Skip to main content");
    expect(html).toContain('href="#main-content"');
    expect(html).toContain("planora-logo.png");
    expect(html).toContain('alt="Planora AI"');
    expect(html).toContain("Planora");
    expect(html).toContain("AI");
    expect(html).toContain("Live Platform");
    expect(html).toContain('href="#features"');
    expect(html).toContain('href="#preview"');
    expect(html).toContain('href="#workflow"');
    expect(html).toContain('href="#status"');
    expect(html).toContain('aria-label="Open navigation menu"');
    expect(html).toContain('aria-controls="mobile-navigation"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("renders unauthenticated auth controls when user is null", () => {
    const html = renderToString(<LandingNavbar initialUser={null} />);
    expect(html).toContain("Sign in");
    expect(html).toContain('href="/sign-in"');
    expect(html).toContain("Start planning");
  });

  it("renders authenticated dashboard controls when user is logged in", () => {
    const mockUser = { id: "user_test_999", email: "planner@planora.ai" };
    const html = renderToString(<LandingNavbar initialUser={mockUser} />);
    expect(html).toContain("Dashboard");
    expect(html).toContain('href="/dashboard"');
  });
});
