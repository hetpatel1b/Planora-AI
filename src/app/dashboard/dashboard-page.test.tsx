import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import DashboardPage from "./page";
import type { EventRow } from "@/lib/validations/event";

// Mock Supabase server helper
const mockGetAuthenticatedUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

// Mock listEvents action
const mockListEvents = vi.fn();
vi.mock("@/lib/actions/events", () => ({
  listEvents: () => mockListEvents(),
  deleteEventAction: vi.fn(),
}));

// Mock redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock PlanoraLogo
vi.mock("@/components/ui/planora-logo", () => ({
  PlanoraLogo: () => <div data-testid="planora-logo" />,
}));

describe("DashboardPage Server Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: "usr_lead_planner",
    email: "lead.planner@globalcorp.io",
    last_sign_in_at: "2026-10-28T14:30:00.000Z",
  };

  const sampleEvents: EventRow[] = [
    {
      id: "evt-001",
      user_id: "usr_lead_planner",
      name: "Global Executive Strategy Summit",
      event_type: "Conference",
      status: "confirmed",
      event_date: "2027-04-15T09:00:00.000Z",
      location: "San Francisco Convention Hall",
      guest_count: 500,
      budget: 150000,
      preferences: "Strict security, livestreaming setup",
      constraints: null,
      cultural_requirements: null,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "evt-002",
      user_id: "usr_lead_planner",
      name: "Annual Product Launch Celebration",
      event_type: "Social",
      status: "planning",
      event_date: "2027-06-20T18:00:00.000Z",
      location: "Metropolitan Pavilion, NYC",
      guest_count: 350,
      budget: 85000,
      preferences: "DJ and staging, premium catering",
      constraints: "Noise curfew 11 PM",
      cultural_requirements: null,
      created_at: "2026-10-10T10:00:00.000Z",
      updated_at: "2026-10-10T10:00:00.000Z",
    },
  ];

  it("redirects unauthenticated users to /sign-in", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: null } });

    await expect(DashboardPage()).rejects.toThrow("REDIRECT:/sign-in");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("renders authenticated header with user pill, initial avatar, and sign out button", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });
    mockListEvents.mockResolvedValue({ success: true, data: sampleEvents });

    const element = await DashboardPage();
    const html = renderToString(element);

    expect(html).toContain("Planora");
    expect(html).toContain("AI");
    expect(html).toContain("Workspace Dashboard");
    expect(html).toContain("Back to Landing");
    expect(html).toContain("lead.planner@globalcorp.io");
    expect(html).toContain("Signed in as: lead.planner@globalcorp.io");
    expect(html).toContain("Sign out");
    expect(html).toContain("aria-label=\"Sign out of your account\"");
  });

  it("renders 4 portfolio metrics with accurate values and labels", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });
    mockListEvents.mockResolvedValue({ success: true, data: sampleEvents });

    const element = await DashboardPage();
    const html = renderToString(element);

    // Total Events: 2
    expect(html).toContain("Total Events");
    expect(html).toContain("2");

    // Allocated Budget: ₹150,000 + ₹85,000 = ₹2,35,000
    expect(html).toContain("Allocated Budget");
    expect(html).toContain("₹2,35,000");

    // Planned Attendees: 500 + 350 = 850
    expect(html).toContain("Planned Attendees");
    expect(html).toContain("850");

    // Last Account Activity (not misleading "Session Verified")
    expect(html).toContain("Last Account Activity");
  });

  it("consolidates primary CTA so 'Create New Event' appears only once in section header when events exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });
    mockListEvents.mockResolvedValue({ success: true, data: sampleEvents });

    const element = await DashboardPage();
    const html = renderToString(element);

    // Matches "Create New Event" occurrences
    const matches = html.match(/Create New Event/g);
    expect(matches).not.toBeNull();
    // Exactly 1 occurrence on the page when events exist
    expect(matches?.length).toBe(1);

    // Event cards rendered
    expect(html).toContain("Global Executive Strategy Summit");
    expect(html).toContain("Annual Product Launch Celebration");
  });

  it("renders EmptyEvents state when user has 0 events", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });
    mockListEvents.mockResolvedValue({ success: true, data: [] });

    const element = await DashboardPage();
    const html = renderToString(element);

    expect(html).toContain("No Events in Workspace");
    expect(html).toContain("Create Your First Event");
    expect(html).toContain("Supported Event Classifications");
  });

  it("renders error alert banner when database fetch fails", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });
    mockListEvents.mockResolvedValue({
      success: false,
      error: "PostgreSQL connection pool exhausted. Try again shortly.",
    });

    const element = await DashboardPage();
    const html = renderToString(element);

    expect(html).toContain('role="alert"');
    expect(html).toContain("PostgreSQL connection pool exhausted. Try again shortly.");
  });

  it("renders updated live capability callout without obsolete phase numbering", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });
    mockListEvents.mockResolvedValue({ success: true, data: sampleEvents });

    const element = await DashboardPage();
    const html = renderToString(element);

    expect(html).toContain("Integrated Event Intelligence Platform");
    expect(html).toContain("Live Intelligent Planning Tools Activated");
    expect(html).toContain("AI Blueprint Synthesis");
    expect(html).toContain("Integer-Cent Budget Variance");
    expect(html).toContain("Data Export (CSV &amp; JSON)");
    expect(html).not.toContain("In Phase 4, the AI Event Plan Generator will");
  });
});

