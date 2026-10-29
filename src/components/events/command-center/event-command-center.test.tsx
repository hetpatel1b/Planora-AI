/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventCommandCenter } from "./event-command-center";
import type { EventRow } from "@/lib/validations/event";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { TaskRow } from "@/lib/validations/task";
import type { PlanRevisionRow } from "@/lib/validations/plan";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock child modules to isolate Command Center orchestrator testing
vi.mock("@/components/plan/plan-generator-card", () => ({
  PlanGeneratorCard: ({ eventId }: { eventId: string }) => (
    <div data-testid="mock-plan-generator" data-event-id={eventId}>
      Mock Plan Generator
    </div>
  ),
}));

vi.mock("@/components/timeline/timeline-checklist-manager", () => ({
  TimelineChecklistManager: ({ eventId }: { eventId: string }) => (
    <div data-testid="mock-timeline-manager" data-event-id={eventId}>
      Mock Timeline &amp; Checklist Manager
    </div>
  ),
}));

vi.mock("@/components/budget/budget-manager", () => ({
  BudgetManager: ({ eventId }: { eventId: string }) => (
    <div data-testid="mock-budget-manager" data-event-id={eventId}>
      Mock Budget Manager
    </div>
  ),
}));

vi.mock("@/components/risk/event-risk-radar", () => ({
  EventRiskRadar: ({
    event,
    assessment,
  }: {
    event: { id: string };
    assessment?: { counts?: { total: number } };
  }) => (
    <div
      data-testid="mock-risk-radar"
      data-event-id={event.id}
      data-has-assessment={assessment ? "true" : "false"}
      data-total-risks={assessment?.counts?.total ?? "none"}
    >
      Mock Event Risk Radar
    </div>
  ),
}));

vi.mock("@/components/copilot/copilot-chat-card", () => ({
  CopilotChatCard: ({ eventId }: { eventId: string }) => (
    <div data-testid="mock-copilot-chat" data-event-id={eventId}>
      Mock Copilot Chat Card
    </div>
  ),
}));

describe("EventCommandCenter Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEvent: EventRow = {
    id: "evt-cc-7777",
    user_id: "usr-lead-1",
    name: "Global Sustainability Summit 2027",
    event_type: "Conference",
    status: "planning",
    event_date: "2027-11-20T12:00:00.000Z",
    location: "Palace of Fine Arts, San Francisco, CA",
    guest_count: 650,
    budget: 95000,
    preferences: "Zero-waste catering, solar-powered stage audio",
    constraints: "Sound curfew at 10 PM",
    cultural_requirements: "Bilingual translation booth",
    created_at: "2026-10-15T10:00:00.000Z",
    updated_at: "2026-10-15T10:00:00.000Z",
  };

  const mockBudgetItems: BudgetItemRow[] = [
    {
      id: "b-1",
      event_id: mockEvent.id,
      user_id: mockEvent.user_id,
      plan_revision_id: null,
      category: "Catering",
      item_name: "Organic Farm-to-Table Banquet",
      estimated_amount: 35000,
      actual_amount: 32000,
      notes: null,
      created_at: "2026-10-16T10:00:00.000Z",
      updated_at: "2026-10-16T10:00:00.000Z",
    },
    {
      id: "b-2",
      event_id: mockEvent.id,
      user_id: mockEvent.user_id,
      plan_revision_id: null,
      category: "Venue",
      item_name: "Exhibition Hall Booking",
      estimated_amount: 25000,
      actual_amount: 25000,
      notes: null,
      created_at: "2026-10-16T10:00:00.000Z",
      updated_at: "2026-10-16T10:00:00.000Z",
    },
  ];

  const mockTasks: TaskRow[] = [
    {
      id: "t-1",
      event_id: mockEvent.id,
      user_id: mockEvent.user_id,
      plan_revision_id: null,
      title: "Confirm AV Production Vendor",
      description: null,
      priority: "high",
      status: "completed",
      due_date: "2027-09-01T12:00:00.000Z",
      is_vendor_checklist: false,
      created_at: "2026-10-16T10:00:00.000Z",
      updated_at: "2026-10-16T10:00:00.000Z",
    },
    {
      id: "t-2",
      event_id: mockEvent.id,
      user_id: mockEvent.user_id,
      plan_revision_id: null,
      title: "Finalize Keynote Speakers",
      description: null,
      priority: "urgent",
      status: "in_progress",
      due_date: "2027-10-01T12:00:00.000Z",
      is_vendor_checklist: false,
      created_at: "2026-10-16T10:00:00.000Z",
      updated_at: "2026-10-16T10:00:00.000Z",
    },
  ];

  const mockPlanRevision: PlanRevisionRow = {
    id: "rev-1",
    event_id: mockEvent.id,
    user_id: mockEvent.user_id,
    revision_number: 1,
    summary: "Comprehensive 5-stage sustainability conference blueprint.",
    is_active: true,
    structured_plan: {},
    created_at: "2026-10-16T10:00:00.000Z",
  };

  it("renders Area 1 Persistent Event Header with breadcrumb, status, and action links", () => {
    const html = renderToString(
      <EventCommandCenter
        event={mockEvent}
        budgetItems={mockBudgetItems}
        planRevision={mockPlanRevision}
        tasks={mockTasks}
      />
    );

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Dashboard");
    expect(html).toContain("Global Sustainability Summit 2027");
    expect(html).toContain("Conference");
    expect(html).toContain("Planning");
    expect(html).toContain('href="/dashboard/events/evt-cc-7777/edit"');
    expect(html).toContain("Edit Setup");
  });

  it("renders Area 2 Compact Event Summary with 4 metric cards and progressive disclosure", () => {
    const html = renderToString(
      <EventCommandCenter
        event={mockEvent}
        budgetItems={mockBudgetItems}
        planRevision={mockPlanRevision}
        tasks={mockTasks}
      />
    );

    // Key metrics
    expect(html).toContain("Target Date");
    expect(html).toContain("Palace of Fine Arts, San Francisco, CA");
    expect(html).toContain("650 guests");
    expect(html).toContain("₹95,000");

    // Progressive disclosure button
    expect(html).toContain("View Planning Brief &amp; Logistics");
    expect(html).toContain('aria-controls="event-logistics-disclosure"');
  });

  it("renders Area 3 Workspace Navigation with in-page anchor links", () => {
    const html = renderToString(
      <EventCommandCenter
        event={mockEvent}
        budgetItems={mockBudgetItems}
        planRevision={mockPlanRevision}
        tasks={mockTasks}
      />
    );

    expect(html).toContain('aria-label="Workspace Sections Navigation"');
    expect(html).toContain('href="#overview"');
    expect(html).toContain('href="#plan"');
    expect(html).toContain('href="#timeline"');
    expect(html).toContain('href="#budget"');
    expect(html).toContain('href="#risks"');
  });

  it("renders Area 4 Command Center Overview with calculated health cards and attention summary", () => {
    const html = renderToString(
      <EventCommandCenter
        event={mockEvent}
        budgetItems={mockBudgetItems}
        planRevision={mockPlanRevision}
        tasks={mockTasks}
      />
    );

    expect(html).toContain("Command Center • Executive Overview");
    expect(html).toContain("Workspace Health &amp; Readiness");

    // 1 of 2 tasks completed = 50%
    expect(html).toContain("50%");
    expect(html).toContain("1/2 completed");

    // Budget: ₹95,000 target, ₹60,000 estimated, ₹57,000 actual, ₹38,000 remaining
    expect(html).toContain("₹38,000");
    expect(html).toContain("Budget Health");

    // Risk Radar
    expect(html).toContain("Risk Radar");
    expect(html).toContain("Deterministic radar");

    // Plan Blueprint
    expect(html).toContain("Rev #1");
    expect(html).toContain("Active Plan");
  });

  it("renders all 4 major workspace sections with semantic landmarks and IDs", () => {
    const html = renderToString(
      <EventCommandCenter
        event={mockEvent}
        budgetItems={mockBudgetItems}
        planRevision={mockPlanRevision}
        tasks={mockTasks}
      />
    );

    // Section 1: Overview
    expect(html).toContain('id="overview"');
    expect(html).toContain('aria-labelledby="overview-heading"');

    // Section 2: Plan
    expect(html).toContain('id="plan"');
    expect(html).toContain('aria-labelledby="plan-heading"');
    expect(html).toContain('data-testid="mock-plan-generator"');

    // Section 3: Timeline & Checklist
    expect(html).toContain('id="timeline"');
    expect(html).toContain('aria-labelledby="timeline-heading"');
    expect(html).toContain('data-testid="mock-timeline-manager"');

    // Section 4: Budget Manager
    expect(html).toContain('id="budget"');
    expect(html).toContain('aria-labelledby="budget-heading"');
    expect(html).toContain('data-testid="mock-budget-manager"');

    // Section 5: Risk Radar
    expect(html).toContain('id="risks"');
    expect(html).toContain('aria-labelledby="risks-heading"');
    expect(html).toContain('data-testid="mock-risk-radar"');
  });

  it("renders Floating AI Copilot launcher button with accessible label and touch targets", () => {
    const html = renderToString(
      <EventCommandCenter
        event={mockEvent}
        budgetItems={mockBudgetItems}
        planRevision={mockPlanRevision}
        tasks={mockTasks}
      />
    );

    expect(html).toContain('aria-label="AI Copilot Assistant"');
    expect(html).toContain('aria-label="Open AI Copilot for Global Sustainability Summit 2027"');
    expect(html).toContain("Ask Copilot");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("passes precomputed risk assessment to EventRiskRadar to eliminate redundant calculations", () => {
    const html = renderToString(
      <EventCommandCenter
        event={mockEvent}
        budgetItems={mockBudgetItems}
        planRevision={mockPlanRevision}
        tasks={mockTasks}
      />
    );

    expect(html).toContain('data-testid="mock-risk-radar"');
    expect(html).toContain('data-has-assessment="true"');
  });

  it("configures all scroll sections with scroll-mt-28 offset classes for reliable navigation", () => {
    const html = renderToString(
      <EventCommandCenter
        event={mockEvent}
        budgetItems={mockBudgetItems}
        planRevision={mockPlanRevision}
        tasks={mockTasks}
      />
    );

    // Verify all 5 spy sections have scroll-mt-28
    const sectionIds = ["overview", "plan", "timeline", "budget", "risks"];
    for (const id of sectionIds) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain("scroll-mt-28");
    }
  });

  describe("Interactive DOM User Operations", () => {
    it("toggles planning brief and logistics progressive disclosure on click", async () => {
      const user = userEvent.setup();
      render(
        <EventCommandCenter
          event={mockEvent}
          budgetItems={mockBudgetItems}
          planRevision={mockPlanRevision}
          tasks={mockTasks}
        />
      );

      const toggleButton = screen.getByRole("button", {
        name: /view planning brief & logistics/i,
      });
      expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
      expect(document.getElementById("event-logistics-disclosure")).toBeNull();

      // Click to open disclosure
      await user.click(toggleButton);

      expect(toggleButton.getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByText(/hide planning brief & logistics/i)).toBeDefined();
      const disclosure = document.getElementById("event-logistics-disclosure");
      expect(disclosure).not.toBeNull();
      expect(screen.getByText(/Zero-waste catering, solar-powered stage audio/)).toBeDefined();
      expect(screen.getByText(/Sound curfew at 10 PM/)).toBeDefined();

      // Click again to close disclosure
      await user.click(toggleButton);
      expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
      expect(document.getElementById("event-logistics-disclosure")).toBeNull();
    });

    it("opens and dismisses floating AI Copilot drawer on interactive trigger", async () => {
      const user = userEvent.setup();
      render(
        <EventCommandCenter
          event={mockEvent}
          budgetItems={mockBudgetItems}
          planRevision={mockPlanRevision}
          tasks={mockTasks}
        />
      );

      const copilotLauncher = screen.getByRole("button", {
        name: /open ai copilot for global sustainability summit 2027/i,
      });
      expect(copilotLauncher.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByRole("dialog")).toBeNull();

      // Click launcher to open drawer
      await user.click(copilotLauncher);

      expect(copilotLauncher.getAttribute("aria-expanded")).toBe("true");
      const drawerDialog = screen.getByRole("dialog");
      expect(drawerDialog).toBeDefined();
      expect(drawerDialog.getAttribute("aria-modal")).toBe("true");
      expect(screen.getByTestId("mock-copilot-chat")).toBeDefined();

      // Press Escape to dismiss drawer
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("interacts with workspace navigation anchor links smoothly", async () => {
      const user = userEvent.setup();
      render(
        <EventCommandCenter
          event={mockEvent}
          budgetItems={mockBudgetItems}
          planRevision={mockPlanRevision}
          tasks={mockTasks}
        />
      );

      const timelineNavLink = screen.getByRole("link", { name: /timeline/i });
      expect(timelineNavLink.getAttribute("href")).toBe("#timeline");
      await user.click(timelineNavLink);

      const budgetNavLink = screen.getByRole("link", { name: /budget/i });
      expect(budgetNavLink.getAttribute("href")).toBe("#budget");
      await user.click(budgetNavLink);
    });
  });
});
