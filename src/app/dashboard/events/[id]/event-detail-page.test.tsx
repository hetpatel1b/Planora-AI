import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import EventDetailPage from "./page";
import type { EventRow } from "@/lib/validations/event";

// Mock Supabase server
const mockGetAuthenticatedUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

// Mock Actions
const mockGetEventById = vi.fn();
const mockGetBudgetItemsByEventId = vi.fn();
const mockGetLatestPlanRevisionAction = vi.fn();
const mockGetTasksByEventId = vi.fn();

vi.mock("@/lib/actions/events", () => ({
  getEventById: (id: string) => mockGetEventById(id),
}));

vi.mock("@/lib/actions/budget", () => ({
  getBudgetItemsByEventId: (id: string) => mockGetBudgetItemsByEventId(id),
}));

vi.mock("@/lib/actions/plan", () => ({
  getLatestPlanRevisionAction: (id: string) => mockGetLatestPlanRevisionAction(id),
}));

vi.mock("@/lib/actions/tasks", () => ({
  getTasksByEventId: (id: string) => mockGetTasksByEventId(id),
}));

// Mock redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock EventCommandCenter to isolate Server Component test
vi.mock("@/components/events/command-center/event-command-center", () => ({
  EventCommandCenter: ({ event }: { event: { id: string; name: string } }) => (
    <div data-testid="mock-command-center" data-event-id={event.id} data-event-name={event.name}>
      Mock Event Command Center
    </div>
  ),
}));

describe("EventDetailPage Server Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const eventId = "evt-detail-test-111";

  const mockUser = {
    id: "usr-tester-99",
    email: "planner@planora.ai",
  };

  const mockEvent: EventRow = {
    id: eventId,
    user_id: mockUser.id,
    name: "Horizon Leadership Forum",
    event_type: "Conference",
    status: "confirmed",
    event_date: "2027-05-15T12:00:00.000Z",
    location: "Seattle Convention Center",
    guest_count: 400,
    budget: 60000,
    preferences: null,
    constraints: null,
    cultural_requirements: null,
    created_at: "2026-10-20T10:00:00.000Z",
    updated_at: "2026-10-20T10:00:00.000Z",
  };

  it("redirects unauthenticated users to /sign-in with redirectTo", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: null } });

    await expect(
      EventDetailPage({ params: Promise.resolve({ id: eventId }) })
    ).rejects.toThrow(`REDIRECT:/sign-in?redirectTo=/dashboard/events/${eventId}`);
    expect(mockRedirect).toHaveBeenCalledWith(
      `/sign-in?redirectTo=/dashboard/events/${eventId}`
    );
  });

  it("renders Event Not Found fallback when event lookup fails", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });
    mockGetEventById.mockResolvedValue({ success: false, error: "Not found" });
    mockGetBudgetItemsByEventId.mockResolvedValue({ success: true, data: [] });
    mockGetLatestPlanRevisionAction.mockResolvedValue({ success: true, data: null });
    mockGetTasksByEventId.mockResolvedValue({ success: true, data: [] });

    const element = await EventDetailPage({ params: Promise.resolve({ id: eventId }) });
    const html = renderToString(element);

    expect(html).toContain("Event Not Found");
    expect(html).toContain("Return to Dashboard");
    expect(html).toContain('href="/dashboard"');
  });

  it("renders EventCommandCenter when user is authenticated and event is found", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });
    mockGetEventById.mockResolvedValue({ success: true, data: mockEvent });
    mockGetBudgetItemsByEventId.mockResolvedValue({ success: true, data: [] });
    mockGetLatestPlanRevisionAction.mockResolvedValue({ success: true, data: null });
    mockGetTasksByEventId.mockResolvedValue({ success: true, data: [] });

    const element = await EventDetailPage({ params: Promise.resolve({ id: eventId }) });
    const html = renderToString(element);

    expect(html).toContain('data-testid="mock-command-center"');
    expect(html).toContain(`data-event-id="${eventId}"`);
    expect(html).toContain('data-event-name="Horizon Leadership Forum"');
  });
});

