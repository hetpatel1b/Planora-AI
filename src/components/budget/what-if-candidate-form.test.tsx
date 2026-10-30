/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatIfCandidateForm } from "./what-if-candidate-form";

describe("WhatIfCandidateForm Component", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <WhatIfCandidateForm
        isOpen={false}
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders input fields and submits valid candidate line item", async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    const handleClose = vi.fn();

    render(
      <WhatIfCandidateForm
        isOpen={true}
        onClose={handleClose}
        onAdd={handleAdd}
      />
    );

    const nameInput = screen.getByLabelText("Item Name");
    const categorySelect = screen.getByLabelText("Category");
    const amountInput = screen.getByLabelText(/Estimated Cost/);

    await user.type(nameInput, "Sound Stage System");
    await user.selectOptions(categorySelect, "Entertainment & AV");
    await user.type(amountInput, "2500");

    const form = nameInput.closest("form")!;
    fireEvent.submit(form);

    expect(handleAdd).toHaveBeenCalledTimes(1);
    expect(handleAdd).toHaveBeenCalledWith({
      name: "Sound Stage System",
      category: "Entertainment & AV",
      amount: 2500,
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onAdd when submitted with empty title", () => {
    const handleAdd = vi.fn();
    const handleClose = vi.fn();

    render(
      <WhatIfCandidateForm
        isOpen={true}
        onClose={handleClose}
        onAdd={handleAdd}
      />
    );

    const nameInput = screen.getByLabelText("Item Name");
    const form = nameInput.closest("form")!;
    fireEvent.submit(form);

    expect(handleAdd).not.toHaveBeenCalled();
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("resets and closes when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    const handleClose = vi.fn();

    render(
      <WhatIfCandidateForm
        isOpen={true}
        onClose={handleClose}
        onAdd={handleAdd}
      />
    );

    const nameInput = screen.getByLabelText("Item Name");
    await user.type(nameInput, "Temporary Text");

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelBtn);

    expect(handleAdd).not.toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
