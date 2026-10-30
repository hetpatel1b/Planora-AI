/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatIfReviewModal, type ScenarioDiffSummary } from "./what-if-review-modal";

describe("WhatIfReviewModal Component", () => {
  const sampleDiff: ScenarioDiffSummary = {
    hasTargetBudgetChange: true,
    oldTargetBudget: 10000,
    newTargetBudget: 12000,
    totalChangesCount: 3,
    modified: [
      { name: "Catering", oldVal: 3000, newVal: 3500, delta: 500 },
    ],
    added: [
      { name: "Lighting Rig", category: "Entertainment & AV", amount: 1500 },
    ],
    deleted: [
      { name: "Unused Banners", amount: 200 },
    ],
  };

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <WhatIfReviewModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isApplying={false}
        applyError={null}
        applySuccess={null}
        itemDiff={sampleDiff}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with simulated delta and category diffs", () => {
    render(
      <WhatIfReviewModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isApplying={false}
        applyError={null}
        applySuccess={null}
        itemDiff={sampleDiff}
      />
    );

    expect(screen.getByText("Confirm Budget Scenario Application")).toBeDefined();
    expect(screen.getByText("Target Budget Ceiling:")).toBeDefined();
    expect(screen.getByText("Catering")).toBeDefined();
    expect(screen.getByText("+ Lighting Rig (Entertainment & AV)")).toBeDefined();
    expect(screen.getByText("- Unused Banners")).toBeDefined();
  });

  it("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <WhatIfReviewModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isApplying={false}
        applyError={null}
        applySuccess={null}
        itemDiff={sampleDiff}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm when Confirm & Persist to Saved Budget button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <WhatIfReviewModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isApplying={false}
        applyError={null}
        applySuccess={null}
        itemDiff={sampleDiff}
      />
    );

    const applyBtn = screen.getByRole("button", { name: "Confirm & Persist to Saved Budget" });
    await user.click(applyBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("displays error message if applyError is provided", () => {
    render(
      <WhatIfReviewModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isApplying={false}
        applyError="Database timeout occurred"
        applySuccess={null}
        itemDiff={sampleDiff}
      />
    );

    expect(screen.getByText("Database timeout occurred")).toBeDefined();
  });

  it("links accessible description via aria-describedby", () => {
    render(
      <WhatIfReviewModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isApplying={false}
        applyError={null}
        applySuccess={null}
        itemDiff={sampleDiff}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-describedby")).toBe("confirm-apply-description");
    expect(screen.getByText(/Applying this scenario will permanently update/)).toBeDefined();
  });

  it("calls onClose when user clicks the backdrop overlay", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <WhatIfReviewModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        isApplying={false}
        applyError={null}
        applySuccess={null}
        itemDiff={sampleDiff}
      />
    );

    const dialog = screen.getByRole("dialog");
    await user.click(dialog);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
