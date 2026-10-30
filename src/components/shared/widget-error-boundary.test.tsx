/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WidgetErrorBoundary } from "./widget-error-boundary";

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Simulated widget explosion");
  }
  return <div>Healthy Widget Content</div>;
}

describe("WidgetErrorBoundary Component", () => {
  it("renders children normally when no error occurs", () => {
    render(
      <WidgetErrorBoundary title="Plan Section">
        <ProblemChild shouldThrow={false} />
      </WidgetErrorBoundary>
    );

    expect(screen.getByText("Healthy Widget Content")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("catches child rendering error and displays isolated fallback with retry button", async () => {
    const user = userEvent.setup();
    const spyConsole = vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <WidgetErrorBoundary title="Timeline Section">
        <ProblemChild shouldThrow={true} />
      </WidgetErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Timeline Section")).toBeDefined();
    expect(screen.getByText(/This workspace section encountered an unexpected rendering error/)).toBeDefined();

    // Now fix child and click retry
    rerender(
      <WidgetErrorBoundary title="Timeline Section">
        <ProblemChild shouldThrow={false} />
      </WidgetErrorBoundary>
    );

    const retryBtn = screen.getByRole("button", { name: /Retry Section/i });
    await user.click(retryBtn);

    expect(screen.getByText("Healthy Widget Content")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();

    spyConsole.mockRestore();
  });
});

