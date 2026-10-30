/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RootError from "./error";

describe("Root Error Boundary", () => {
  it("renders global error fallback and calls reset on retry", async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();
    const mockError = new Error("Unhandled client exception") as Error & { digest?: string };

    render(<RootError error={mockError} reset={handleReset} />);

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Something Went Wrong")).toBeDefined();
    expect(screen.getByText(/An unexpected error occurred while loading this page/)).toBeDefined();

    const retryBtn = screen.getByRole("button", { name: /Try Again/i });
    await user.click(retryBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);

    const homeLink = screen.getByRole("link", { name: /Return Home/i });
    expect(homeLink.getAttribute("href")).toBe("/");
  });
});

