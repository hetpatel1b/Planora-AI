/**
 * Planora AI — CSV Export Engine & Sanitization
 *
 * Implements pure, deterministic CSV generation for tasks and budget records (F14).
 * Conforms to RFC 4180 and incorporates OWASP spreadsheet formula injection defense (CWE-1236).
 *
 * Design Invariants:
 * - 100% independent of React, Next.js, browser DOM, and Supabase client runtimes.
 * - Deterministic ordering and formatting.
 * - CRLF ('\r\n') record delimiters per RFC 4180.
 * - Optional UTF-8 BOM ('\uFEFF') for Excel compatibility.
 * - Strict distinction between text sanitization and numeric values:
 *   Legitimate negative monetary values are NEVER corrupted with text formula escapes.
 */

import { getItemVariance } from "@/lib/budget-math";
import { toDateInputValue } from "@/lib/date-utils";
import type { TaskRow } from "@/lib/validations/task";
import type { BudgetItemRow } from "@/lib/validations/budget";

/**
 * UTF-8 Byte Order Mark (BOM).
 * Instructs Microsoft Excel on Windows to parse the CSV payload strictly as UTF-8,
 * ensuring non-ASCII and international characters are displayed accurately.
 */
export const UTF8_BOM = "\uFEFF";

/**
 * Standard RFC 4180 record delimiter.
 */
export const CRLF = "\r\n";

/**
 * Task CSV column headers in strict sequence.
 */
export const TASK_CSV_COLUMNS = [
  "Task ID",
  "Title",
  "Description",
  "Due Date",
  "Priority",
  "Status",
  "Vendor Checklist",
  "Created At",
  "Updated At",
] as const;

/**
 * Budget CSV column headers in strict sequence.
 */
export const BUDGET_CSV_COLUMNS = [
  "Item ID",
  "Category",
  "Item Name",
  "Estimated Amount",
  "Actual Amount",
  "Variance",
  "Notes",
  "Created At",
  "Updated At",
] as const;

/**
 * Dangerous prefix characters that spreadsheet applications (Excel, Calc, Google Sheets)
 * evaluate as formula, macro, or dynamic data exchange (DDE) triggers.
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Centralized sanitization for untrusted user-controlled text fields.
 *
 * Threat Model (CSV Formula Injection / CWE-1236):
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', spreadsheet software can execute
 * arbitrary commands or exfiltrate data when opened.
 *
 * Sanitization Strategy:
 * Prepend a single quote (`'`) to any string whose trimmed beginning starts with a dangerous trigger.
 * In spreadsheet applications, a leading single quote tells the formula parser to treat the cell
 * content strictly as a text literal, neutralizing formula execution.
 *
 * Trade-Off Documentation:
 * While prepending an apostrophe effectively neutralizes formula execution in spreadsheet engines,
 * some plain-text CSV viewers will display the leading apostrophe literally. This is an intentional
 * security-first trade-off to prevent command injection and unauthorized macro execution.
 *
 * IMPORTANT: This function must ONLY be applied to textual columns (e.g. titles, notes, names).
 * It must NEVER be called on numeric amounts or variances, preserving legitimate negative values.
 */
export function sanitizeTextForCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // Check if raw string starts with tab or carriage return
  if (str.startsWith("\t") || str.startsWith("\r")) {
    return `'${str}`;
  }

  // Strip leading space characters only (not tabs/newlines/CR) to detect spaces before formula triggers
  const strippedSpaces = str.replace(/^[ ]+/, "");

  for (const prefix of FORMULA_PREFIXES) {
    if (strippedSpaces.startsWith(prefix)) {
      return `'${str}`;
    }
  }

  return str;
}

/**
 * Escapes a single string field according to RFC 4180 section 2.
 *
 * Rules:
 * - If the field contains a comma (`,`), double quote (`"`), carriage return (`\r`), or newline (`\n`),
 *   the entire field must be enclosed in double quotes.
 * - Any embedded double quotes (`"`) within the field must be escaped by doubling (`""`).
 */
export function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\r") ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formats an untrusted textual field: sanitizes against formula injection, then applies RFC 4180 escaping.
 */
export function formatTextField(value: string | null | undefined): string {
  return escapeCsvField(sanitizeTextForCsv(value));
}

/**
 * Formats a monetary amount into an unadorned decimal string with strict 2 decimal places (e.g. "1250.00").
 *
 * Invariants:
 * - Rejects non-finite numbers, NaN, and Infinity, falling back safely to "0.00".
 * - Preserves legitimate negative amounts (e.g. "-150.00") without text formula sanitization.
 * - Never includes currency symbols ($), commas, or extraneous padding, ensuring external
 *   spreadsheets immediately recognize the values as raw numeric types for formulas (SUM, AVERAGE).
 */
export function formatNumericField(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return "0.00";
  }

  return num.toFixed(2);
}

/**
 * Options for CSV serialization.
 */
export interface CsvExportOptions {
  /**
   * Prepend UTF-8 Byte Order Mark ('\uFEFF') for Excel compatibility.
   * Defaults to true.
   */
  includeBom?: boolean;
}


/**
 * Generates an RFC 4180-compliant CSV string for event checklist tasks.
 *
 * Ordering:
 * Chronological by `due_date ASC NULLS LAST`, then `created_at ASC` (matching workspace timeline view).
 */
export function generateTasksCsv(
  tasks: TaskRow[],
  options: CsvExportOptions = {}
): string {
  const includeBom = options.includeBom ?? true;

  // Defensive sorting to guarantee stable, deterministic row sequence
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.due_date && b.due_date) {
      const timeA = new Date(a.due_date).getTime();
      const timeB = new Date(b.due_date).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
    } else if (a.due_date && !b.due_date) {
      return -1;
    } else if (!a.due_date && b.due_date) {
      return 1;
    }

    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();
    return (isNaN(createdA) ? 0 : createdA) - (isNaN(createdB) ? 0 : createdB);
  });

  const lines: string[] = [];

  // Header line
  lines.push(TASK_CSV_COLUMNS.join(","));

  // Data rows
  for (const task of sortedTasks) {
    const row = [
      formatTextField(task.id),
      formatTextField(task.title),
      formatTextField(task.description ?? ""),
      escapeCsvField(toDateInputValue(task.due_date)),
      formatTextField(task.priority),
      formatTextField(task.status),
      task.is_vendor_checklist ? "Yes" : "No",
      escapeCsvField(task.created_at ?? ""),
      escapeCsvField(task.updated_at ?? ""),
    ];
    lines.push(row.join(","));
  }

  const csvBody = lines.join(CRLF) + CRLF;
  return includeBom ? `${UTF8_BOM}${csvBody}` : csvBody;
}

/**
 * Generates an RFC 4180-compliant CSV string for event budget records.
 *
 * Invariants:
 * - Operates strictly on authoritative saved budget items.
 * - Computes variance using decimal-safe `getItemVariance` (actual - estimated).
 * - Numeric amounts are formatted as unadorned two-decimal strings (e.g. "1250.00").
 * - Rows ordered by `category ASC`, then `created_at ASC`.
 */
export function generateBudgetCsv(
  budgetItems: BudgetItemRow[],
  options: CsvExportOptions = {}
): string {
  const includeBom = options.includeBom ?? true;

  // Defensive sorting to guarantee stable, deterministic row sequence
  const sortedItems = [...budgetItems].sort((a, b) => {
    const catCompare = (a.category || "").localeCompare(b.category || "");
    if (catCompare !== 0) {
      return catCompare;
    }

    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();
    return (isNaN(createdA) ? 0 : createdA) - (isNaN(createdB) ? 0 : createdB);
  });

  const lines: string[] = [];

  // Header line
  lines.push(BUDGET_CSV_COLUMNS.join(","));

  // Data rows
  for (const item of sortedItems) {
    const variance = getItemVariance(item);

    const row = [
      formatTextField(item.id),
      formatTextField(item.category),
      formatTextField(item.item_name),
      formatNumericField(item.estimated_amount),
      formatNumericField(item.actual_amount),
      formatNumericField(variance),
      formatTextField(item.notes ?? ""),
      escapeCsvField(item.created_at ?? ""),
      escapeCsvField(item.updated_at ?? ""),
    ];
    lines.push(row.join(","));
  }

  const csvBody = lines.join(CRLF) + CRLF;
  return includeBom ? `${UTF8_BOM}${csvBody}` : csvBody;
}

/**
 * Sanitizes an event name and constructs a safe, filesystem and HTTP Content-Disposition compatible filename.
 *
 * Rules:
 * - Strips path traversal characters (/, \, ..), control characters, and special header characters (", ', ;, \n, \r).
 * - Converts spaces and non-alphanumeric characters to hyphens.
 * - Collapses consecutive hyphens.
 * - Truncates slug to maximum 50 characters to prevent header length overflow.
 * - Falls back to "event" if the event name is empty or consists entirely of stripped characters.
 * - Appends current date in YYYY-MM-DD format (UTC).
 *
 * Example:
 *   generateExportFilename("Annual Leadership Gala / Q4", "tasks")
 *   => "planora-annual-leadership-gala-q4-tasks-2026-10-26.csv"
 */
export function generateExportFilename(
  eventName: string | null | undefined,
  type: "tasks" | "budget",
  extension = "csv",
  referenceDate = new Date()
): string {
  const rawName = (eventName || "").trim();

  // Normalize and replace unsafe characters
  let slug = rawName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Convert non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens

  if (slug.length > 50) {
    slug = slug.slice(0, 50).replace(/-+$/, "");
  }

  if (!slug) {
    slug = "event";
  }

  // Format date in UTC YYYY-MM-DD
  const year = referenceDate.getUTCFullYear();
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const cleanExt = extension.replace(/^\./, "").toLowerCase();
  return `planora-${slug}-${type}-${dateStr}.${cleanExt}`;
}

/**
 * Constructs an RFC 4180-compliant downloadable HTTP Response with strict cache-invalidation headers.
 */
export function createCsvAttachmentResponse(
  csvContent: string,
  filename: string
): Response {
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
