import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { CopilotChatCard } from "./copilot-chat-card";

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("CopilotChatCard", () => {
  const eventId = "123e4567-e89b-12d3-a456-426614174000";

  it("renders header, title, badge, and contextual event name", () => {
    const html = renderToString(
      <CopilotChatCard
        eventId={eventId}
        eventName="Summer Music Festival"
        eventDate="2026-08-15"
      />
    );

    expect(html).toContain("Conversational AI Copilot");
    expect(html).toContain("Phase 5 Copilot");
    expect(html).toContain("Summer Music Festival");
  });

  it("renders starter prompt chips in the empty conversation state", () => {
    const html = renderToString(
      <CopilotChatCard eventId={eventId} eventName="Charity Run" />
    );

    expect(html).toContain("How can I assist your planning today?");
    expect(html).toContain("How can I reduce my event budget?");
    expect(html).toContain("What should I complete this week?");
    expect(html).toContain("How can I improve my current schedule?");
  });

  it("renders accessible input textarea, character counter, and send button", () => {
    const html = renderToString(
      <CopilotChatCard eventId={eventId} eventName="Charity Run" />
    );

    expect(html).toContain('aria-label="Ask the Copilot a planning question"');
    expect(html).toContain("0/2,000");
    expect(html).toContain("Send");
  });

  it("includes live region element for screen reader status announcements", () => {
    const html = renderToString(
      <CopilotChatCard eventId={eventId} eventName="Tech Gala" />
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("sr-only");
  });
});
