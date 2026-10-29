/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CopilotChatCard,
  SafeMarkdownText,
  parseMarkdownBlocks,
  AssistantMessageBubble,
} from "./copilot-chat-card";

// Mock server action boundaries
const mockAskCopilotAction = vi.fn();
vi.mock("@/lib/actions/copilot", () => ({
  askCopilotAction: (payload: unknown) => mockAskCopilotAction(payload),
}));

vi.mock("@/lib/actions/tasks", () => ({
  createTaskAction: vi.fn(),
}));

vi.mock("@/lib/actions/budget", () => ({
  createBudgetItemAction: vi.fn(),
}));

// Mock next/navigation useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("CopilotChatCard Component", () => {
  const eventId = "123e4567-e89b-12d3-a456-426614174000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DOM Structure & Baseline Rendering", () => {
    it("renders header, title, badge, and contextual event name", () => {
      render(
        <CopilotChatCard
          eventId={eventId}
          eventName="Summer Music Festival"
          eventDate="2026-08-15"
        />
      );

      expect(screen.getByText("Conversational AI Copilot")).toBeDefined();
      expect(screen.getByText("Phase 5 Copilot")).toBeDefined();
      expect(screen.getByText(/Summer Music Festival/i)).toBeDefined();
    });

    it("renders starter prompt chips in the empty conversation state", () => {
      render(
        <CopilotChatCard eventId={eventId} eventName="Charity Run" />
      );

      expect(screen.getByText("How can I assist your planning today?")).toBeDefined();
      expect(screen.getByRole("button", { name: "How can I reduce my event budget?" })).toBeDefined();
      expect(screen.getByRole("button", { name: "What should I complete this week?" })).toBeDefined();
      expect(screen.getByRole("button", { name: "How can I improve my current schedule?" })).toBeDefined();
    });

    it("renders accessible input textarea, character counter, and send button", () => {
      render(
        <CopilotChatCard eventId={eventId} eventName="Charity Run" />
      );

      const textarea = screen.getByLabelText("Ask the Copilot a planning question");
      expect(textarea).toBeDefined();
      expect(screen.getByText("0/2,000")).toBeDefined();
      expect(screen.getByRole("button", { name: /Send/i })).toBeDefined();
    });

    it("includes live region element for screen reader status announcements", () => {
      render(
        <CopilotChatCard eventId={eventId} eventName="Tech Gala" />
      );

      const statusRegion = document.querySelector('div[role="status"]');
      expect(statusRegion).not.toBeNull();
      expect(statusRegion?.getAttribute("aria-live")).toBe("polite");
      expect(statusRegion?.className).toContain("sr-only");
    });
  });

  describe("Interactive Text Entry & Keyboard Shortcuts", () => {
    it("updates character counter as user types into chat input", async () => {
      const user = userEvent.setup();
      render(<CopilotChatCard eventId={eventId} eventName="Tech Gala" />);

      const textarea = screen.getByLabelText("Ask the Copilot a planning question");
      await user.type(textarea, "What are the catering options?");

      expect(screen.getByDisplayValue("What are the catering options?")).toBeDefined();
      expect(screen.getByText("30/2,000")).toBeDefined();
    });

    it("submits message on Enter key press without Shift", async () => {
      const user = userEvent.setup();
      mockAskCopilotAction.mockResolvedValueOnce({
        success: true,
        data: {
          reply: "We recommend plant-based catering options.",
          suggestions: null,
        },
      });

      render(<CopilotChatCard eventId={eventId} eventName="Tech Gala" />);

      const textarea = screen.getByLabelText("Ask the Copilot a planning question");
      await user.type(textarea, "Tell me about catering{Enter}");

      await waitFor(() => {
        expect(mockAskCopilotAction).toHaveBeenCalledTimes(1);
      });

      expect(mockAskCopilotAction).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId,
          messages: [
            expect.objectContaining({
              role: "user",
              content: "Tell me about catering",
            }),
          ],
        })
      );
    });

    it("does not submit on Shift+Enter and permits multiline entry", async () => {
      const user = userEvent.setup();
      render(<CopilotChatCard eventId={eventId} eventName="Tech Gala" />);

      const textarea = screen.getByLabelText("Ask the Copilot a planning question");
      await user.type(textarea, "First line{Shift>}{Enter}{/Shift}Second line");

      expect(mockAskCopilotAction).not.toHaveBeenCalled();
      expect((textarea as HTMLTextAreaElement).value).toContain("First line\nSecond line");
    });
  });

  describe("Starter Prompt Chips & Loading States", () => {
    it("submits prompt immediately when clicking a starter prompt chip", async () => {
      const user = userEvent.setup();
      mockAskCopilotAction.mockResolvedValueOnce({
        success: true,
        data: {
          reply: "Here are budget reduction strategies...",
          suggestions: null,
        },
      });

      render(<CopilotChatCard eventId={eventId} eventName="Charity Run" />);

      const budgetChip = screen.getByRole("button", { name: "How can I reduce my event budget?" });
      await user.click(budgetChip);

      await waitFor(() => {
        expect(mockAskCopilotAction).toHaveBeenCalledTimes(1);
      });

      expect(mockAskCopilotAction).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId,
          messages: [
            expect.objectContaining({
              role: "user",
              content: "How can I reduce my event budget?",
            }),
          ],
        })
      );
    });

    it("displays loading bubble and disables inputs while Copilot request is pending", async () => {
      const user = userEvent.setup();
      let resolveAction: (val: unknown) => void = () => {};
      mockAskCopilotAction.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveAction = resolve;
        })
      );

      render(<CopilotChatCard eventId={eventId} eventName="Charity Run" />);

      const textarea = screen.getByLabelText("Ask the Copilot a planning question");
      await user.type(textarea, "Analyze schedule");

      const sendBtn = screen.getByRole("button", { name: /Send/i });
      await user.click(sendBtn);

      // Loading bubble is visible
      expect(screen.getByText(/Analyzing event context and synthesizing recommendations/i)).toBeDefined();

      // Input and submit button are disabled
      expect((textarea as HTMLTextAreaElement).disabled).toBe(true);

      // Status region announces pending state
      const statusRegion = document.querySelector('div[role="status"]');
      expect(statusRegion?.textContent).toContain("Copilot is analyzing your question");

      // Resolve the pending promise
      resolveAction({
        success: true,
        data: { reply: "Analysis complete.", suggestions: null },
      });

      await waitFor(() => {
        expect(screen.getByText("Analysis complete.")).toBeDefined();
      });

      expect((textarea as HTMLTextAreaElement).disabled).toBe(false);
    });
  });

  describe("Assistant Responses & Suggestion Proposals", () => {
    it("renders assistant reply and proposal cards for tasks and budget items", async () => {
      const user = userEvent.setup();
      mockAskCopilotAction.mockResolvedValueOnce({
        success: true,
        data: {
          reply: "Here is your operational update.",
          suggestions: {
            suggestedTasks: [
              {
                title: "Book Audio-Visual Engineer",
                description: "Coordinate microphones and soundboard setup",
                priority: "high" as const,
                is_vendor_checklist: true,
                suggested_days_before: 14,
                due_date: null,
              },
            ],
            suggestedBudgetItems: [
              {
                category: "Entertainment & AV",
                item_name: "High-Definition Projection",
                estimated_amount: 18000,
                notes: "Stage backdrop projection system",
              },
            ],
            recommendations: ["Ensure power backup for projection equipment."],
          },
        },
      });

      render(<CopilotChatCard eventId={eventId} eventName="Tech Gala" />);

      const textarea = screen.getByLabelText("Ask the Copilot a planning question");
      await user.type(textarea, "Plan AV details");
      await user.click(screen.getByRole("button", { name: /Send/i }));

      // Assistant message bubble text
      await waitFor(() => {
        expect(screen.getByText("Here is your operational update.")).toBeDefined();
      });

      // Proposed tasks header & task card
      expect(screen.getByText("Proposed Checklist Tasks")).toBeDefined();
      expect(screen.getByText("Book Audio-Visual Engineer")).toBeDefined();

      // Proposed budget header & budget card
      expect(screen.getByText("Proposed Budget Allocations")).toBeDefined();
      expect(screen.getByText("High-Definition Projection")).toBeDefined();
      expect(screen.getByText("₹18,000.00")).toBeDefined();

      // Advisory recommendations
      expect(screen.getByText("Ensure power backup for projection equipment.")).toBeDefined();
    });

    it("clears conversation log and restores starter prompts when Clear button is clicked", async () => {
      const user = userEvent.setup();
      mockAskCopilotAction.mockResolvedValueOnce({
        success: true,
        data: { reply: "First answer.", suggestions: null },
      });

      render(<CopilotChatCard eventId={eventId} eventName="Tech Gala" />);

      await user.type(screen.getByLabelText("Ask the Copilot a planning question"), "Hello");
      await user.click(screen.getByRole("button", { name: /Send/i }));

      await waitFor(() => {
        expect(screen.getByText("First answer.")).toBeDefined();
      });

      // Clear button is now visible
      const clearBtn = screen.getByRole("button", { name: "Clear" });
      await user.click(clearBtn);

      // Returned to starter prompt state
      expect(screen.getByText("How can I assist your planning today?")).toBeDefined();
      expect(screen.queryByText("First answer.")).toBeNull();
    });
  });

  describe("Error Handling & Retry Mechanism", () => {
    it("displays error banner and retry button when askCopilotAction returns an error", async () => {
      const user = userEvent.setup();
      mockAskCopilotAction.mockResolvedValueOnce({
        success: false,
        error: "Rate limit reached. Please wait before asking another question.",
      });

      render(<CopilotChatCard eventId={eventId} eventName="Tech Gala" />);

      await user.type(screen.getByLabelText("Ask the Copilot a planning question"), "Fast question");
      await user.click(screen.getByRole("button", { name: /Send/i }));

      await waitFor(() => {
        expect(screen.getByText("Rate limit reached. Please wait before asking another question.")).toBeDefined();
      });

      const retryBtn = screen.getByRole("button", { name: "Retry" });
      expect(retryBtn).toBeDefined();

      // Click retry
      mockAskCopilotAction.mockResolvedValueOnce({
        success: true,
        data: { reply: "Retried response successfully received.", suggestions: null },
      });

      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText("Retried response successfully received.")).toBeDefined();
      });
    });

    it("displays error message when input exceeds 2,000 characters and rejects submission", async () => {
      render(<CopilotChatCard eventId={eventId} eventName="Tech Gala" />);

      const textarea = screen.getByLabelText("Ask the Copilot a planning question");
      const longText = "A".repeat(2001);

      fireEvent.change(textarea, { target: { value: longText } });

      const form = textarea.closest("form")!;
      fireEvent.submit(form);

      expect(screen.getByText("Message cannot exceed 2,000 characters.")).toBeDefined();
      expect(mockAskCopilotAction).not.toHaveBeenCalled();
    });
  });
});

describe("AssistantMessageBubble Expand/Collapse Interaction", () => {
  const eventId = "123e4567-e89b-12d3-a456-426614174000";

  it("renders concise messages completely without collapse toggle button", () => {
    const msg = {
      id: "msg-concise-1",
      role: "assistant" as const,
      content: "**Recommendation:** Review vendor quotes before finalizing caterers.",
      suggestions: null,
    };

    render(<AssistantMessageBubble msg={msg} eventId={eventId} />);

    expect(screen.getByText("Review vendor quotes before finalizing caterers.")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Show full response/i })).toBeNull();
  });

  it("toggles expanded state when clicking 'Show full response' and 'Show less'", async () => {
    const user = userEvent.setup();
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

    render(<AssistantMessageBubble msg={msg} eventId={eventId} />);

    const toggleBtn = screen.getByRole("button", { name: /Show full response/i });
    expect(toggleBtn).toBeDefined();
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");

    await user.click(toggleBtn);

    expect(screen.getByRole("button", { name: /Show less/i })).toBeDefined();
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");

    await user.click(toggleBtn);

    expect(screen.getByRole("button", { name: /Show full response/i })).toBeDefined();
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("SafeMarkdownText & parseMarkdownBlocks (Preserved Parser Tests)", () => {
  it("renders headings with appropriate hierarchy tags", () => {
    const content = "## Major Milestone\n### Immediate Next Actions";
    render(<SafeMarkdownText content={content} />);

    expect(screen.getByText("Major Milestone")).toBeDefined();
    expect(screen.getByText("Immediate Next Actions")).toBeDefined();
  });

  it("renders unordered lists with bullet markers cleanly", () => {
    const content = "**Priorities:**\n- Finalize banquet hall\n- Verify AV equipment\n- Send invitations";
    render(<SafeMarkdownText content={content} />);

    expect(screen.getByText("Finalize banquet hall")).toBeDefined();
    expect(screen.getByText("Verify AV equipment")).toBeDefined();
    expect(screen.getByText("Send invitations")).toBeDefined();
  });

  it("renders ordered lists with decimal numbers", () => {
    const content = "1. Sign catering agreement\n2. Pay initial deposit\n3. Confirm menu tasting";
    render(<SafeMarkdownText content={content} />);

    expect(screen.getByText("Sign catering agreement")).toBeDefined();
    expect(screen.getByText("Pay initial deposit")).toBeDefined();
    expect(screen.getByText("Confirm menu tasting")).toBeDefined();
  });

  it("splits and formats inline numbered text into separate list items", () => {
    const content = "Key recommendations: 1. Confirm date 2. Set target budget 3. Reserve hall";
    render(<SafeMarkdownText content={content} />);

    expect(screen.getByText(/Confirm date/)).toBeDefined();
    expect(screen.getByText(/Set target budget/)).toBeDefined();
    expect(screen.getByText(/Reserve hall/)).toBeDefined();
  });

  it("parses bold segments cleanly within text blocks", () => {
    const blocks = parseMarkdownBlocks("The **catering contract** is due for signature by **5 PM tomorrow**.");
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].text).toContain("**catering contract**");
  });

  it("renders inline code formatting with distinct styling", () => {
    const content = "Execute `npm run build` to verify the production compilation.";
    render(<SafeMarkdownText content={content} />);

    const codeEl = screen.getByText("npm run build");
    expect(codeEl.tagName.toLowerCase()).toBe("code");
  });

  it("safely handles empty content without throwing or rendering invalid tags", () => {
    const { container } = render(<SafeMarkdownText content="" />);
    expect(container.firstChild).toBeDefined();
  });

  it("renders markdown table data rows and columns cleanly", () => {
    const content = [
      "| Category | Projected (INR) | Status |",
      "| :--- | :--- | :--- |",
      "| Venue Hall | ₹50,000 | Confirmed |",
      "| Audio Visual | ₹20,000 | Pending |",
    ].join("\n");

    render(<SafeMarkdownText content={content} />);

    expect(screen.getByText("Category")).toBeDefined();
    expect(screen.getByText("Projected (INR)")).toBeDefined();
    expect(screen.getByText("Venue Hall")).toBeDefined();
    expect(screen.getByText("Audio Visual")).toBeDefined();
    expect(screen.getByText("Confirmed")).toBeDefined();
  });
});
