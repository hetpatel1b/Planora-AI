import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  parseMarkdownBlocks,
  renderFormattedInline,
} from "./markdown-utils";

describe("markdown-utils", () => {
  describe("parseMarkdownBlocks", () => {
    it("returns empty array for empty or whitespace-only inputs", () => {
      expect(parseMarkdownBlocks("")).toEqual([]);
      expect(parseMarkdownBlocks("   \n\t  \n  ")).toEqual([]);
    });

    it("parses headings of levels 1 through 4", () => {
      const markdown = `# Title 1
## Subtitle 2
### Section 3
#### Subsection 4`;
      const blocks = parseMarkdownBlocks(markdown);
      expect(blocks).toEqual([
        { type: "heading", level: 1, text: "Title 1" },
        { type: "heading", level: 2, text: "Subtitle 2" },
        { type: "heading", level: 3, text: "Section 3" },
        { type: "heading", level: 4, text: "Subsection 4" },
      ]);
    });

    it("parses single and multiple paragraphs with whitespace normalization", () => {
      const markdown = `First paragraph line one.
Line two of first paragraph.

Second distinct paragraph.`;
      const blocks = parseMarkdownBlocks(markdown);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toEqual({
        type: "paragraph",
        text: "First paragraph line one. Line two of first paragraph.",
      });
      expect(blocks[1]).toEqual({
        type: "paragraph",
        text: "Second distinct paragraph.",
      });
    });

    it("parses unordered bullet lists (- and *)", () => {
      const markdown = `- Item A
- Item B
* Item C`;
      const blocks = parseMarkdownBlocks(markdown);
      expect(blocks).toEqual([
        {
          type: "bullet-list",
          items: ["Item A", "Item B", "Item C"],
        },
      ]);
    });

    it("parses ordered numbered lists (1. and 2) )", () => {
      const markdown = `1. First milestone
2. Second milestone
3) Third milestone`;
      const blocks = parseMarkdownBlocks(markdown);
      expect(blocks).toEqual([
        {
          type: "ordered-list",
          items: ["First milestone", "Second milestone", "Third milestone"],
        },
      ]);
    });

    it("supports multiline indented list items", () => {
      const markdown = `1. Primary deliverable
   with an indented continuation line
2. Next item`;
      const blocks = parseMarkdownBlocks(markdown);
      expect(blocks).toEqual([
        {
          type: "ordered-list",
          items: ["Primary deliverable with an indented continuation line", "Next item"],
        },
      ]);
    });

    it("splits inline sequential numbered sentences into ordered list items", () => {
      const markdown = `1. Verify venue capacity. 2. Book photographer. 3. Finalize menu.`;
      const blocks = parseMarkdownBlocks(markdown);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe("ordered-list");
      expect(blocks[0].items).toEqual([
        "Verify venue capacity.",
        "Book photographer.",
        "Finalize menu.",
      ]);
    });

    it("parses markdown tables and ignores separator rows", () => {
      const markdown = `| Category | Estimated | Actual |
| :--- | :---: | ---: |
| Venue | ₹50,000 | ₹48,000 |
| Catering | ₹30,000 | ₹32,000 |`;
      const blocks = parseMarkdownBlocks(markdown);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        type: "table",
        headers: ["Category", "Estimated", "Actual"],
        rows: [
          ["Venue", "₹50,000", "₹48,000"],
          ["Catering", "₹30,000", "₹32,000"],
        ],
      });
    });

    it("treats bold section header lines as distinct paragraph labels", () => {
      const markdown = `**Action Items:**
- Item 1
- Item 2`;
      const blocks = parseMarkdownBlocks(markdown);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toEqual({ type: "paragraph", text: "**Action Items:**" });
      expect(blocks[1]).toEqual({ type: "bullet-list", items: ["Item 1", "Item 2"] });
    });
  });

  describe("renderFormattedInline", () => {
    it("renders code, bold, and italic formatted segments safely", () => {
      const html = renderToString(
        <div>
          {renderFormattedInline(
            "Use `calculateBudget` for **accurate** math with *low* risk."
          )}
        </div>
      );
      expect(html).toContain("<code");
      expect(html).toContain("calculateBudget");
      expect(html).toContain("<strong");
      expect(html).toContain("accurate");
      expect(html).toContain("<em");
      expect(html).toContain("low");
    });

    it("renders safe web links with target and rel attributes", () => {
      const html = renderToString(
        <div>{renderFormattedInline("Check the [documentation](https://planora.ai/docs)")}</div>
      );
      expect(html).toContain("<a href=\"https://planora.ai/docs\"");
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain("documentation");
    });

    it("renders internal anchor links without opening a new tab", () => {
      const html = renderToString(
        <div>{renderFormattedInline("Jump to [overview](#overview)")}</div>
      );
      expect(html).toContain('<a href="#overview"');
      expect(html).not.toContain('target="_blank"');
    });

    it("rejects unsafe URI schemes such as javascript: or data:", () => {
      const html = renderToString(
        <div>{renderFormattedInline("Attack [exploit](javascript:alert(1))")}</div>
      );
      expect(html).not.toContain("<a");
      expect(html).toContain("javascript:alert(1)");
    });
  });
});
