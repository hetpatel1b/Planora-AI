/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { EventFormIdentityStage } from "@/components/events/event-form-identity-stage";
import { EVENT_TYPE_PRESETS } from "@/lib/validations/event";
import { WhatIfWorkbenchTable } from "@/components/budget/what-if-workbench-table";
import { SafeMarkdownText } from "@/components/copilot/copilot-message-bubble";
import type { BudgetItemRow } from "@/lib/validations/budget";
import {
  simulateBudgetScenario,
  type BudgetScenarioInput,
} from "@/lib/budget-simulator";

// WCAG 2.2 Relative Luminance and Contrast Ratio Algorithms
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * srgbToLinear(r / 255) +
    0.7152 * srgbToLinear(g / 255) +
    0.0722 * srgbToLinear(b / 255)
  );
}

function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Convert OKLCH lightness (with 0 chroma) to approximate sRGB lightness for grayscale tokens
function oklchLightnessToSrgbByte(l: number): number {
  const rgbNorm = Math.pow(l, 1.25); // Close approximation for perceptual grayscale
  return Math.round(Math.min(255, Math.max(0, rgbNorm * 255)));
}

describe("WCAG 2.2 Accessibility: Token Contrast & Color Compliance", () => {
  it("verifies design system CSS variables in globals.css comply with WCAG 2.2 AA", () => {
    const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Extract :root tokens
    const rootBlockMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
    expect(rootBlockMatch).not.toBeNull();
    const rootBlock = rootBlockMatch![1];

    const mutedFgMatch = rootBlock.match(/--muted-foreground:\s*oklch\(([\d.]+)\s+0\s+0\)/);
    expect(mutedFgMatch).not.toBeNull();
    const mutedFgLightness = parseFloat(mutedFgMatch![1]);

    // Ensure muted-foreground was improved to <= 0.50 (was 0.556 previously)
    expect(mutedFgLightness).toBeLessThanOrEqual(0.50);

    const fgMatch = rootBlock.match(/--foreground:\s*oklch\(([\d.]+)\s+0\s+0\)/);
    expect(fgMatch).not.toBeNull();
    const fgLightness = parseFloat(fgMatch![1]);

    const bgMatch = rootBlock.match(/--background:\s*oklch\(([\d.]+)\s+0\s+0\)/);
    expect(bgMatch).not.toBeNull();
    const bgLightness = parseFloat(bgMatch![1]);

    // Calculate sRGB luminance
    const bgByte = oklchLightnessToSrgbByte(bgLightness);
    const fgByte = oklchLightnessToSrgbByte(fgLightness);
    const mutedFgByte = oklchLightnessToSrgbByte(mutedFgLightness);

    const bgLum = relativeLuminance(bgByte, bgByte, bgByte);
    const fgLum = relativeLuminance(fgByte, fgByte, fgByte);
    const mutedFgLum = relativeLuminance(mutedFgByte, mutedFgByte, mutedFgByte);

    const fgContrast = contrastRatio(bgLum, fgLum);
    const mutedFgContrast = contrastRatio(bgLum, mutedFgLum);

    // Primary text contrast must exceed 7:1 (WCAG AAA)
    expect(fgContrast).toBeGreaterThan(10);

    // Muted text contrast must exceed 4.5:1 (WCAG AA requirement for body text)
    expect(mutedFgContrast).toBeGreaterThanOrEqual(4.5);

    // Focus ring token must be <= 0.52 to ensure >= 3:1 non-text contrast (WCAG 1.4.11)
    const ringMatch = rootBlock.match(/--ring:\s*oklch\(([\d.]+)\s+0\s+0\)/);
    expect(ringMatch).not.toBeNull();
    const ringLightness = parseFloat(ringMatch![1]);
    expect(ringLightness).toBeLessThanOrEqual(0.52);

    const ringByte = oklchLightnessToSrgbByte(ringLightness);
    const ringLum = relativeLuminance(ringByte, ringByte, ringByte);
    const ringContrast = contrastRatio(bgLum, ringLum);
    expect(ringContrast).toBeGreaterThanOrEqual(3.0);
  });
});

describe("WCAG 2.2 Accessibility: Component Semantic Structure & ARIA", () => {
  it("renders EventFormIdentityStage with complete label associations and accessible chips", () => {
    const setName = vi.fn();
    const setEventType = vi.fn();
    const setCustomEventType = vi.fn();
    const setStatus = vi.fn();

    render(
      <EventFormIdentityStage
        name="Annual Leadership Gala"
        setName={setName}
        eventType="wedding"
        setEventType={setEventType}
        isCustomType={false}
        customEventType=""
        setCustomEventType={setCustomEventType}
        status="planning"
        setStatus={setStatus}
        fieldErrors={{}}
        presets={EVENT_TYPE_PRESETS}
      />
    );

    // Check accessible inputs
    const nameInput = screen.getByLabelText(/Event Name/i);
    expect(nameInput).toBeDefined();
    expect(nameInput.getAttribute("id")).toBe("event-name");
    expect(nameInput.getAttribute("required")).not.toBeNull();

    // Check group structure for category chips
    const categoryGroup = screen.getByRole("group", { name: /Core event categories/i });
    expect(categoryGroup).toBeDefined();

    // Check category chip buttons have aria-pressed
    const weddingChip = screen.getByRole("button", { name: /Wedding & Reception/i });
    expect(weddingChip.getAttribute("aria-pressed")).toBe("true");

    const birthdayChip = screen.getByRole("button", { name: /Birthday Party/i });
    expect(birthdayChip.getAttribute("aria-pressed")).toBe("false");

    // Check status select has accessible label
    const statusSelect = screen.getByLabelText(/Planning Status/i);
    expect(statusSelect).toBeDefined();
    expect(statusSelect.getAttribute("id")).toBe("event-status");
  });

  it("renders WhatIfWorkbenchTable with semantic table structure and accessible buttons", () => {
    const mockBudgetItems: BudgetItemRow[] = [
      {
        id: "b-1",
        event_id: "evt-1",
        user_id: "usr-1",
        category: "Venue",
        item_name: "Grand Ballroom",
        estimated_amount: 10000,
        actual_amount: 9500,
        notes: null,
        plan_revision_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockScenario: BudgetScenarioInput = {
      id: "sc-1",
      name: "Optimistic",
      item_overrides: [{ id: "b-1", estimated_amount: 8000 }],
    };

    const mockSimulationResult = simulateBudgetScenario(
      15000,
      mockBudgetItems,
      mockScenario
    );

    render(
      <WhatIfWorkbenchTable
        baselineItems={mockBudgetItems}
        simulationResult={mockSimulationResult}
        currentScenario={mockScenario}
        onItemEstimateChange={vi.fn()}
        onItemDeleteToggle={vi.fn()}
        onRemoveNewItem={vi.fn()}
      />
    );

    // Check table semantics
    const table = screen.getByRole("table", { name: /Scenario Line Items Allocation/i });
    expect(table).toBeDefined();

    // Check column headers
    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(5);

    // Check item row
    const row = screen.getByRole("row", { name: /Grand Ballroom/i });
    expect(row).toBeDefined();

    // Check numerical adjustments have accessible labels
    const input = screen.getByLabelText(/Adjust estimated amount for Grand Ballroom/i);
    expect(input).toBeDefined();
    expect(input.getAttribute("type")).toBe("number");
  });

  it("renders SafeMarkdownText with clean semantic elements without dangerous innerHTML", () => {
    const markdownSample = `### Event Milestone Schedule
1. Confirm venue booking
2. Distribute invitations

| Category | Budget |
| Venue | $5,000 |`;

    const { container } = render(<SafeMarkdownText content={markdownSample} />);

    // Level 3 heading rendered as semantic h4 per design system
    const heading = screen.getByRole("heading", { level: 4 });
    expect(heading.textContent).toBe("Event Milestone Schedule");

    // Must have ordered list
    const list = screen.getByRole("list");
    expect(list.tagName.toLowerCase()).toBe("ol");

    // Must have table
    const table = container.querySelector("table");
    expect(table).not.toBeNull();

    // Zero instances of dangerouslySetInnerHTML or script tags
    expect(container.querySelectorAll("script").length).toBe(0);
  });
});
