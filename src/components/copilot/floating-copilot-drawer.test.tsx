import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { FloatingCopilotDrawer } from "./floating-copilot-drawer";
import { CopilotChatCard } from "./copilot-chat-card";

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("FloatingCopilotDrawer Component", () => {
  const eventId = "evt-drawer-123";
  const eventName = "Pacific Climate Gala 2027";

  it("renders floating launcher with accessible dialog attributes, safe-area padding, and touch target >= 44px", () => {
    const html = renderToString(
      <FloatingCopilotDrawer eventId={eventId} eventName={eventName} />
    );

    // Accessible labeling & aria attributes
    expect(html).toContain('aria-label="AI Copilot Assistant"');
    expect(html).toContain(`aria-label="Open AI Copilot for ${eventName}"`);
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="copilot-drawer-panel"');

    // Safe area and touch target styling
    expect(html).toContain("min-h-[44px]");
    expect(html).toContain("min-w-[44px]");
    expect(html).toContain("pb-[env(safe-area-inset-bottom,0px)]");
    expect(html).toContain("pr-[env(safe-area-inset-right,0px)]");
  });

  it("renders CopilotChatCard in drawer mode with responsive single-column layout and close button", () => {
    const handleClose = vi.fn();
    const html = renderToString(
      <CopilotChatCard
        eventId={eventId}
        eventName={eventName}
        inDrawer={true}
        onClose={handleClose}
      />
    );

    // Three-part drawer layout classes
    expect(html).toContain("flex-col");
    expect(html).toContain("h-full");
    expect(html).toContain("max-h-[100dvh]");

    // Close button present and accessible
    expect(html).toContain('aria-label="Close AI Copilot"');

    // Message list with min-h-0 for flex shrinking
    expect(html).toContain("min-h-0");
    expect(html).toContain("flex-1");
    expect(html).toContain("overflow-y-auto");

    // Composer pinned to bottom with safe-area padding and shrink-0
    expect(html).toContain("shrink-0");
    expect(html).toContain("pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]");

    // Send button has min touch target
    expect(html).toContain("min-w-[44px]");
  });

  it("renders starter prompt chips in a responsive wrapping layout with overflow-wrap", () => {
    const html = renderToString(
      <CopilotChatCard
        eventId={eventId}
        eventName={eventName}
        inDrawer={true}
      />
    );

    // Starter prompts container
    expect(html).toContain("How can I assist your planning today?");
    expect(html).toContain("How can I reduce my event budget?");
    expect(html).toContain("What should I complete this week?");
    expect(html).toContain("How can I improve my current schedule?");

    // Wrapping and safe sizing classes
    expect(html).toContain("flex-col");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain("break-words");
    expect(html).toContain("[overflow-wrap:anywhere]");
  });
});

