import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { WhatIfSimulator } from "./what-if-simulator";
import type { BudgetItemRow } from "@/lib/validations/budget";

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("WhatIfSimulator Component", () => {
  const eventId = "22222222-2222-4222-a222-222222222222";
  const baselineTargetBudget = 25000; // $25,000.00
  const baselineItems: BudgetItemRow[] = [
    {
      id: "item-catering",
      event_id: eventId,
      user_id: "user-1",
      plan_revision_id: null,
      category: "Catering & Bar",
      item_name: "Gourmet Buffet",
      estimated_amount: 10000, // $10,000.00
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
      estimated_amount: 5000, // $5,000.00
      actual_amount: 4500,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it("renders header, scenario tabs, and simulator mode badge", () => {
    const html = renderToString(
      <WhatIfSimulator
        eventId={eventId}
        baselineTargetBudget={baselineTargetBudget}
        baselineItems={baselineItems}
      />
    );

    expect(html).toContain("What-If Budget Simulator");
    expect(html).toContain("In-Memory Draft");
    expect(html).toContain("Scenario A: Vendor Adjustments");
    expect(html).toContain("Scenario B: Budget Optimization");
  });

  it("renders live financial summary cards with formatted currency", () => {
    const html = renderToString(
      <WhatIfSimulator
        eventId={eventId}
        baselineTargetBudget={baselineTargetBudget}
        baselineItems={baselineItems}
      />
    );

    expect(html).toContain("Projected Spend");
    expect(html).toContain("Baseline:");
    expect(html).toContain("Remaining Cushion");
    expect(html).toContain("₹15,000.00");
  });

  it("renders baseline line items with interactive adjustment controls", () => {
    const html = renderToString(
      <WhatIfSimulator
        eventId={eventId}
        baselineTargetBudget={baselineTargetBudget}
        baselineItems={baselineItems}
      />
    );

    expect(html).toContain("Gourmet Buffet");
    expect(html).toContain("Sound &amp; Stage Lighting");
    expect(html).toContain("₹10,000.00");
    expect(html).toContain("₹5,000.00");
    expect(html).toContain('aria-label="Adjust estimated amount for Gourmet Buffet"');
  });

  it("renders empty state notice when baseline budget items list is empty", () => {
    const html = renderToString(
      <WhatIfSimulator
        eventId={eventId}
        baselineTargetBudget={baselineTargetBudget}
        baselineItems={[]}
      />
    );

    expect(html).toContain("No baseline budget items found.");
    expect(html).toContain("Add Candidate Item");
  });

  it("renders Review & Apply button and Reset action with accessible attributes", () => {
    const html = renderToString(
      <WhatIfSimulator
        eventId={eventId}
        baselineTargetBudget={baselineTargetBudget}
        baselineItems={baselineItems}
      />
    );

    expect(html).toContain("Review &amp; Apply Changes to Live Budget");
    expect(html).toContain("Reset Baseline");
    expect(html).toContain('aria-live="polite"');
  });
});
