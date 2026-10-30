/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardLoading from "./loading";
import DashboardError from "./error";

describe("Dashboard Route Boundaries", () => {
  it("renders accessible loading skeleton with role='status'", () => {
    render(<DashboardLoading />);

    const loadingStatus = screen.getByRole("status", { name: "Loading workspace dashboard" });
    expect(loadingStatus).toBeDefined();
    expect(screen.getByText("Loading workspace dashboard...")).toBeDefined();
  });

  it("renders error boundary with accessible alert and calls reset on retry", async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();
    const mockError = new Error("Database timeout") as Error & { digest?: string };

    render(<DashboardError error={mockError} reset={handleReset} />);

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Unable to Load Dashboard")).toBeDefined();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeDefined();

    const retryBtn = screen.getByRole("button", { name: /Try Again/i });
    await user.click(retryBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});

