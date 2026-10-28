import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { EventForm } from "./event-form";
import { createEventSchema, updateEventSchema, type EventRow } from "@/lib/validations/event";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// Mock Server Actions
const mockCreateEventAction = vi.fn();
const mockUpdateEventAction = vi.fn();
vi.mock("@/lib/actions/events", () => ({
  createEventAction: (payload: unknown) => mockCreateEventAction(payload),
  updateEventAction: (id: string, payload: unknown) => mockUpdateEventAction(id, payload),
}));

describe("EventForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleInitialEvent: EventRow = {
    id: "evt-uuid-5555",
    user_id: "usr-uuid-9999",
    name: "AI Leadership Summit 2027",
    event_type: "conference",
    status: "planning",
    event_date: "2027-10-15T12:00:00.000Z",
    location: "Moscone Center, SF",
    guest_count: 850,
    budget: 120000,
    preferences: "Keynote live stream, plant-based catering",
    constraints: "Sound curfew at 10 PM",
    cultural_requirements: "Quiet contemplation room",
    created_at: "2026-10-01T10:00:00.000Z",
    updated_at: "2026-10-01T10:00:00.000Z",
  };

  it("renders all 10 event fields with programmatically associated labels", () => {
    const html = renderToString(<EventForm mode="create" />);

    const expectedFields = [
      { id: "event-name", label: "Event Name" },
      { id: "event-type", label: "Event Classification" },
      { id: "event-status", label: "Planning Status" },
      { id: "event-date", label: "Target Event Date" },
      { id: "event-location", label: "Venue or Location" },
      { id: "guest-count", label: "Estimated Guest Count" },
      { id: "event-budget", label: "Target Budget (USD $)" },
      { id: "event-preferences", label: "Preferences &amp; Styling Guidelines" },
      { id: "event-constraints", label: "Planning Constraints &amp; Hard Boundaries" },
      { id: "event-cultural", label: "Cultural, Ceremony &amp; Dietary Requirements" },
    ];

    for (const field of expectedFields) {
      expect(html).toContain(`id="${field.id}"`);
      expect(html).toContain(`for="${field.id}"`);
      expect(html).toContain(field.label);
    }
  });

  it("renders accessible required indicators and aria-required on mandatory fields", () => {
    const html = renderToString(<EventForm mode="create" />);

    // Check for visually hidden (required) text and aria-hidden asterisk
    expect(html).toContain('<span class="sr-only">(required)</span>');
    expect(html).toContain('aria-hidden="true" class="text-rose-500 font-bold">*</span>');

    // Controls must have aria-required="true"
    expect(html).toContain('id="event-name"');
    expect(html).toContain('id="event-type"');
    expect(html).toContain('id="event-status"');
    expect(html).toContain('aria-required="true"');
  });

  it("renders 3 semantic stage sections with landmarks and stage indicators", () => {
    const html = renderToString(<EventForm mode="create" />);

    expect(html).toContain('<section aria-labelledby="stage-1-heading"');
    expect(html).toContain('<section aria-labelledby="stage-2-heading"');
    expect(html).toContain('<section aria-labelledby="stage-3-heading"');

    expect(html).toContain("Stage 1 of 3");
    expect(html).toContain("Stage 2 of 3");
    expect(html).toContain("Stage 3 of 3");

    expect(html).toContain("Event Identity &amp; Type");
    expect(html).toContain("Schedule, Location &amp; Scale");
    expect(html).toContain("Planning Context &amp; Logistics");
  });

  it("renders live character counters for Event Name and context textareas", () => {
    const html = renderToString(<EventForm mode="create" />);

    expect(html).toContain("/ 150");
    expect(html).toContain("/ 2000");
  });

  it("renders currency prefix adornment for Target Budget field", () => {
    const html = renderToString(<EventForm mode="create" />);

    expect(html).toContain('aria-hidden="true">$</span>');
    expect(html).toContain('id="event-budget"');
    expect(html).toContain('name="budget"');
    expect(html).toContain('type="number"');
    expect(html).toContain('placeholder="0.00"');
  });

  it("renders mobile-optimized touch target action buttons (>=44px height)", () => {
    const html = renderToString(<EventForm mode="create" />);

    expect(html).toContain("h-11 sm:h-9 min-h-[44px] sm:min-h-0");
    expect(html).toContain("Create Event Workspace");
    expect(html).toContain("Cancel");
    expect(html).toContain('href="/dashboard"');
  });

  it("populates initial data and displays edit mode controls when mode='edit'", () => {
    const html = renderToString(
      <EventForm mode="edit" initialData={sampleInitialEvent} />
    );

    // Initial values
    expect(html).toContain('value="AI Leadership Summit 2027"');
    expect(html).toContain('value="Moscone Center, SF"');
    expect(html).toContain('value="850"');
    expect(html).toContain('value="120000"');
    expect(html).toContain("Keynote live stream, plant-based catering");
    expect(html).toContain("Sound curfew at 10 PM");
    expect(html).toContain("Quiet contemplation room");

    // Action button label and cancel link
    expect(html).toContain("Save Changes");
    expect(html).toContain('href="/dashboard/events/evt-uuid-5555"');

    // Character counters reflected
    expect(html).toContain(`${sampleInitialEvent.name.length}<!-- --> / 150`);
    expect(html).toContain(`${sampleInitialEvent.preferences?.length}<!-- --> / 2000`);
  });

  it("enforces schema validation rules matching createEventSchema", () => {
    // Missing required name
    const invalidName = createEventSchema.safeParse({
      name: " ",
      event_type: "conference",
      status: "draft",
    });
    expect(invalidName.success).toBe(false);

    // Name exceeding 150 chars
    const tooLongName = createEventSchema.safeParse({
      name: "A".repeat(151),
      event_type: "conference",
      status: "draft",
    });
    expect(tooLongName.success).toBe(false);

    // Negative guest count rejected
    const negativeGuests = createEventSchema.safeParse({
      name: "Tech Summit",
      event_type: "conference",
      guest_count: -1,
      status: "draft",
    });
    expect(negativeGuests.success).toBe(false);

    // Negative budget rejected
    const negativeBudget = createEventSchema.safeParse({
      name: "Tech Summit",
      event_type: "conference",
      budget: -500,
      status: "draft",
    });
    expect(negativeBudget.success).toBe(false);

    // Valid event passes schema
    const validEvent = createEventSchema.safeParse({
      name: "Planora Tech Summit 2027",
      event_type: "conference",
      guest_count: 500,
      budget: 75000.5,
      status: "planning",
    });
    expect(validEvent.success).toBe(true);
    if (validEvent.success) {
      expect(validEvent.data.budget).toBe(75000.5);
      expect(validEvent.data.guest_count).toBe(500);
      expect(validEvent.data.status).toBe("planning");
    }
  });

  it("enforces schema validation rules for updateEventSchema in edit mode", () => {
    const validUpdate = updateEventSchema.safeParse({
      name: "Updated Summit Name",
      budget: 85000,
    });
    expect(validUpdate.success).toBe(true);

    const emptyUpdate = updateEventSchema.safeParse({});
    expect(emptyUpdate.success).toBe(false);
  });
});
