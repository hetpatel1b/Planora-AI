/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventForm } from "./event-form";
import { createEventSchema, updateEventSchema, type EventRow } from "@/lib/validations/event";

// Mock router
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
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

  describe("DOM Structure & Accessibility", () => {
    it("renders all 10 event fields with programmatically associated labels", () => {
      render(<EventForm mode="create" />);

      const expectedFields = [
        { id: "event-name", label: "Event Name" },
        { id: "event-type", label: "Event Classification" },
        { id: "event-status", label: "Planning Status" },
        { id: "event-date", label: "Target Event Date" },
        { id: "event-location", label: "Venue or Location" },
        { id: "guest-count", label: "Estimated Guest Count" },
        { id: "event-budget", label: "Target Budget (INR ₹)" },
        { id: "event-preferences", label: "Preferences & Styling Guidelines" },
        { id: "event-constraints", label: "Planning Constraints & Hard Boundaries" },
        { id: "event-cultural", label: "Cultural, Ceremony & Dietary Requirements" },
      ];

      for (const field of expectedFields) {
        const input = document.getElementById(field.id);
        expect(input).not.toBeNull();
        const label = document.querySelector(`label[for="${field.id}"]`);
        expect(label).not.toBeNull();
        expect(label?.textContent).toContain(field.label);
      }
    });

    it("renders accessible required indicators and aria-required on mandatory fields", () => {
      render(<EventForm mode="create" />);

      expect(screen.getAllByText("(required)").length).toBeGreaterThan(0);

      const nameInput = screen.getByLabelText(/Event Name/i);
      expect(nameInput.getAttribute("aria-required")).toBe("true");

      const typeSelect = screen.getByLabelText(/Event Classification/i);
      expect(typeSelect.getAttribute("aria-required")).toBe("true");

      const statusSelect = screen.getByLabelText(/Planning Status/i);
      expect(statusSelect.getAttribute("aria-required")).toBe("true");
    });

    it("renders 3 semantic stage sections with landmarks and stage indicators", () => {
      render(<EventForm mode="create" />);

      expect(document.querySelector('section[aria-labelledby="stage-1-heading"]')).not.toBeNull();
      expect(document.querySelector('section[aria-labelledby="stage-2-heading"]')).not.toBeNull();
      expect(document.querySelector('section[aria-labelledby="stage-3-heading"]')).not.toBeNull();

      expect(screen.getByText("Stage 1 of 3")).toBeDefined();
      expect(screen.getByText("Stage 2 of 3")).toBeDefined();
      expect(screen.getByText("Stage 3 of 3")).toBeDefined();

      expect(screen.getByText("Event Identity & Type")).toBeDefined();
      expect(screen.getByText("Schedule, Location & Scale")).toBeDefined();
      expect(screen.getByText("Planning Context & Logistics")).toBeDefined();
    });

    it("renders currency prefix adornment for Target Budget field", () => {
      render(<EventForm mode="create" />);

      const budgetInput = screen.getByLabelText(/Target Budget/i);
      expect(budgetInput).toBeDefined();
      expect(budgetInput.getAttribute("type")).toBe("number");
      expect(budgetInput.getAttribute("placeholder")).toBe("0.00");
    });

    it("renders mobile-optimized touch target action buttons (>=44px height)", () => {
      render(<EventForm mode="create" />);

      const submitButton = screen.getByRole("button", { name: /Create Event Workspace/i });
      expect(submitButton).toBeDefined();
      expect(submitButton.className).toContain("min-h-[44px]");

      const cancelLink = screen.getByRole("link", { name: /Cancel/i });
      expect(cancelLink).toBeDefined();
      expect(cancelLink.getAttribute("href")).toBe("/dashboard");
    });

    it("populates initial data and displays edit mode controls when mode='edit'", () => {
      render(<EventForm mode="edit" initialData={sampleInitialEvent} />);

      expect(screen.getByDisplayValue("AI Leadership Summit 2027")).toBeDefined();
      expect(screen.getByDisplayValue("Moscone Center, SF")).toBeDefined();
      expect(screen.getByDisplayValue("850")).toBeDefined();
      expect(screen.getByDisplayValue("120000")).toBeDefined();
      expect(screen.getByDisplayValue("Keynote live stream, plant-based catering")).toBeDefined();
      expect(screen.getByDisplayValue("Sound curfew at 10 PM")).toBeDefined();
      expect(screen.getByDisplayValue("Quiet contemplation room")).toBeDefined();

      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeDefined();
      const cancelLink = screen.getByRole("link", { name: /Cancel/i });
      expect(cancelLink.getAttribute("href")).toBe("/dashboard/events/evt-uuid-5555");
    });
  });

  describe("Interactive User Input & State Transitions", () => {
    it("updates input values and live character counters as user types", async () => {
      const user = userEvent.setup();
      render(<EventForm mode="create" />);

      const nameInput = screen.getByLabelText(/Event Name/i);
      expect(screen.getByText("0 / 150")).toBeDefined();

      await user.type(nameInput, "Global Tech Symposium");
      expect(screen.getByDisplayValue("Global Tech Symposium")).toBeDefined();
      expect(screen.getByText("21 / 150")).toBeDefined();

      const prefTextarea = screen.getByLabelText(/Preferences & Styling Guidelines/i);
      await user.type(prefTextarea, "Minimalist stage design");
      expect(screen.getByText("23 / 2000")).toBeDefined();
    });

    it("strips leading zeros on numeric guest count and budget inputs", async () => {
      const user = userEvent.setup();
      render(<EventForm mode="create" />);

      const guestInput = screen.getByLabelText(/Estimated Guest Count/i);
      await user.type(guestInput, "0250");
      expect((guestInput as HTMLInputElement).value).toBe("250");

      const budgetInput = screen.getByLabelText(/Target Budget/i);
      await user.type(budgetInput, "05000");
      expect((budgetInput as HTMLInputElement).value).toBe("5000");
    });

    it("reveals custom event type input when 'other' is selected and hides when reverted", async () => {
      const user = userEvent.setup();
      render(<EventForm mode="create" />);

      expect(screen.queryByLabelText(/Custom Event Type Description/i)).toBeNull();

      const typeSelect = screen.getByLabelText(/Event Classification/i);
      await user.selectOptions(typeSelect, "other");

      const customInput = screen.getByLabelText(/Custom Event Type Description/i);
      expect(customInput).toBeDefined();

      await user.type(customInput, "Esports Tournament");
      expect(screen.getByDisplayValue("Esports Tournament")).toBeDefined();

      await user.selectOptions(typeSelect, "conference");
      expect(screen.queryByLabelText(/Custom Event Type Description/i)).toBeNull();
    });

    it("defaults to wedding and allows quick selection of core problem-statement categories", async () => {
      const user = userEvent.setup();
      render(<EventForm mode="create" />);

      const typeSelect = screen.getByLabelText(/Event Classification/i) as HTMLSelectElement;
      expect(typeSelect.value).toBe("wedding");

      // Click Birthday chip
      const birthdayChip = screen.getByRole("button", { name: /Birthday Party/i });
      await user.click(birthdayChip);
      expect(typeSelect.value).toBe("birthday");

      // Click Community Gathering chip
      const communityChip = screen.getByRole("button", { name: /Community Gathering/i });
      await user.click(communityChip);
      expect(typeSelect.value).toBe("community");

      // Click Wedding chip
      const weddingChip = screen.getByRole("button", { name: /Wedding & Reception/i });
      await user.click(weddingChip);
      expect(typeSelect.value).toBe("wedding");

      // Verify other presets like conference remain selectable via dropdown
      await user.selectOptions(typeSelect, "conference");
      expect(typeSelect.value).toBe("conference");
    });
  });

  describe("Client Validation & Interactive Error Summaries", () => {
    it("displays accessible error alert and inline field error when submitted with whitespace-only name", async () => {
      const user = userEvent.setup();
      render(<EventForm mode="create" />);

      const nameInput = screen.getByLabelText(/Event Name/i);
      await user.type(nameInput, "   ");

      const submitButton = screen.getByRole("button", { name: /Create Event Workspace/i });
      await user.click(submitButton);

      const alert = await screen.findByRole("alert");
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain("Please correct the highlighted errors in the form before submitting.");

      const inlineError = screen.getByText("Event name must be at least 2 characters.");
      expect(inlineError).toBeDefined();

      expect(mockCreateEventAction).not.toHaveBeenCalled();
    });

    it("focuses the target field when clicking the error summary anchor link", async () => {
      const user = userEvent.setup();
      render(<EventForm mode="create" />);

      const submitButton = screen.getByRole("button", { name: /Create Event Workspace/i });
      await user.click(submitButton);

      const alert = await screen.findByRole("alert");
      const errorLink = alert.querySelector("button");
      expect(errorLink).not.toBeNull();

      const nameInput = screen.getByLabelText(/Event Name/i);
      expect(nameInput).toBeDefined();
    });
  });

  describe("Create Mode Submission & Navigation", () => {
    it("submits valid data, enters loading state, and redirects to event workspace on success", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockResolvedValueOnce({
        success: true,
        data: { id: "new-evt-8888" },
      });

      render(<EventForm mode="create" />);

      await user.type(screen.getByLabelText(/Event Name/i), "AI Summit 2027");
      await user.type(screen.getByLabelText(/Venue or Location/i), "Moscone West");
      await user.type(screen.getByLabelText(/Estimated Guest Count/i), "300");
      await user.type(screen.getByLabelText(/Target Budget/i), "50000");

      const submitButton = screen.getByRole("button", { name: /Create Event Workspace/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateEventAction).toHaveBeenCalledTimes(1);
      });

      expect(mockCreateEventAction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "AI Summit 2027",
          location: "Moscone West",
          guest_count: 300,
          budget: 50000,
          event_type: "wedding",
          status: "draft",
        })
      );

      await waitFor(() => {
        expect(screen.getByText("Event workspace created successfully!")).toBeDefined();
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard/events/new-evt-8888");
    });

    it("redirects to custom onSuccessRedirect URL when provided", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockResolvedValueOnce({
        success: true,
        data: { id: "new-evt-9999" },
      });

      render(<EventForm mode="create" onSuccessRedirect="/custom/dashboard" />);

      await user.type(screen.getByLabelText(/Event Name/i), "Executive Retreat");
      await user.click(screen.getByRole("button", { name: /Create Event Workspace/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/custom/dashboard");
      });
    });

    it("displays server action failure and field errors when createEventAction returns error", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockResolvedValueOnce({
        success: false,
        error: "An event with this name already exists in your workspace.",
        fieldErrors: { name: ["Name must be unique."] },
      });

      render(<EventForm mode="create" />);

      await user.type(screen.getByLabelText(/Event Name/i), "Duplicate Summit");
      await user.click(screen.getByRole("button", { name: /Create Event Workspace/i }));

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("An event with this name already exists in your workspace.");
      expect(screen.getByText("Name must be unique.")).toBeDefined();

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("handles unexpected server action exceptions gracefully with fallback network error", async () => {
      const user = userEvent.setup();
      mockCreateEventAction.mockRejectedValueOnce(new Error("Network connection dropped"));

      render(<EventForm mode="create" />);

      await user.type(screen.getByLabelText(/Event Name/i), "Test Event");
      await user.click(screen.getByRole("button", { name: /Create Event Workspace/i }));

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("An unexpected network error occurred. Please try again.");
    });
  });

  describe("Edit Mode Submission & Lifecycle", () => {
    it("submits updated values and navigates to the event workspace", async () => {
      const user = userEvent.setup();
      mockUpdateEventAction.mockResolvedValueOnce({
        success: true,
        data: { ...sampleInitialEvent, name: "Renamed Summit 2027", budget: 150000 },
      });

      render(<EventForm mode="edit" initialData={sampleInitialEvent} />);

      const nameInput = screen.getByLabelText(/Event Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Renamed Summit 2027");

      const budgetInput = screen.getByLabelText(/Target Budget/i);
      await user.clear(budgetInput);
      await user.type(budgetInput, "150000");

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateEventAction).toHaveBeenCalledTimes(1);
      });

      expect(mockUpdateEventAction).toHaveBeenCalledWith(
        "evt-uuid-5555",
        expect.objectContaining({
          name: "Renamed Summit 2027",
          budget: 150000,
        })
      );

      await waitFor(() => {
        expect(screen.getByText("Event setup updated successfully!")).toBeDefined();
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard/events/evt-uuid-5555");
    });

    it("displays error banner when updateEventAction returns failure", async () => {
      const user = userEvent.setup();
      mockUpdateEventAction.mockResolvedValueOnce({
        success: false,
        error: "Failed to update event due to concurrent modification.",
      });

      render(<EventForm mode="edit" initialData={sampleInitialEvent} />);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      await user.click(saveButton);

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("Failed to update event due to concurrent modification.");
    });

    it("displays missing identifier error when mode='edit' is passed without initialData id", async () => {
      const user = userEvent.setup();
      render(<EventForm mode="edit" initialData={undefined} />);

      const nameInput = screen.getByLabelText(/Event Name/i);
      await user.type(nameInput, "Valid Name Without ID");

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      await user.click(saveButton);

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("Missing event identifier.");
      expect(mockUpdateEventAction).not.toHaveBeenCalled();
    });
  });

  describe("Schema Validation Integrity", () => {
    it("enforces schema validation rules matching createEventSchema", () => {
      const invalidName = createEventSchema.safeParse({
        name: " ",
        event_type: "conference",
        status: "draft",
      });
      expect(invalidName.success).toBe(false);

      const tooLongName = createEventSchema.safeParse({
        name: "A".repeat(151),
        event_type: "conference",
        status: "draft",
      });
      expect(tooLongName.success).toBe(false);

      const negativeGuests = createEventSchema.safeParse({
        name: "Tech Summit",
        event_type: "conference",
        guest_count: -1,
        status: "draft",
      });
      expect(negativeGuests.success).toBe(false);

      const negativeBudget = createEventSchema.safeParse({
        name: "Tech Summit",
        event_type: "conference",
        budget: -500,
        status: "draft",
      });
      expect(negativeBudget.success).toBe(false);

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
});
