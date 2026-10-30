/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventDetailLoading from "./loading";
import EventDetailError from "./error";

describe("Event Workspace Route Boundaries", () => {
  it("renders workspace loading skeleton with role='status'", () => {
    render(<EventDetailLoading />);

    const loadingStatus = screen.getByRole("status", { name: "Loading event workspace" });
    expect(loadingStatus).toBeDefined();
    expect(screen.getByText("Loading event command center...")).toBeDefined();
  });

  it("renders workspace error boundary with retry trigger and return link", async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();
    const mockError = new Error("Event fetch failed") as Error & { digest?: string };

    render(<EventDetailError error={mockError} reset={handleReset} />);

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Workspace Error")).toBeDefined();
    expect(screen.getByText(/We were unable to render this event workspace/)).toBeDefined();

    const retryBtn = screen.getByRole("button", { name: /Retry Workspace/i });
    await user.click(retryBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);

    const returnLink = screen.getByRole("link", { name: /Return to Dashboard/i });
    expect(returnLink.getAttribute("href")).toBe("/dashboard");
  });
});

