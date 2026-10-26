import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { ExportMenu } from "./export-menu";
import { PrintButton } from "./print-button";

describe("Export UI Components", () => {
  const eventId = "11111111-1111-4111-a111-111111111111";
  const eventName = "Planora Tech Summit 2026";

  describe("ExportMenu Component", () => {
    it("renders trigger button with correct attributes and accessibility labels", () => {
      const html = renderToString(
        <ExportMenu eventId={eventId} eventName={eventName} className="custom-class" />
      );

      expect(html).toContain("Export");
      expect(html).toContain('id="export-menu-trigger"');
      expect(html).toContain('aria-haspopup="true"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain(`aria-label="Export options for ${eventName}"`);
      expect(html).toContain("custom-class");
    });
  });

  describe("PrintButton Component", () => {
    let originalWindow: typeof global.window;
    let originalDocument: typeof global.document;

    beforeEach(() => {
      originalWindow = global.window;
      originalDocument = global.document;

      // Setup window and document mocks
      // @ts-expect-error Mocking window in node environment
      global.window = {
        print: vi.fn(),
      };

      // @ts-expect-error Mocking document in node environment
      global.document = {
        title: "Original Title",
      };
    });

    afterEach(() => {
      global.window = originalWindow;
      global.document = originalDocument;
      vi.restoreAllMocks();
    });

    it("renders print button with print:hidden class and accessibility label", () => {
      const html = renderToString(<PrintButton eventName={eventName} />);

      expect(html).toContain("Print / Save as PDF");
      expect(html).toContain('id="print-pdf-button"');
      expect(html).toContain("print:hidden");
      expect(html).toContain(`aria-label="Print or save event dossier for ${eventName} as PDF"`);
    });
  });
});
