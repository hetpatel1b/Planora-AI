/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineChecklistManager } from "./timeline-checklist-manager";
import type { TaskRow } from "@/lib/validations/task";

// Mock server action
const mockToggleTaskStatusAction = vi.fn();
vi.mock("@/lib/actions/tasks", () => ({
  toggleTaskStatusAction: (taskId: string, eventId: string, status: string) =>
    mockToggleTaskStatusAction(taskId, eventId, status),
}));

// Mock download CSV utility
vi.mock("@/lib/download-csv", () => ({
  triggerCsvDownload: vi.fn().mockResolvedValue({ success: true }),
}));

describe("TimelineChecklistManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const eventId = "evt-test-1111";

  const sampleTasks: TaskRow[] = [
    {
      id: "task-1",
      event_id: eventId,
      user_id: "usr-1",
      plan_revision_id: null,
      title: "Confirm Catering Menu",
      description: "Finalize farm-to-table selections with chef",
      status: "pending",
      priority: "high",
      due_date: "2027-10-01T12:00:00.000Z",
      is_vendor_checklist: true,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "task-2",
      event_id: eventId,
      user_id: "usr-1",
      plan_revision_id: null,
      title: "Book Audio-Visual Production",
      description: "Sound stage and lighting rig",
      status: "completed",
      priority: "urgent",
      due_date: "2027-09-15T12:00:00.000Z",
      is_vendor_checklist: true,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "task-3",
      event_id: eventId,
      user_id: "usr-1",
      plan_revision_id: null,
      title: "Send Invitation Letters",
      description: "VIP delegates and keynote speakers",
      status: "in_progress",
      priority: "medium",
      due_date: "2027-10-10T12:00:00.000Z",
      is_vendor_checklist: false,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
  ];

  it("renders header metrics and progress KPIs correctly", () => {
    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
      />
    );

    expect(screen.getByText("Dynamic Timeline & Checklist")).toBeDefined();
    // 3 total deliverables
    expect(screen.getByText("3")).toBeDefined();
    // 1 completed (33%)
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("(33%)")).toBeDefined();
    // 2 vendor items & remaining deliverables
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("(1 done)")).toBeDefined();
  });

  it("switches between Timeline and Checklist view modes interactively", async () => {
    const user = userEvent.setup();
    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
      />
    );

    const checklistButton = screen.getByRole("button", { name: /checklist/i });
    await user.click(checklistButton);

    // In checklist view, tasks are rendered under the checklist container
    expect(screen.getByText("Confirm Catering Menu")).toBeDefined();
    expect(screen.getByText("Book Audio-Visual Production")).toBeDefined();

    const timelineButton = screen.getByRole("button", { name: /timeline/i });
    await user.click(timelineButton);
    expect(screen.getByText("Confirm Catering Menu")).toBeDefined();
  });

  it("categorizes past completed tasks under Completed / Closed in timeline view", async () => {
    const tasksWithPastCompleted: TaskRow[] = [
      ...sampleTasks,
      {
        id: "task-past-done",
        event_id: eventId,
        user_id: "usr-1",
        plan_revision_id: null,
        title: "Archived Venue Inspection",
        description: "Completed past task",
        status: "completed",
        priority: "medium",
        due_date: "2025-01-01T12:00:00.000Z",
        is_vendor_checklist: false,
        created_at: "2025-01-01T10:00:00.000Z",
        updated_at: "2025-01-01T10:00:00.000Z",
      },
    ];

    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={tasksWithPastCompleted}
      />
    );

    expect(screen.getByText(/Completed \/ Closed \(1\)/i)).toBeDefined();
    expect(screen.getByText("Archived Venue Inspection")).toBeDefined();
  });

  it("filters tasks interactively by search query", async () => {
    const user = userEvent.setup();
    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search tasks/i);
    await user.type(searchInput, "Catering");

    expect(screen.getByText("Confirm Catering Menu")).toBeDefined();
    expect(screen.queryByText("Book Audio-Visual Production")).toBeNull();
    expect(screen.queryByText("Send Invitation Letters")).toBeNull();

    await user.clear(searchInput);
    expect(screen.getByText("Book Audio-Visual Production")).toBeDefined();
  });

  it("filters tasks interactively by status tab", async () => {
    const user = userEvent.setup();
    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
      />
    );

    // Click Completed tab
    const completedTab = screen.getByRole("button", { name: /completed \(1\)/i });
    await user.click(completedTab);

    expect(screen.getByText("Book Audio-Visual Production")).toBeDefined();
    expect(screen.queryByText("Confirm Catering Menu")).toBeNull();

    // Click Vendor tab
    const vendorTab = screen.getByRole("button", { name: /vendor \(2\)/i });
    await user.click(vendorTab);

    expect(screen.getByText("Confirm Catering Menu")).toBeDefined();
    expect(screen.getByText("Book Audio-Visual Production")).toBeDefined();
    expect(screen.queryByText("Send Invitation Letters")).toBeNull();
  });

  it("filters tasks interactively by priority select dropdown", async () => {
    const user = userEvent.setup();
    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
      />
    );

    const prioritySelect = screen.getByLabelText(/filter checklist tasks by priority/i);
    await user.selectOptions(prioritySelect, "urgent");

    expect(screen.getByText("Book Audio-Visual Production")).toBeDefined();
    expect(screen.queryByText("Confirm Catering Menu")).toBeNull();
  });

  it("interactively toggles task status calling server action and updating state", async () => {
    const user = userEvent.setup();
    mockToggleTaskStatusAction.mockResolvedValueOnce({
      success: true,
      data: {
        ...sampleTasks[0],
        status: "completed",
      },
    });

    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
      />
    );

    const toggleButton = screen.getByRole("button", {
      name: `Mark "${sampleTasks[0].title}" as completed`,
    });
    await user.click(toggleButton);

    expect(mockToggleTaskStatusAction).toHaveBeenCalledTimes(1);
    expect(mockToggleTaskStatusAction).toHaveBeenCalledWith(
      "task-1",
      eventId,
      "completed"
    );
  });

  it("rolls back optimistic toggle when server action returns failure", async () => {
    const user = userEvent.setup();
    mockToggleTaskStatusAction.mockResolvedValueOnce({
      success: false,
      error: "Database lock timeout",
    });

    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
      />
    );

    const toggleButton = screen.getByRole("button", {
      name: `Mark "${sampleTasks[0].title}" as completed`,
    });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(mockToggleTaskStatusAction).toHaveBeenCalledTimes(1);
    });

    // Button should revert to asking to mark as completed (since it rolled back to pending)
    const revertedButton = screen.getByRole("button", {
      name: `Mark "${sampleTasks[0].title}" as completed`,
    });
    expect(revertedButton).toBeDefined();
  });

  it("opens add task dialog when + Add Task button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
      />
    );

    const addButton = screen.getByRole("button", { name: /add task/i });
    await user.click(addButton);

    // TaskDialog modal title or form appears
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("renders initial error banner when initialError prop is provided", () => {
    render(
      <TimelineChecklistManager
        eventId={eventId}
        initialTasks={sampleTasks}
        initialError="Failed to sync remote checklist tasks"
      />
    );

    expect(screen.getByText("Failed to sync remote checklist tasks")).toBeDefined();
  });
});
