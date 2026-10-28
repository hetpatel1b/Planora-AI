import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  CopilotChatCard,
  SafeMarkdownText,
  parseMarkdownBlocks,
  AssistantMessageBubble,
} from "./copilot-chat-card";

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

describe("SafeMarkdownText & parseMarkdownBlocks", () => {
  it("renders headings with appropriate hierarchy tags", () => {
    const content = "## Major Milestone\n### Immediate Next Actions";
    const html = renderToString(<SafeMarkdownText content={content} />);

    expect(html).toContain("<h3");
    expect(html).toContain("Major Milestone");
    expect(html).toContain("<h4");
    expect(html).toContain("Immediate Next Actions");
  });

  it("renders unordered lists with bullet markers cleanly", () => {
    const content = "**Priorities:**\n- Finalize banquet hall\n- Verify AV equipment\n- Send invitations";
    const html = renderToString(<SafeMarkdownText content={content} />);

    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Finalize banquet hall");
    expect(html).toContain("Verify AV equipment");
    expect(html).toContain("Send invitations");
  });

  it("renders ordered lists with decimal numbers", () => {
    const content = "1. Sign catering agreement\n2. Pay initial deposit\n3. Confirm menu tasting";
    const html = renderToString(<SafeMarkdownText content={content} />);

    expect(html).toContain("<ol");
    expect(html).toContain("<li");
    expect(html).toContain("Sign catering agreement");
    expect(html).toContain("Pay initial deposit");
    expect(html).toContain("Confirm menu tasting");
  });

  it("splits and formats inline numbered text into separate list items", () => {
    const content = "1. Reserve hall. 2. Book photographer. 3. Finalize playlist.";
    const html = renderToString(<SafeMarkdownText content={content} />);

    expect(html).toContain("<ol");
    expect(html).toContain("Reserve hall.");
    expect(html).toContain("Book photographer.");
    expect(html).toContain("Finalize playlist.");
  });

  it("renders inline bold, inline code, and safe links", () => {
    const content = "Check the `What-If Simulator` for **immediate savings** or view [our guidelines](https://planora.ai/docs).";
    const html = renderToString(<SafeMarkdownText content={content} />);

    expect(html).toContain("<strong");
    expect(html).toContain("immediate savings");
    expect(html).toContain("<code");
    expect(html).toContain("What-If Simulator");
    expect(html).toContain("<a href=\"https://planora.ai/docs\"");
    expect(html).toContain("target=\"_blank\"");
    expect(html).toContain("our guidelines");
  });

  it("renders markdown tables in horizontally scrollable containers", () => {
    const content = "| Category | Target | Actual |\n|---|---|---|\n| Catering | ₹50,000 | ₹45,000 |\n| Decor | ₹20,000 | ₹18,500 |";
    const html = renderToString(<SafeMarkdownText content={content} />);

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("Category");
    expect(html).toContain("₹50,000");
    expect(html).toContain("₹45,000");
    expect(html).toContain("Decor");
  });

  it("parses empty and whitespace content safely", () => {
    const blocks = parseMarkdownBlocks("   ");
    expect(blocks).toEqual([]);
  });
});

describe("AssistantMessageBubble", () => {
  const eventId = "123e4567-e89b-12d3-a456-426614174000";

  it("renders concise messages completely without collapse toggle button", () => {
    const msg = {
      id: "msg-concise-1",
      role: "assistant" as const,
      content: "**Recommendation:** Review vendor quotes before finalizing caterers.",
      suggestions: null,
    };

    const html = renderToString(
      <AssistantMessageBubble msg={msg} eventId={eventId} />
    );

    expect(html).toContain("Review vendor quotes before finalizing caterers.");
    expect(html).not.toContain("Show full response");
    expect(html).not.toContain("Show less");
  });

  it("renders extensive messages with accessible 'Show full response' button and aria attributes", () => {
    const extensiveContent = [
      "**Budget Status:** Target budget ceiling is maintained with remaining variance of ₹45,000.",
      "### Comprehensive Optimization Strategy",
      "1. Negotiate minimum guest guarantee with banquet manager to reduce per-plate costs.",
      "2. Package sound, stage lighting, and microphones under a single vendor contract.",
      "3. Restrict open bar duration to 3 hours with a curated cocktail menu.",
      "4. Eliminate custom stage backdrops in favor of venue-provided modular LED walls.",
      "5. Schedule load-in early morning to prevent overtime labor surcharges.",
      "6. Confirm final attendee numbers 7 days prior to prevent excess meal billing.",
      "7. Review electricity load capacity to ensure audio equipment does not trip breakers.",
    ].join("\n\n");

    const msg = {
      id: "msg-extensive-1",
      role: "assistant" as const,
      content: extensiveContent,
      suggestions: null,
    };

    const html = renderToString(
      <AssistantMessageBubble msg={msg} eventId={eventId} />
    );

    expect(html).toContain("Show full response");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="msg-content-msg-extensive-1"');
  });

  it("renders proposed tasks and budget items in dedicated container below text", () => {
    const msg = {
      id: "msg-suggestions-1",
      role: "assistant" as const,
      content: "These 2 actions address your audio-visual shortfall. Review the proposals below.",
      suggestions: {
        suggestedTasks: [
          {
            title: "Confirm AV load-in window",
            description: "Coordinate with venue hall manager",
            priority: "high" as const,
            is_vendor_checklist: true,
            suggested_days_before: 7,
            due_date: null,
          },
        ],
        suggestedBudgetItems: [
          {
            category: "Entertainment & AV",
            item_name: "Wireless Microphones & Monitor",
            estimated_amount: 15000,
            notes: "Package deal quote",
          },
        ],
        recommendations: ["Ensure testing 2 hours prior to doors opening."],
      },
    };

    const html = renderToString(
      <AssistantMessageBubble msg={msg} eventId={eventId} />
    );

    expect(html).toContain("Proposed Checklist Tasks");
    expect(html).toContain("Confirm AV load-in window");
    expect(html).toContain("Proposed Budget Allocations");
    expect(html).toContain("Wireless Microphones &amp; Monitor");
    expect(html).toContain("₹15,000.00");
    expect(html).toContain("Ensure testing 2 hours prior to doors opening.");
  });
});
