import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import PrintPdfPage, { generateMetadata } from "./page";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getEventById } from "@/lib/actions/events";
import { getBudgetItemsByEventId } from "@/lib/actions/budget";
import { getTasksByEventId } from "@/lib/actions/tasks";
import { getLatestPlanRevisionAction } from "@/lib/actions/plan";
import type { EventRow } from "@/lib/validations/event";
import type { BudgetItemRow } from "@/lib/validations/budget";
import type { TaskRow } from "@/lib/validations/task";
import type { PlanRevisionRow } from "@/lib/validations/plan";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    // @ts-expect-error Mocking Next redirect error
    error.digest = `NEXT_REDIRECT;replace;${url};307;;`;
    throw error;
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/actions/events", () => ({
  getEventById: vi.fn(),
}));

vi.mock("@/lib/actions/budget", () => ({
  getBudgetItemsByEventId: vi.fn(),
}));

vi.mock("@/lib/actions/tasks", () => ({
  getTasksByEventId: vi.fn(),
}));

vi.mock("@/lib/actions/plan", () => ({
  getLatestPlanRevisionAction: vi.fn(),
}));

describe("PDF Print View (Executive Dossier)", () => {
  const eventId = "33333333-3333-4333-a333-333333333333";
  const userId = "user-test-123";

  const mockEvent: EventRow = {
    id: eventId,
    user_id: userId,
    name: "Global AI Innovators Gala",
    event_type: "conference",
    event_date: "2026-11-15",
    location: "San Francisco Marriott Marquis",
    guest_count: 500,
    budget: 80000.0,
    status: "planning",
    preferences: "Modern tech aesthetic with sustainable decor",
    constraints: "Sound curfew at 10 PM sharp",
    cultural_requirements: "Halal and vegan catering options required",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  const mockTasks: TaskRow[] = [
    {
      id: "task-1",
      event_id: eventId,
      user_id: userId,
      plan_revision_id: null,
      title: "Sign catering contract",
      description: "Finalize dietary preferences and vegan menus",
      status: "completed",
      priority: "high",
      due_date: "2026-10-01T00:00:00Z",
      is_vendor_checklist: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "task-2",
      event_id: eventId,
      user_id: userId,
      plan_revision_id: null,
      title: "Confirm keynote speaker audio-visual setup",
      description: "Dual wireless lapel mics and 4K display",
      status: "in_progress",
      priority: "urgent",
      due_date: "2026-11-01T00:00:00Z",
      is_vendor_checklist: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];

  const mockBudgetItems: BudgetItemRow[] = [
    {
      id: "budget-1",
      event_id: eventId,
      user_id: userId,
      plan_revision_id: null,
      category: "Catering & Bar",
      item_name: "Executive Plated Dinner",
      estimated_amount: 35000.0,
      actual_amount: 32000.0,
      notes: "Negotiated discount for early headcount confirmation",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "budget-2",
      event_id: eventId,
      user_id: userId,
      plan_revision_id: null,
      category: "Entertainment & AV",
      item_name: "Stage & Lighting Rental",
      estimated_amount: 15000.0,
      actual_amount: 16500.0,
      notes: "Added secondary monitor feeds",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];

  const mockPlanRevision: PlanRevisionRow = {
    id: "plan-rev-1",
    event_id: eventId,
    user_id: userId,
    revision_number: 1,
    is_active: true,
    summary: "Comprehensive executive roadmap for Global AI Innovators Gala.",
    structured_plan: {
      summary: "Strategic roadmap focusing on tech innovation and sustainability.",
      themes: ["AI Frontier", "Eco-Elegance", "Global Impact"],
      scheduleMilestones: [
        {
          title: "Venue Handover",
          timeframe: "08:00 AM - 10:00 AM",
          description: "Inspect ballroom rigging and stage audio setup.",
        },
        {
          title: "Keynote Address",
          timeframe: "06:00 PM - 07:30 PM",
          description: "Opening keynote by industry leaders.",
        },
      ],
      suggestedTasks: [],
      proposedBudgetItems: [],
      keyRecommendations: [
        "Conduct live AV rehearsal 2 hours prior to doors opening.",
        "Ensure dedicated guest registration lanes for VIP attendees.",
      ],
      metadata: {
        generatedAt: "2026-01-01T00:00:00Z",
        model: "llama-3.3-70b-versatile",
      },
    },
    created_at: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMetadata", () => {
    it("returns formatted title when event exists", async () => {
      vi.mocked(getEventById).mockResolvedValue({
        success: true,
        data: mockEvent,
      });

      const meta = await generateMetadata({
        params: Promise.resolve({ id: eventId }),
      });

      expect(meta.title).toBe("Global AI Innovators Gala — Event Dossier | Planora AI");
      expect(meta.description).toContain("Global AI Innovators Gala");
    });

    it("returns fallback title when event lookup fails", async () => {
      vi.mocked(getEventById).mockResolvedValue({
        success: false,
        error: "Not found",
      });

      const meta = await generateMetadata({
        params: Promise.resolve({ id: eventId }),
      });

      expect(meta.title).toBe("Event Dossier | Planora AI");
    });
  });

  describe("Authentication and Ownership Security Guard", () => {
    it("redirects unauthenticated users to sign-in page", async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        data: { user: null },
      } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);

      await expect(
        PrintPdfPage({ params: Promise.resolve({ id: eventId }) })
      ).rejects.toThrow("NEXT_REDIRECT:/sign-in?redirectTo=/dashboard/events/33333333-3333-4333-a333-333333333333/export/pdf");
    });

    it("renders secure error state when event is not found or unauthorized", async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        data: { user: { id: userId, email: "test@example.com" } },
      } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);

      vi.mocked(getEventById).mockResolvedValue({
        success: false,
        error: "Event workspace not found or access denied.",
      });

      vi.mocked(getBudgetItemsByEventId).mockResolvedValue({
        success: false,
        error: "Forbidden",
      });
      vi.mocked(getTasksByEventId).mockResolvedValue({
        success: false,
        error: "Forbidden",
      });
      vi.mocked(getLatestPlanRevisionAction).mockResolvedValue({
        success: false,
        error: "Forbidden",
      });

      const jsx = await PrintPdfPage({ params: Promise.resolve({ id: eventId }) });
      const html = renderToString(jsx);

      expect(html).toContain("Event Not Found");
      expect(html).toContain("Event workspace not found or access denied.");
      expect(html).toContain("Return to Dashboard");
      // Must not leak private financial or task details
      expect(html).not.toContain("Executive Plated Dinner");
    });
  });

  describe("Document Sections Rendering", () => {
    beforeEach(() => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        data: { user: { id: userId, email: "test@example.com" } },
      } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>);

      vi.mocked(getEventById).mockResolvedValue({
        success: true,
        data: mockEvent,
      });

      vi.mocked(getBudgetItemsByEventId).mockResolvedValue({
        success: true,
        data: mockBudgetItems,
      });

      vi.mocked(getTasksByEventId).mockResolvedValue({
        success: true,
        data: mockTasks,
      });

      vi.mocked(getLatestPlanRevisionAction).mockResolvedValue({
        success: true,
        data: mockPlanRevision,
      });
    });

    it("renders complete dossier with all authoritative sections", async () => {
      const jsx = await PrintPdfPage({ params: Promise.resolve({ id: eventId }) });
      const html = renderToString(jsx);

      // 1. Header & Brand Mark
      expect(html).toContain("Planora AI — Event Dossier");
      expect(html).toContain("Global AI Innovators Gala");
      expect(html).toContain(eventId);
      expect(html).toContain("Confidential Event Brief");

      // Key Metrics
      expect(html).toContain("San Francisco Marriott Marquis");
      expect(html).toContain("500");
      expect(html).toContain("guests");
      expect(html).toContain("$80,000.00");

      // Parameters
      expect(html).toContain("Modern tech aesthetic with sustainable decor");
      expect(html).toContain("Sound curfew at 10 PM sharp");
      expect(html).toContain("Halal and vegan catering options required");

      // 2. Active Plan Blueprint
      expect(html).toContain("Approved Event Strategy &amp; Plan Blueprint");
      expect(html).toContain("Revision #");
      expect(html).toContain("(Active)");
      expect(html).toContain("Strategic roadmap focusing on tech innovation and sustainability.");
      expect(html).toContain("AI Frontier");
      expect(html).toContain("Eco-Elegance");
      expect(html).toContain("Venue Handover");
      expect(html).toContain("08:00 AM - 10:00 AM");
      expect(html).toContain("Conduct live AV rehearsal 2 hours prior to doors opening.");

      // 3. Timeline & Checklist Deliverables
      expect(html).toContain("Timeline Checklist &amp; Deliverables");
      expect(html).toContain("Total:");
      expect(html).toContain("<strong>2</strong>");
      expect(html).toContain("Sign catering contract");
      expect(html).toContain("Confirm keynote speaker audio-visual setup");
      expect(html).toContain("Vendor Item");

      // 4. Financial Summary
      expect(html).toContain("Financial Summary &amp; Category Allocations");
      expect(html).toContain("Target Budget");
      expect(html).toContain("Planned Estimates");
      expect(html).toContain("Actual Expenditures");
      expect(html).toContain("Catering &amp; Bar");
      expect(html).toContain("Entertainment &amp; AV");

      // 5. Itemized Ledger
      expect(html).toContain("Itemized Expense Ledger");
      expect(html).toContain("Executive Plated Dinner");
      expect(html).toContain("Stage &amp; Lighting Rental");
      expect(html).toContain("Negotiated discount for early headcount confirmation");

      // 6. Real-Time Risk Radar
      expect(html).toContain("Real-Time Event Risk Radar Findings");

      // 7. Footer
      expect(html).toContain("Planora AI — Event Planning Intelligence Platform • Document generated for authorized event owner.");
    });

    it("renders clean empty states when optional data is absent", async () => {
      // Event without active blueprint, tasks, or budget items
      vi.mocked(getLatestPlanRevisionAction).mockResolvedValue({
        success: false,
        error: "No revisions found",
      });
      vi.mocked(getTasksByEventId).mockResolvedValue({
        success: true,
        data: [],
      });
      vi.mocked(getBudgetItemsByEventId).mockResolvedValue({
        success: true,
        data: [],
      });

      const jsx = await PrintPdfPage({ params: Promise.resolve({ id: eventId }) });
      const html = renderToString(jsx);

      // Blueprint empty state
      expect(html).toContain("No approved plan blueprint established");

      // Tasks empty state
      expect(html).toContain("No checklist tasks recorded for this event.");

      // Budget empty state
      expect(html).toContain("No itemized expense records logged.");
    });

    it("renders unrecorded dash indicator for null actual amounts instead of $0.00", async () => {
      const itemWithNullActual: BudgetItemRow = {
        id: "budget-null-actual",
        event_id: eventId,
        user_id: userId,
        plan_revision_id: null,
        category: "Venue & Facilities",
        item_name: "Uncontracted Secondary Hall",
        estimated_amount: 5000.0,
        actual_amount: null as unknown as number,
        notes: "Pending vendor quote",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      };

      vi.mocked(getBudgetItemsByEventId).mockResolvedValue({
        success: true,
        data: [itemWithNullActual],
      });

      const jsx = await PrintPdfPage({ params: Promise.resolve({ id: eventId }) });
      const html = renderToString(jsx);

      expect(html).toContain("Uncontracted Secondary Hall");
      expect(html).toContain("$5,000.00");
      // The table row must render dash indicator "—" rather than treating null as $0.00
      expect(html).toContain("—");
    });
  });
});
