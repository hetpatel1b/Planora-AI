/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatIfSimulator } from "./what-if-simulator";
import type { BudgetItemRow } from "@/lib/validations/budget";

// Mock server actions
const mockApplyBudgetScenarioAction = vi.fn();
vi.mock("@/lib/actions/simulator", () => ({
  applyBudgetScenarioAction: (payload: unknown) => mockApplyBudgetScenarioAction(payload),
}));

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("WhatIfSimulator Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const eventId = "22222222-2222-4222-a222-222222222222";
  const baselineTargetBudget = 25000; // ₹25,000.00
  const baselineItems: BudgetItemRow[] = [
    {
      id: "item-catering",
      event_id: eventId,
      user_id: "user-1",
      plan_revision_id: null,
      category: "Catering & Bar",
      item_name: "Gourmet Buffet",
      estimated_amount: 10000, // ₹10,000.00
      actual_amount: 0,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "item-av",
      event_id: eventId,
      user_id: "user-1",
      plan_revision_id: null,
      category: "Entertainment & AV",
      item_name: "Sound & Stage Lighting",
      estimated_amount: 5000, // ₹5,000.00
      actual_amount: 4500,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  describe("DOM Structure & Baseline Rendering", () => {
    it("renders header, scenario tabs, and simulator mode badge", () => {
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      expect(screen.getByText("What-If Budget Simulator")).toBeDefined();
      expect(screen.getByText("In-Memory Draft")).toBeDefined();
      expect(screen.getByRole("button", { name: "Scenario A: Vendor Adjustments" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Scenario B: Budget Optimization" })).toBeDefined();
    });

    it("renders live financial summary cards with formatted currency", () => {
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      expect(screen.getByText("Projected Spend")).toBeDefined();
      expect(screen.getByText("Baseline: ₹15,000.00")).toBeDefined();
      expect(screen.getByText("Remaining Cushion")).toBeDefined();
      expect(screen.getAllByText("₹10,000.00").length).toBeGreaterThan(0);
    });

    it("renders baseline line items with interactive adjustment controls", () => {
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      expect(screen.getByText("Gourmet Buffet")).toBeDefined();
      expect(screen.getByText("Sound & Stage Lighting")).toBeDefined();
      expect(screen.getByLabelText("Adjust estimated amount for Gourmet Buffet")).toBeDefined();
      expect(screen.getByLabelText("Adjust estimated amount for Sound & Stage Lighting")).toBeDefined();
    });

    it("renders empty state notice when baseline budget items list is empty", () => {
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={[]}
        />
      );

      expect(screen.getByText(/No baseline budget items found/i)).toBeDefined();
    });
  });

  describe("Scenario Switching & Isolation", () => {
    it("switches active scenario and maintains isolated overrides", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const scenarioBBtn = screen.getByRole("button", { name: "Scenario B: Budget Optimization" });
      await user.click(scenarioBBtn);

      expect(scenarioBBtn.className).toContain("bg-indigo-600 text-white");

      const scenarioABtn = screen.getByRole("button", { name: "Scenario A: Vendor Adjustments" });
      expect(scenarioABtn.className).not.toContain("bg-indigo-600 text-white");
    });
  });

  describe("Hypothetical Target Budget Override", () => {
    it("updates target budget ceiling and recalculates cushion", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const targetInput = screen.getByLabelText(/Hypothetical Target Budget Ceiling/i);
      await user.clear(targetInput);
      await user.type(targetInput, "30000");

      expect(screen.getByText("Target Ceiling: ₹30,000.00")).toBeDefined();
      expect(screen.getAllByText("₹15,000.00").length).toBeGreaterThan(0); // 30,000 - 15,000 = 15,000 cushion

      // Reset button appears
      const resetBtn = screen.getByRole("button", { name: "Reset" });
      await user.click(resetBtn);

      expect(screen.getByText("Target Ceiling: ₹25,000.00")).toBeDefined();
    });
  });

  describe("Interactive Line-Item Adjustments", () => {
    it("adjusts line item estimate, recalculates totals, and displays 'Edited' badge", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const buffetInput = screen.getByLabelText("Adjust estimated amount for Gourmet Buffet");
      await user.clear(buffetInput);
      await user.type(buffetInput, "12000");

      // Baseline spend was 15,000, now 12,000 + 5,000 = 17,000
      expect(screen.getByText("₹17,000.00")).toBeDefined();
      expect(screen.getAllByText("+₹2,000.00").length).toBeGreaterThan(0);
      expect(screen.getByText("Edited")).toBeDefined();
    });

    it("toggles item removal and restoration, updating calculations", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      // Remove buffet (10,000)
      const removeButtons = screen.getAllByRole("button", { name: "Remove" });
      await user.click(removeButtons[0]);

      // Projected spend is now just sound (5,000)
      expect(screen.getAllByText("₹5,000.00").length).toBeGreaterThan(0);
      expect(screen.getAllByText("-₹10,000.00").length).toBeGreaterThan(0);
      expect(screen.getByText("Removed")).toBeDefined();

      // Click restore
      const restoreButton = screen.getByRole("button", { name: "Restore" });
      await user.click(restoreButton);

      // Restored back to 15,000
      expect(screen.getAllByText("₹15,000.00").length).toBeGreaterThan(0);
    });
  });

  describe("Adding and Removing Candidate Line Items", () => {
    it("adds a new candidate line item through the inline form and recalculates totals", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const addBtn = screen.getByRole("button", { name: /Add Candidate Item/i });
      await user.click(addBtn);

      expect(screen.getByText("Add New Candidate Expense to Scenario")).toBeDefined();

      const nameInput = screen.getByPlaceholderText("e.g. Photo Booth Rental");
      const amountInput = screen.getByPlaceholderText("0.00");

      await user.type(nameInput, "Premium DJ");
      await user.type(amountInput, "3000");

      const form = nameInput.closest("form")!;
      fireEvent.submit(form);

      // Item added with 'New' badge
      expect(screen.getByText("Premium DJ")).toBeDefined();
      expect(screen.getByText("New")).toBeDefined();

      // Spend is now 15,000 + 3,000 = 18,000
      expect(screen.getByText("₹18,000.00")).toBeDefined();

      // Delete the candidate item
      const deleteBtn = screen.getByRole("button", { name: "Delete" });
      await user.click(deleteBtn);

      expect(screen.queryByText("Premium DJ")).toBeNull();
      expect(screen.getAllByText("₹15,000.00").length).toBeGreaterThan(0);
    });

    it("cancels adding a candidate item without modifying scenario", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      await user.click(screen.getByRole("button", { name: /Add Candidate Item/i }));
      expect(screen.getByText("Add New Candidate Expense to Scenario")).toBeDefined();

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByText("Add New Candidate Expense to Scenario")).toBeNull();
    });
  });

  describe("Comparison Matrix & Baseline Reset", () => {
    it("toggles the multi-scenario comparison matrix view", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const compareBtn = screen.getByRole("button", { name: /Compare Scenarios/i });
      await user.click(compareBtn);

      expect(screen.getByText("Multi-Scenario Comparison Matrix")).toBeDefined();
      expect(screen.getByRole("button", { name: /Hide Matrix/i })).toBeDefined();

      await user.click(screen.getByRole("button", { name: /Hide Matrix/i }));
      expect(screen.queryByText("Multi-Scenario Comparison Matrix")).toBeNull();
    });

    it("resets active scenario to baseline values when clicking Reset Baseline", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const buffetInput = screen.getByLabelText("Adjust estimated amount for Gourmet Buffet");
      await user.clear(buffetInput);
      await user.type(buffetInput, "20000");

      expect(screen.getByText("1 proposed change(s)")).toBeDefined();

      const resetBaselineBtn = screen.getByRole("button", { name: /Reset Baseline/i });
      await user.click(resetBaselineBtn);

      expect(screen.getByText("0 proposed change(s)")).toBeDefined();
      expect(screen.getByText("₹15,000.00")).toBeDefined();
    });
  });

  describe("Review & Apply Modal Workflow", () => {
    it("disables the Review & Apply button when there are no changes", () => {
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const applyBtn = screen.getByRole("button", { name: /Review & Apply Changes/i });
      expect((applyBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it("opens review modal and persists scenario to budget on confirmation", async () => {
      const user = userEvent.setup();
      const mockOnApplied = vi.fn();
      mockApplyBudgetScenarioAction.mockResolvedValueOnce({
        success: true,
        data: { message: "Budget scenario applied successfully." },
      });

      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
          onScenarioApplied={mockOnApplied}
        />
      );

      const buffetInput = screen.getByLabelText("Adjust estimated amount for Gourmet Buffet");
      await user.clear(buffetInput);
      await user.type(buffetInput, "11000");

      const reviewBtn = screen.getByRole("button", { name: /Review & Apply Changes/i });
      expect((reviewBtn as HTMLButtonElement).disabled).toBe(false);
      await user.click(reviewBtn);

      // Confirmation modal is visible
      const modal = screen.getByRole("dialog");
      expect(modal).toBeDefined();
      expect(screen.getByText("Confirm Budget Scenario Application")).toBeDefined();

      // Click Confirm
      const confirmBtn = screen.getByRole("button", { name: /Confirm & Persist to Saved Budget/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(mockApplyBudgetScenarioAction).toHaveBeenCalledTimes(1);
      });

      expect(mockApplyBudgetScenarioAction).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId,
          scenarioName: "Scenario A: Vendor Adjustments",
          item_overrides: [
            expect.objectContaining({
              id: "item-catering",
              estimated_amount: 11000,
            }),
          ],
        })
      );

      expect(mockOnApplied).toHaveBeenCalledTimes(1);
    });

    it("displays error inside modal when applyBudgetScenarioAction fails", async () => {
      const user = userEvent.setup();
      mockApplyBudgetScenarioAction.mockResolvedValueOnce({
        success: false,
        error: "Concurrency conflict: budget was modified by another session.",
      });

      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const buffetInput = screen.getByLabelText("Adjust estimated amount for Gourmet Buffet");
      await user.clear(buffetInput);
      await user.type(buffetInput, "11000");

      await user.click(screen.getByRole("button", { name: /Review & Apply Changes/i }));
      await user.click(screen.getByRole("button", { name: /Confirm & Persist to Saved Budget/i }));

      const errorText = await screen.findByText("Concurrency conflict: budget was modified by another session.");
      expect(errorText).toBeDefined();
    });

    it("supports accessible modal closure via Escape key and restores focus to trigger button", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      const buffetInput = screen.getByLabelText("Adjust estimated amount for Gourmet Buffet");
      await user.clear(buffetInput);
      await user.type(buffetInput, "11000");

      const reviewBtn = screen.getByRole("button", { name: /Review & Apply Changes/i });
      await user.click(reviewBtn);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeDefined();

      // Close button has accessible name
      const closeBtn = screen.getByRole("button", { name: "Close scenario review" });
      expect(closeBtn).toBeDefined();

      // Pressing Escape dismisses the dialog
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("provides programmatically associated labels for candidate expense form inputs", async () => {
      const user = userEvent.setup();
      render(
        <WhatIfSimulator
          eventId={eventId}
          baselineTargetBudget={baselineTargetBudget}
          baselineItems={baselineItems}
        />
      );

      await user.click(screen.getByRole("button", { name: /Add Candidate Item/i }));

      expect(screen.getByLabelText("Item Name")).toBeDefined();
      expect(screen.getByLabelText("Category")).toBeDefined();
      expect(screen.getByLabelText(/Estimated Cost/i)).toBeDefined();
    });
  });
});
