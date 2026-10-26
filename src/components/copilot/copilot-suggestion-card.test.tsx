import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  SuggestedTaskCard,
  SuggestedBudgetItemCard,
  RecommendationsList,
} from "./copilot-suggestion-card";

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("SuggestedTaskCard", () => {
  const eventId = "123e4567-e89b-12d3-a456-426614174000";

  it("renders task title, priority, and 'Add to Checklist' action", () => {
    const task = {
      title: "Book Photography Team",
      priority: "high" as const,
      description: "Secure lead shooter and second shooter",
      is_vendor_checklist: true,
      due_date: "2026-11-01T00:00:00.000Z",
      suggested_days_before: 30,
    };

    const html = renderToString(
      <SuggestedTaskCard eventId={eventId} task={task} index={0} />
    );

    expect(html).toContain("Book Photography Team");
    expect(html).toContain("High");
    expect(html).toContain("Secure lead shooter and second shooter");
    expect(html).toContain("Vendor Checklist");
    expect(html).toContain("Due: 2026-11-01");
    expect(html).toContain("Add to Checklist");
  });

  it("computes relative due date when due_date is null but suggested_days_before is provided", () => {
    const task = {
      title: "Send Menu Tasting Invites",
      priority: "medium" as const,
      description: null,
      is_vendor_checklist: false,
      due_date: null,
      suggested_days_before: 14,
    };

    const html = renderToString(
      <SuggestedTaskCard
        eventId={eventId}
        eventDate="2026-11-20T00:00:00.000Z"
        task={task}
        index={1}
      />
    );

    expect(html).toContain("Send Menu Tasting Invites");
    expect(html).toContain("Due: 2026-11-06");
    expect(html).toContain("Add to Checklist");
  });
});

describe("SuggestedBudgetItemCard", () => {
  const eventId = "123e4567-e89b-12d3-a456-426614174000";

  it("renders budget item details, category, formatted amount, and 'Add to Budget' action", () => {
    const item = {
      category: "Catering & Bar",
      item_name: "Mocktail Bar Package",
      estimated_amount: 1250.5,
      notes: "Includes 3 specialty mocktails and glassware",
    };

    const html = renderToString(
      <SuggestedBudgetItemCard eventId={eventId} item={item} index={0} />
    );

    expect(html).toContain("Mocktail Bar Package");
    expect(html).toContain("Catering &amp; Bar");
    expect(html).toContain("$1,250.50");
    expect(html).toContain("Includes 3 specialty mocktails and glassware");
    expect(html).toContain("Add to Budget");
  });

  it("renders budget item cleanly when notes are omitted", () => {
    const item = {
      category: "Decor & Styling",
      item_name: "Fairy Lights",
      estimated_amount: 350,
      notes: null,
    };

    const html = renderToString(
      <SuggestedBudgetItemCard eventId={eventId} item={item} index={1} />
    );

    expect(html).toContain("Fairy Lights");
    expect(html).toContain("Decor &amp; Styling");
    expect(html).toContain("$350.00");
    expect(html).toContain("Add to Budget");
  });
});

describe("RecommendationsList", () => {
  it("renders list of recommendations with advisory styling", () => {
    const recs = [
      "Confirm final guest count with venue 10 days before.",
      "Reserve backup indoor space in case of rain.",
    ];

    const html = renderToString(<RecommendationsList recommendations={recs} />);

    expect(html).toContain("Advisory Recommendations");
    expect(html).toContain("Confirm final guest count with venue 10 days before.");
    expect(html).toContain("Reserve backup indoor space in case of rain.");
  });

  it("returns null when recommendations array is empty", () => {
    const html = renderToString(<RecommendationsList recommendations={[]} />);
    expect(html).toBe("");
  });
});
