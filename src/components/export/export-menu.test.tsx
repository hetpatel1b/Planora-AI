/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportMenu } from "./export-menu";
import { PrintButton } from "./print-button";

// Mock CSV download utility
const mockTriggerCsvDownload = vi.fn();
vi.mock("@/lib/download-csv", () => ({
  triggerCsvDownload: (url: string, filename: string) =>
    mockTriggerCsvDownload(url, filename),
}));

describe("Export UI Components", () => {
  const eventId = "11111111-1111-4111-a111-111111111111";
  const eventName = "Planora Tech Summit 2026";

  beforeEach(() => {
    vi.clearAllMocks();
    mockTriggerCsvDownload.mockResolvedValue({ success: true });
  });

  describe("ExportMenu Component", () => {
    it("renders trigger button with correct attributes and accessibility labels", () => {
      render(
        <ExportMenu eventId={eventId} eventName={eventName} className="custom-class" />
      );

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      expect(trigger).toBeDefined();
      expect(trigger.getAttribute("id")).toBe("export-menu-trigger");
      expect(trigger.getAttribute("aria-haspopup")).toBe("true");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });

    it("opens menu and auto-focuses first menuitem on click", async () => {
      const user = userEvent.setup();
      render(<ExportMenu eventId={eventId} eventName={eventName} />);

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      await user.click(trigger);

      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const menu = screen.getByRole("menu");
      expect(menu).toBeDefined();

      const pdfItem = screen.getByRole("menuitem", { name: /Event Dossier \(PDF\)/i });
      expect(pdfItem).toBeDefined();
      expect(document.activeElement).toBe(pdfItem);
    });

    it("opens menu when user presses ArrowDown on the trigger button", async () => {
      render(<ExportMenu eventId={eventId} eventName={eventName} />);

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      fireEvent.keyDown(trigger, { key: "ArrowDown" });

      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const pdfItem = screen.getByRole("menuitem", { name: /Event Dossier \(PDF\)/i });
      expect(pdfItem).toBeDefined();
    });

    it("navigates forward through menu items with ArrowDown and wraps to start", async () => {
      const user = userEvent.setup();
      render(<ExportMenu eventId={eventId} eventName={eventName} />);

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      await user.click(trigger);

      const pdfItem = screen.getByRole("menuitem", { name: /Event Dossier \(PDF\)/i });
      const tasksItem = screen.getByRole("menuitem", { name: /Checklist Tasks \(CSV\)/i });
      const budgetItem = screen.getByRole("menuitem", { name: /Budget Ledger \(CSV\)/i });

      // Starts at first item
      expect(document.activeElement).toBe(pdfItem);

      // Down arrow -> tasks
      fireEvent.keyDown(pdfItem, { key: "ArrowDown" });
      expect(document.activeElement).toBe(tasksItem);

      // Down arrow -> budget
      fireEvent.keyDown(tasksItem, { key: "ArrowDown" });
      expect(document.activeElement).toBe(budgetItem);

      // Down arrow wraps -> pdf
      fireEvent.keyDown(budgetItem, { key: "ArrowDown" });
      expect(document.activeElement).toBe(pdfItem);
    });

    it("navigates backward through menu items with ArrowUp and wraps to end", async () => {
      const user = userEvent.setup();
      render(<ExportMenu eventId={eventId} eventName={eventName} />);

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      await user.click(trigger);

      const pdfItem = screen.getByRole("menuitem", { name: /Event Dossier \(PDF\)/i });
      const budgetItem = screen.getByRole("menuitem", { name: /Budget Ledger \(CSV\)/i });

      expect(document.activeElement).toBe(pdfItem);

      // Up arrow wraps -> budget
      fireEvent.keyDown(pdfItem, { key: "ArrowUp" });
      expect(document.activeElement).toBe(budgetItem);
    });

    it("jumps to first item on Home key and last item on End key", async () => {
      const user = userEvent.setup();
      render(<ExportMenu eventId={eventId} eventName={eventName} />);

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      await user.click(trigger);

      const pdfItem = screen.getByRole("menuitem", { name: /Event Dossier \(PDF\)/i });
      const budgetItem = screen.getByRole("menuitem", { name: /Budget Ledger \(CSV\)/i });

      fireEvent.keyDown(pdfItem, { key: "End" });
      expect(document.activeElement).toBe(budgetItem);

      fireEvent.keyDown(budgetItem, { key: "Home" });
      expect(document.activeElement).toBe(pdfItem);
    });

    it("closes menu and restores focus to trigger on Escape key press", async () => {
      const user = userEvent.setup();
      render(<ExportMenu eventId={eventId} eventName={eventName} />);

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      await user.click(trigger);

      expect(screen.queryByRole("menu")).not.toBeNull();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByRole("menu")).toBeNull();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger);
    });

    it("triggers CSV download on button click and closes menu upon success", async () => {
      const user = userEvent.setup();
      render(<ExportMenu eventId={eventId} eventName={eventName} />);

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      await user.click(trigger);

      const tasksBtn = screen.getByRole("menuitem", { name: /Checklist Tasks \(CSV\)/i });
      await user.click(tasksBtn);

      expect(mockTriggerCsvDownload).toHaveBeenCalledWith(
        `/api/events/${eventId}/export/tasks`,
        `planora-${eventId}-tasks.csv`
      );

      await waitFor(() => {
        expect(screen.queryByRole("menu")).toBeNull();
      });
    });

    it("displays error alert inside menu when CSV download fails", async () => {
      mockTriggerCsvDownload.mockResolvedValueOnce({
        success: false,
        error: "Network error occurred while fetching CSV",
      });

      const user = userEvent.setup();
      render(<ExportMenu eventId={eventId} eventName={eventName} />);

      const trigger = screen.getByRole("button", { name: `Export options for ${eventName}` });
      await user.click(trigger);

      const budgetBtn = screen.getByRole("menuitem", { name: /Budget Ledger \(CSV\)/i });
      await user.click(budgetBtn);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert.textContent).toContain("Network error occurred while fetching CSV");
      });
    });
  });

  describe("PrintButton Component", () => {
    it("renders print button with print:hidden class and accessibility label", () => {
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

      render(<PrintButton eventName={eventName} />);

      const button = screen.getByRole("button", {
        name: `Print or save event dossier for ${eventName} as PDF`,
      });
      expect(button).toBeDefined();
      expect(button.getAttribute("id")).toBe("print-pdf-button");
      expect(button.className).toContain("print:hidden");

      printSpy.mockRestore();
    });
  });
});
