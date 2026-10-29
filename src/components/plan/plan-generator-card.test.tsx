/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanGeneratorCard } from "./plan-generator-card";
import type { AIPlanBlueprint, PlanRevisionRow } from "@/lib/validations/plan";

// Mock router
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: mockRefresh,
  }),
}));

// Mock server action
const mockGenerateEventPlanAction = vi.fn();
vi.mock("@/lib/actions/plan", () => ({
  generateEventPlanAction: (eventId: string) => mockGenerateEventPlanAction(eventId),
}));

// Mock PlanBlueprintViewer
vi.mock("@/components/plan/plan-blueprint-viewer", () => ({
  PlanBlueprintViewer: ({
    blueprint,
    onAccepted,
    onDiscard,
  }: {
    blueprint: AIPlanBlueprint;
    onAccepted?: (rev: PlanRevisionRow) => void;
    onDiscard?: () => void;
  }) => (
    <div data-testid="mock-blueprint-viewer">
      <span>Mock Blueprint: {blueprint.summary}</span>
      <button
        onClick={() =>
          onAccepted?.({
            id: "rev-mock-999",
            event_id: "evt-plan-1",
            user_id: "usr-1",
            revision_number: 2,
            summary: "Adopted blueprint draft",
            is_active: true,
            structured_plan: blueprint,
            created_at: "2026-10-20T10:00:00.000Z",
          })
        }
      >
        Accept Blueprint Action
      </button>
      <button onClick={onDiscard}>Discard Blueprint Action</button>
    </div>
  ),
}));

describe("PlanGeneratorCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const eventId = "evt-plan-1";
  const eventName = "Green Energy Symposium 2027";

  const sampleBlueprint: AIPlanBlueprint = {
    summary: "Complete blueprint for 500 attendees focusing on clean energy.",
    themes: ["Clean Energy", "Sustainability", "Innovation"],
    scheduleMilestones: [
      {
        title: "Vendor Onboarding",
        timeframe: "T-60 days",
        description: "Contract all suppliers",
        suggested_date: "2027-09-15T00:00:00.000Z",
      },
    ],
    suggestedTasks: [
      {
        title: "Reserve Exhibition Hall",
        description: "Pavilion A and B",
        priority: "urgent",
        category: "Venue",
        suggested_days_before: 90,
        is_vendor_checklist: true,
      },
    ],
    proposedBudgetItems: [
      {
        category: "Venue & Facilities",
        item_name: "Convention Hall Rental",
        estimated_amount: 25000,
        notes: "Main pavilion",
      },
    ],
    keyRecommendations: ["Early vendor booking"],
    metadata: {
      source: "deterministic",
      model: null,
      generatedAt: "2026-10-15T10:00:00.000Z",
      promptSummary: "Auto generated blueprint",
    },
  };

  const sampleInitialRevision: PlanRevisionRow = {
    id: "rev-active-1",
    event_id: eventId,
    user_id: "usr-1",
    revision_number: 1,
    summary: "Initial baseline plan revision.",
    is_active: true,
    structured_plan: sampleBlueprint,
    created_at: "2026-10-15T10:00:00.000Z",
  };

  it("renders idle state with generate button when no revision exists", () => {
    render(<PlanGeneratorCard eventId={eventId} eventName={eventName} />);

    expect(screen.getByText("AI & Rule-Based Plan Generator")).toBeDefined();
    expect(screen.getByRole("button", { name: /generate event plan/i })).toBeDefined();
    expect(screen.getByText("100% read-only preview before acceptance")).toBeDefined();
  });

  it("handles plan generation workflow and transitions to reviewing state", async () => {
    const user = userEvent.setup();
    mockGenerateEventPlanAction.mockResolvedValueOnce({
      success: true,
      data: sampleBlueprint,
    });

    render(<PlanGeneratorCard eventId={eventId} eventName={eventName} />);

    const generateButton = screen.getByRole("button", { name: /generate event plan/i });
    await user.click(generateButton);

    expect(mockGenerateEventPlanAction).toHaveBeenCalledTimes(1);
    expect(mockGenerateEventPlanAction).toHaveBeenCalledWith(eventId);

    await waitFor(() => {
      expect(screen.getByText("Reviewing Generated Blueprint Draft")).toBeDefined();
    });

    expect(screen.getByTestId("mock-blueprint-viewer")).toBeDefined();
    expect(screen.getByText(`Mock Blueprint: ${sampleBlueprint.summary}`)).toBeDefined();
  });

  it("displays error message and provides retry option when generation fails", async () => {
    const user = userEvent.setup();
    mockGenerateEventPlanAction.mockResolvedValueOnce({
      success: false,
      error: "Groq rate limit exceeded for today",
    });

    render(<PlanGeneratorCard eventId={eventId} eventName={eventName} />);

    const generateButton = screen.getByRole("button", { name: /generate event plan/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Unable to Generate Event Blueprint")).toBeDefined();
    });

    expect(screen.getByText("Groq rate limit exceeded for today")).toBeDefined();
    expect(screen.getByRole("button", { name: /retry generation/i })).toBeDefined();
  });

  it("renders active accepted revision state and allows opening full blueprint preview", async () => {
    const user = userEvent.setup();
    render(
      <PlanGeneratorCard
        eventId={eventId}
        eventName={eventName}
        initialRevision={sampleInitialRevision}
      />
    );

    expect(screen.getByText("Active Plan Revision #1")).toBeDefined();
    expect(screen.getByText("Applied")).toBeDefined();
    expect(screen.getByText("Initial baseline plan revision.")).toBeDefined();

    // Click View Full Blueprint
    const viewButton = screen.getByRole("button", { name: /view full blueprint/i });
    await user.click(viewButton);

    expect(screen.getByText("Reviewing Generated Blueprint Draft")).toBeDefined();
    expect(screen.getByTestId("mock-blueprint-viewer")).toBeDefined();

    // Click Close Preview
    const closeButton = screen.getByRole("button", { name: /close preview/i });
    await user.click(closeButton);

    expect(screen.getByText("Active Plan Revision #1")).toBeDefined();
  });

  it("triggers onPlanAccepted callback and router.refresh when plan is accepted", async () => {
    const user = userEvent.setup();
    const handleAccepted = vi.fn();
    mockGenerateEventPlanAction.mockResolvedValueOnce({
      success: true,
      data: sampleBlueprint,
    });

    render(
      <PlanGeneratorCard
        eventId={eventId}
        eventName={eventName}
        onPlanAccepted={handleAccepted}
      />
    );

    await user.click(screen.getByRole("button", { name: /generate event plan/i }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-blueprint-viewer")).toBeDefined();
    });

    // Accept blueprint from viewer
    await user.click(screen.getByRole("button", { name: /accept blueprint action/i }));

    expect(handleAccepted).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Active Plan Revision #2")).toBeDefined();
  });

  it("regenerates blueprint draft and passes updated blueprint with new timestamp key", async () => {
    const user = userEvent.setup();
    mockGenerateEventPlanAction
      .mockResolvedValueOnce({
        success: true,
        data: sampleBlueprint,
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...sampleBlueprint,
          summary: "Regenerated blueprint revision 2",
          metadata: {
            ...sampleBlueprint.metadata,
            generatedAt: "2027-01-02T12:00:00.000Z",
          },
        },
      });

    render(
      <PlanGeneratorCard
        eventId={eventId}
        eventName={eventName}
      />
    );

    // 1. Initial generation
    await user.click(screen.getByRole("button", { name: /generate event plan/i }));
    await waitFor(() => {
      expect(screen.getByText(/Mock Blueprint: Complete blueprint for 500 attendees/i)).toBeDefined();
    });

    // 2. Click Regenerate Draft
    const regenBtn = screen.getByRole("button", { name: /regenerate draft/i });
    await user.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByText(/Mock Blueprint: Regenerated blueprint revision 2/i)).toBeDefined();
    });
    expect(mockGenerateEventPlanAction).toHaveBeenCalledTimes(2);
  });
});
