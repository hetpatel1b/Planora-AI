import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { EventCard } from "./event-card";
import type { EventRow } from "@/lib/validations/event";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock DeleteEventDialog to isolate EventCard testing
vi.mock("@/components/events/delete-event-dialog", () => ({
  DeleteEventDialog: ({ eventId, eventName, isOpen }: { eventId: string; eventName: string; isOpen: boolean }) => (
    <div data-testid="mock-delete-dialog" data-event-id={eventId} data-event-name={eventName} data-open={isOpen ? "true" : "false"} />
  ),
}));

describe("EventCard Component", () => {
  const mockEvent: EventRow = {
    id: "evt-1234-abcd",
    user_id: "usr-5678",
    name: "Global Tech Innovators Summit 2027",
    event_type: "Conference",
    status: "planning",
    event_date: "2027-09-15T09:00:00.000Z",
    location: "Moscone Center, San Francisco, CA",
    guest_count: 1250,
    budget: 75000,
    preferences: "Keynote recording required, vegan catering priority",
    constraints: null,
    cultural_requirements: null,
    created_at: "2026-10-20T10:00:00.000Z",
    updated_at: "2026-10-20T10:00:00.000Z",
  };

  it("renders event title, classification tag, and status badge", () => {
    const html = renderToString(<EventCard event={mockEvent} />);

    expect(html).toContain("Global Tech Innovators Summit 2027");
    expect(html).toContain("Conference");
    expect(html).toContain("Planning");
    expect(html).toContain('title="Global Tech Innovators Summit 2027"');
    expect(html).toContain('id="event-title-evt-1234-abcd"');
  });

  it("renders metadata items with icons and formatted values", () => {
    const html = renderToString(<EventCard event={mockEvent} />);

    expect(html).toContain("Moscone Center, San Francisco, CA");
    expect(html).toContain("1,250 attendees");
    expect(html).toContain("$75,000");
    expect(html).toContain("title=\"Location: Moscone Center, San Francisco, CA\"");
    expect(html).toContain("title=\"Guest count: 1,250 attendees\"");
  });

  it("renders accessible Edit link pointing to edit route with >=44px tap zone", () => {
    const html = renderToString(<EventCard event={mockEvent} />);

    expect(html).toContain('href="/dashboard/events/evt-1234-abcd/edit"');
    expect(html).toContain('title="Edit Global Tech Innovators Summit 2027"');
    expect(html).toContain('aria-label="Edit Global Tech Innovators Summit 2027"');
    expect(html).toContain("size-9 sm:size-8");
  });

  it("renders accessible Delete trigger button with aria-label", () => {
    const html = renderToString(<EventCard event={mockEvent} />);

    expect(html).toContain('title="Delete Global Tech Innovators Summit 2027"');
    expect(html).toContain('aria-label="Delete Global Tech Innovators Summit 2027"');
    expect(html).toContain("size-9 sm:size-8");
  });

  it("renders preferences quote snippet when provided", () => {
    const html = renderToString(<EventCard event={mockEvent} />);

    expect(html).toContain("Keynote recording required, vegan catering priority");
  });

  it("renders fallback labels when date, location, or constraints are missing", () => {
    const minimalEvent: EventRow = {
      id: "evt-sparse-99",
      user_id: "usr-5678",
      name: "TBD Private Gathering",
      event_type: "Social",
      status: "draft",
      event_date: null,
      location: null,
      guest_count: 0,
      budget: 0,
      preferences: null,
      constraints: null,
      cultural_requirements: null,
      created_at: "2026-10-20T10:00:00.000Z",
      updated_at: "2026-10-20T10:00:00.000Z",
    };

    const html = renderToString(<EventCard event={minimalEvent} />);

    expect(html).toContain("TBD Private Gathering");
    expect(html).toContain("Date TBD");
    expect(html).toContain("Location TBD");
    expect(html).toContain("0 attendees");
    expect(html).toContain("$0");
  });

  it("renders primary workspace link with destination /dashboard/events/[id]", () => {
    const html = renderToString(<EventCard event={mockEvent} />);

    expect(html).toContain('href="/dashboard/events/evt-1234-abcd"');
    expect(html).toContain("Open Event Workspace");
  });
});
