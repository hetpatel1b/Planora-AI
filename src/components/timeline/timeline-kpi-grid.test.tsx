/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TimelineKpiGrid } from "./timeline-kpi-grid";
import type { TaskSummary } from "@/lib/task-math";

describe("TimelineKpiGrid Component", () => {
  const sampleMetrics: TaskSummary = {
    total: 10,
    completed: 4,
    inProgress: 2,
    pending: 3,
    cancelled: 1,
    activeNonCompleted: 5,
    overdue: 2,
    vendorCount: 3,
    completedVendorCount: 1,
    completionRate: 40,
    vendorCompletionRate: 33,
  };

  it("renders deliverable metrics and completion percentages accurately", () => {
    render(<TimelineKpiGrid metrics={sampleMetrics} />);

    expect(screen.getByText("Total Deliverables")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();

    expect(screen.getByText("Completed")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("(40%)")).toBeDefined();

    expect(screen.getByText("Remaining Pending")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined(); // pending (3) + inProgress (2)

    expect(screen.getByText("Overdue")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();

    expect(screen.getByText("Vendor Items")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("(1 done)")).toBeDefined();

    const progressBar = screen.getByRole("progressbar", {
      name: "Overall timeline progress: 40 percent",
    });
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("40");
  });

  it("renders non-overdue state cleanly when overdue count is zero", () => {
    const zeroOverdueMetrics: TaskSummary = {
      ...sampleMetrics,
      overdue: 0,
    };

    const { container } = render(<TimelineKpiGrid metrics={zeroOverdueMetrics} />);
    expect(screen.getByText("Overdue")).toBeDefined();
    expect(screen.getByText("0")).toBeDefined();
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });
});

