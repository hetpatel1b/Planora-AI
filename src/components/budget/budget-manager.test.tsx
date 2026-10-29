/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetManager } from "./budget-manager";
import type { BudgetItemRow } from "@/lib/validations/budget";

// Mock Child Components
vi.mock("@/components/budget/what-if-simulator", () => ({
  WhatIfSimulator: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mock-what-if-simulator">
      Mock What-If Simulator
      <button onClick={onClose}>Close Mock Simulator</button>
    </div>
  ),
}));

vi.mock("@/components/budget/budget-item-dialog", () => ({
  BudgetItemDialog: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" data-testid="mock-budget-item-dialog">
        Mock Budget Item Dialog
        <button onClick={onClose}>Cancel Dialog</button>
      </div>
    ) : null,
}));

vi.mock("@/components/budget/delete-budget-item-dialog", () => ({
  DeleteBudgetItemDialog: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" data-testid="mock-delete-budget-dialog">
        Mock Delete Dialog
        <button onClick={onClose}>Cancel Delete</button>
      </div>
    ) : null,
}));

// Mock CSV download utility
vi.mock("@/lib/download-csv", () => ({
  triggerCsvDownload: vi.fn().mockResolvedValue({ success: true }),
}));

describe("BudgetManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const eventId = "evt-budget-test-2222";
  const targetBudget = 50000;

  const sampleItems: BudgetItemRow[] = [
    {
      id: "item-1",
      event_id: eventId,
      user_id: "usr-1",
      plan_revision_id: null,
      category: "Catering & Bar",
      item_name: "Artisan Buffet Banquet",
      estimated_amount: 20000,
      actual_amount: 19500,
      notes: "Local sustainable ingredients",
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "item-2",
      event_id: eventId,
      user_id: "usr-1",
      plan_revision_id: null,
      category: "Venue & Facilities",
      item_name: "Ballroom Rental",
      estimated_amount: 15000,
      actual_amount: 15000,
      notes: "Deposit paid",
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "item-3",
      event_id: eventId,
      user_id: "usr-1",
      plan_revision_id: null,
      category: "Audio & Visual",
      item_name: "Sound System & Lighting",
      estimated_amount: 8000,
      actual_amount: 9000, // overspent
      notes: null,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
    },
  ];

  it("renders budget header, target budget, and financial KPI summary cards", () => {
    render(
      <BudgetManager
        eventId={eventId}
        targetBudget={targetBudget}
        initialItems={sampleItems}
      />
    );

    expect(screen.getByText("Smart Budget Manager")).toBeDefined();
    expect(screen.getAllByText("₹50,000.00").length).toBeGreaterThanOrEqual(1);
    // Estimated allocations: 20000 + 15000 + 8000 = 43000
    expect(screen.getAllByText("₹43,000.00").length).toBeGreaterThanOrEqual(1);
    // Actual spend: 19500 + 15000 + 9000 = 43500
    expect(screen.getAllByText("₹43,500.00").length).toBeGreaterThanOrEqual(1);
  });

  it("renders overspending alert when an item exceeds allocation", () => {
    render(
      <BudgetManager
        eventId={eventId}
        targetBudget={targetBudget}
        initialItems={sampleItems}
      />
    );

    expect(screen.getByText("Budget Warning Detected")).toBeDefined();
    expect(screen.getByText(/1 line item\(s\) have actual expenses exceeding their estimated allocation/)).toBeDefined();
  });

  it("filters budget items interactively using search input", async () => {
    const user = userEvent.setup();
    render(
      <BudgetManager
        eventId={eventId}
        targetBudget={targetBudget}
        initialItems={sampleItems}
      />
    );

    const searchInput = screen.getByLabelText(/search budget items/i);
    await user.type(searchInput, "Ballroom");

    expect(screen.getByText("Ballroom Rental")).toBeDefined();
    expect(screen.queryByText("Artisan Buffet Banquet")).toBeNull();
    expect(screen.queryByText("Sound System & Lighting")).toBeNull();

    // Reset via reset button
    const resetButton = screen.getByTitle("Reset filters");
    await user.click(resetButton);

    expect(screen.getByText("Artisan Buffet Banquet")).toBeDefined();
    expect(screen.getByText("Ballroom Rental")).toBeDefined();
    expect(screen.getByText("Sound System & Lighting")).toBeDefined();
  });

  it("filters budget items interactively using category select dropdown", async () => {
    const user = userEvent.setup();
    render(
      <BudgetManager
        eventId={eventId}
        targetBudget={targetBudget}
        initialItems={sampleItems}
      />
    );

    const categorySelect = screen.getByLabelText(/filter budget items by category/i);
    await user.selectOptions(categorySelect, "Venue & Facilities");

    expect(screen.getByText("Ballroom Rental")).toBeDefined();
    expect(screen.queryByText("Artisan Buffet Banquet")).toBeNull();
    expect(screen.queryByText("Sound System & Lighting")).toBeNull();
  });

  it("opens What-If Simulator workbench on button click and closes on toggle", async () => {
    const user = userEvent.setup();
    render(
      <BudgetManager
        eventId={eventId}
        targetBudget={targetBudget}
        initialItems={sampleItems}
      />
    );

    expect(screen.queryByTestId("mock-what-if-simulator")).toBeNull();

    const simulatorButton = screen.getByRole("button", { name: /what-if simulator/i });
    await user.click(simulatorButton);

    expect(screen.getByTestId("mock-what-if-simulator")).toBeDefined();
    expect(screen.getByRole("button", { name: /close simulator/i })).toBeDefined();

    // Click again to close
    const closeButton = screen.getByRole("button", { name: /close simulator/i });
    await user.click(closeButton);

    expect(screen.queryByTestId("mock-what-if-simulator")).toBeNull();
  });

  it("opens add expense item dialog on Add Expense Item button click", async () => {
    const user = userEvent.setup();
    render(
      <BudgetManager
        eventId={eventId}
        targetBudget={targetBudget}
        initialItems={sampleItems}
      />
    );

    expect(screen.queryByTestId("mock-budget-item-dialog")).toBeNull();

    const addButton = screen.getByRole("button", { name: /add expense item/i });
    await user.click(addButton);

    expect(screen.getByTestId("mock-budget-item-dialog")).toBeDefined();

    // Dismiss dialog
    const cancelButton = screen.getByRole("button", { name: /cancel dialog/i });
    await user.click(cancelButton);

    expect(screen.queryByTestId("mock-budget-item-dialog")).toBeNull();
  });

  it("renders initial error banner when initialError prop is passed", () => {
    render(
      <BudgetManager
        eventId={eventId}
        targetBudget={targetBudget}
        initialItems={sampleItems}
        initialError="Connection to budget database timed out"
      />
    );

    expect(screen.getByText("Unable to load budget records")).toBeDefined();
    expect(screen.getByText(/Connection to budget database timed out/)).toBeDefined();
  });
});
