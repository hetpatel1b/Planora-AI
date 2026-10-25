import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { LandingHeaderAuth } from "./landing-header-auth";
import { LandingHeroCta } from "./landing-hero-cta";

describe("LandingHeaderAuth", () => {
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
    // Start planning links directly to new event builder for authenticated users
    expect(html).toContain('href="/dashboard/events/new"');
  });
});

describe("LandingHeroCta", () => {
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
