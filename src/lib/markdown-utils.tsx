import * as React from "react";

/**
 * Planora AI — Safe Markdown & Structured Block Parsing Utilities
 *
 * Lightweight, zero-dependency Markdown parser designed for streaming AI outputs.
 * Converts headings, bullet lists, ordered lists, markdown tables, and paragraphs
 * into structured typed blocks.
 *
 * Security:
 * - 100% immune to XSS and injection vulnerabilities: zero dangerouslySetInnerHTML.
 * - Safely handles untrusted AI completions and malformed Markdown.
 * - Sanitizes links to restrict to http/https/relative anchors.
 */

export interface ParsedBlock {
  type: "heading" | "bullet-list" | "ordered-list" | "table" | "paragraph";
  level?: number;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  text?: string;
}

/**
 * Parses markdown text into structured, typed blocks for safe rendering.
 * Supports headings (#, ##, ###), bullet lists (- or *), ordered lists (1. , 2.),
 * markdown tables, and paragraphs.
 */
export function parseMarkdownBlocks(content: string): ParsedBlock[] {
  if (!content || !content.trim()) return [];

  // Normalize Windows newlines
  const normalized = content.replace(/\r\n/g, "\n");

  // Split inline sequential numbered items like "1. Do this. 2. Do that." into separate lines
  const splitNumbered = normalized.replace(/(?<=[.!?])\s+(\d+[\.\)])\s+/g, "\n$1 ");

  const rawLines = splitNumbered.split("\n");
  const blocks: ParsedBlock[] = [];

  let currentList: { type: "bullet-list" | "ordered-list"; items: string[] } | null = null;
  let currentTable: { headers: string[]; rows: string[][] } | null = null;
  let currentParagraphLines: string[] = [];

  function flushParagraph() {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join(" ").trim();
      if (text) blocks.push({ type: "paragraph", text });
      currentParagraphLines = [];
    }
  }

  function flushList() {
    if (currentList && currentList.items.length > 0) {
      blocks.push({ type: currentList.type, items: [...currentList.items] });
      currentList = null;
    }
  }

  function flushTable() {
    if (currentTable && (currentTable.headers.length > 0 || currentTable.rows.length > 0)) {
      blocks.push({
        type: "table",
        headers: currentTable.headers,
        rows: currentTable.rows,
      });
      currentTable = null;
    }
  }

  function flushAll() {
    flushParagraph();
    flushList();
    flushTable();
  }

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // Check for Table line e.g. | Col 1 | Col 2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length >= 3) {
      flushParagraph();
      flushList();
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else if (currentTable) {
      flushTable();
    }

    // Check for Heading (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    // Check for Unordered List item (- , * )
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      const itemText = bulletMatch[1].trim();
      if (currentList && currentList.type === "bullet-list") {
        currentList.items.push(itemText);
      } else {
        flushList();
        currentList = { type: "bullet-list", items: [itemText] };
      }
      continue;
    }

    // Check for Ordered / Numbered List item (1. , 1) )
    const orderedMatch = trimmed.match(/^\d+[\.\)]\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      const itemText = orderedMatch[1].trim();
      if (currentList && currentList.type === "ordered-list") {
        currentList.items.push(itemText);
      } else {
        flushList();
        currentList = { type: "ordered-list", items: [itemText] };
      }
      continue;
    }

    // List continuation indent
    if (currentList) {
      if (rawLine.startsWith("  ") || rawLine.startsWith("\t")) {
        const lastIdx = currentList.items.length - 1;
        currentList.items[lastIdx] = `${currentList.items[lastIdx]} ${trimmed}`;
        continue;
      } else {
        flushList();
      }
    }

    // Bold section label line (e.g. "**Recommended Actions:**" or "**Budget Status:**")
    if (/^\*\*[^*]+:\*\*\s*$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "paragraph", text: trimmed });
      continue;
    }

    currentParagraphLines.push(trimmed);
  }

  flushAll();
  return blocks;
}

/**
 * Safely renders inline bold segments (**text**), inline code (`code`),
 * italic (*text*), and safe links ([text](url)) into pure React elements.
 */
export function renderFormattedInline(text: string): React.ReactNode {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((token, i) => {
    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      return (
        <code
          key={i}
          className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] font-medium text-indigo-700 dark:bg-slate-800 dark:text-indigo-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-slate-950 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length >= 2) {
      return (
        <em key={i} className="italic text-slate-800 dark:text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    }
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const linkLabel = linkMatch[1];
      const linkHref = linkMatch[2];
      const isSafe =
        linkHref.startsWith("https://") ||
        linkHref.startsWith("http://") ||
        linkHref.startsWith("#") ||
        linkHref.startsWith("/");
      if (isSafe) {
        return (
          <a
            key={i}
            href={linkHref}
            target={linkHref.startsWith("#") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="underline text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
          >
            {linkLabel}
          </a>
        );
      }
    }
    return token;
  });
}

