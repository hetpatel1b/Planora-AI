import { describe, it, expect } from "vitest";
import {
  UTF8_BOM,
  CRLF,
  TASK_CSV_COLUMNS,
  BUDGET_CSV_COLUMNS,
  sanitizeTextForCsv,
  escapeCsvField,
  formatTextField,
  formatNumericField,
  generateTasksCsv,
  generateBudgetCsv,
  generateExportFilename,
  createCsvAttachmentResponse,
} from "./export-csv";
import type { TaskRow } from "@/lib/validations/task";
import type { BudgetItemRow } from "@/lib/validations/budget";

describe("CSV Export Engine (export-csv.ts)", () => {
  describe("Field Sanitization & Formula Injection Protection", () => {
    it("neutralizes formula triggers (=, +, -, @, \\t, \\r) in textual fields by prepending an apostrophe", () => {
      expect(sanitizeTextForCsv("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeTextForCsv("+123456")).toBe("'+123456");
      expect(sanitizeTextForCsv("-cmd|' /C calc'!A0")).toBe("'-cmd|' /C calc'!A0");
      expect(sanitizeTextForCsv("@username")).toBe("'@username");
      expect(sanitizeTextForCsv("\tmalicious_tab")).toBe("'\tmalicious_tab");
      expect(sanitizeTextForCsv("\rmalicious_cr")).toBe("'\rmalicious_cr");
    });

    it("detects formula triggers even with leading whitespace", () => {
      expect(sanitizeTextForCsv("   =1+1")).toBe("'   =1+1");
      expect(sanitizeTextForCsv("  @SUM")).toBe("'  @SUM");
    });

    it("leaves safe regular text untouched", () => {
      expect(sanitizeTextForCsv("Annual Leadership Gala")).toBe("Annual Leadership Gala");
      expect(sanitizeTextForCsv("Catering & Beverage package")).toBe("Catering & Beverage package");
      expect(sanitizeTextForCsv("Confirmed with vendor")).toBe("Confirmed with vendor");
      expect(sanitizeTextForCsv("100% completed")).toBe("100% completed");
    });

    it("handles null, undefined, and empty string safely", () => {
      expect(sanitizeTextForCsv(null)).toBe("");
      expect(sanitizeTextForCsv(undefined)).toBe("");
      expect(sanitizeTextForCsv("")).toBe("");
    });
  });

  describe("RFC 4180 Escaping", () => {
    it("leaves strings without special characters unquoted", () => {
      expect(escapeCsvField("SimpleText")).toBe("SimpleText");
      expect(escapeCsvField("12345")).toBe("12345");
    });

    it("encloses fields containing commas in double quotes", () => {
      expect(escapeCsvField("Catering, Bar & Snacks")).toBe('"Catering, Bar & Snacks"');
    });

    it("encloses fields containing newlines and carriage returns in double quotes", () => {
      expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvField("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });

    it("doubles internal double quotes and encloses the field in double quotes", () => {
      expect(escapeCsvField('Said "Hello" to vendor')).toBe('"Said ""Hello"" to vendor"');
    });

    it("combines sanitization and escaping properly via formatTextField", () => {
      // Formula injection trigger + comma + quote
      const dangerous = '=HYPERLINK("http://evil.com", "Click")';
      const formatted = formatTextField(dangerous);
      // Sanitized: '=HYPERLINK("http://evil.com", "Click")
      // Escaped: quotes doubled and wrapped in quotes
      expect(formatted).toBe('"\'=HYPERLINK(""http://evil.com"", ""Click"")"');
    });
  });

  describe("Numeric Formatting (Monetary Preservation)", () => {
    it("formats positive numbers with strict two decimal places without currency symbols", () => {
      expect(formatNumericField(1500)).toBe("1500.00");
      expect(formatNumericField("2450.5")).toBe("2450.50");
      expect(formatNumericField(0)).toBe("0.00");
      expect(formatNumericField("0")).toBe("0.00");
    });

    it("preserves legitimate negative monetary amounts without corrupting them with text apostrophes", () => {
      // Critical requirement: negative variance must remain a clean numeric string (-150.00), not '-150.00
      expect(formatNumericField(-150.5)).toBe("-150.50");
      expect(formatNumericField("-45.25")).toBe("-45.25");
      expect(formatNumericField(-0.01)).toBe("-0.01");
    });

    it("falls back to 0.00 for null, undefined, empty, or non-finite numbers", () => {
      expect(formatNumericField(null)).toBe("0.00");
      expect(formatNumericField(undefined)).toBe("0.00");
      expect(formatNumericField("")).toBe("0.00");
      expect(formatNumericField(NaN)).toBe("0.00");
      expect(formatNumericField(Infinity)).toBe("0.00");
      expect(formatNumericField("not_a_number")).toBe("0.00");
    });
  });

  describe("Task CSV Generation (generateTasksCsv)", () => {
    const mockTasks: TaskRow[] = [
      {
        id: "task-002",
        event_id: "evt-123",
        user_id: "usr-456",
        plan_revision_id: null,
        title: "Book Audio/Visual Equipment",
        description: "Verify microphones, projectors, and stage lighting",
        due_date: "2026-11-15T18:00:00.000Z",
        priority: "urgent",
        status: "pending",
        is_vendor_checklist: true,
        created_at: "2026-10-22T10:00:00.000Z",
        updated_at: "2026-10-22T10:00:00.000Z",
      },
      {
        id: "task-001",
        event_id: "evt-123",
        user_id: "usr-456",
        plan_revision_id: null,
        title: "Secure Venue Contract",
        description: "Sign agreement, pay initial deposit",
        due_date: "2026-11-01T12:00:00.000Z",
        priority: "high",
        status: "completed",
        is_vendor_checklist: false,
        created_at: "2026-10-20T08:00:00.000Z",
        updated_at: "2026-10-21T09:00:00.000Z",
      },
      {
        id: "task-003",
        event_id: "evt-123",
        user_id: "usr-456",
        plan_revision_id: null,
        title: "Post-event Debrief",
        description: null,
        due_date: null, // Null date should be sorted LAST
        priority: "low",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "2026-10-25T14:00:00.000Z",
        updated_at: "2026-10-25T14:00:00.000Z",
      },
    ];

    it("outputs the exact 9 columns in the required sequence", () => {
      const csv = generateTasksCsv([], { includeBom: false });
      const firstLine = csv.split(CRLF)[0];
      expect(firstLine).toBe(TASK_CSV_COLUMNS.join(","));
      expect(TASK_CSV_COLUMNS).toEqual([
        "Task ID",
        "Title",
        "Description",
        "Due Date",
        "Priority",
        "Status",
        "Vendor Checklist",
        "Created At",
        "Updated At",
      ]);
    });

    it("orders tasks by due date ascending, with null due dates sorted last", () => {
      const csv = generateTasksCsv(mockTasks, { includeBom: false });
      const lines = csv.trim().split(CRLF);

      // Line 0 is header
      expect(lines[1]).toContain("Secure Venue Contract"); // Due Nov 1
      expect(lines[2]).toContain("Book Audio/Visual Equipment"); // Due Nov 15
      expect(lines[3]).toContain("Post-event Debrief"); // Null due date (last)
    });

    it("formats Due Date as clean YYYY-MM-DD and renders empty string for null due dates", () => {
      const csv = generateTasksCsv(mockTasks, { includeBom: false });
      const lines = csv.trim().split(CRLF);

      // Task 1 (Nov 1)
      expect(lines[1]).toContain(",2026-11-01,");
      // Task 2 (Nov 15)
      expect(lines[2]).toContain(",2026-11-15,");
      // Task 3 (null date)
      expect(lines[3]).toContain(",,low,");
    });

    it("renders vendor checklist as 'Yes' or 'No'", () => {
      const csv = generateTasksCsv(mockTasks, { includeBom: false });
      const lines = csv.trim().split(CRLF);

      // Task 1: is_vendor_checklist = false
      expect(lines[1]).toContain(",completed,No,");
      // Task 2: is_vendor_checklist = true
      expect(lines[2]).toContain(",pending,Yes,");
    });

    it("includes the UTF-8 BOM by default and can be opted out", () => {
      const withBom = generateTasksCsv(mockTasks);
      expect(withBom.startsWith(UTF8_BOM)).toBe(true);

      const withoutBom = generateTasksCsv(mockTasks, { includeBom: false });
      expect(withoutBom.startsWith(UTF8_BOM)).toBe(false);
    });

    it("handles empty task datasets cleanly, returning only header with CRLF", () => {
      const csv = generateTasksCsv([], { includeBom: false });
      expect(csv).toBe(`${TASK_CSV_COLUMNS.join(",")}${CRLF}`);
    });

    it("neutralizes formula injection in task titles and descriptions", () => {
      const maliciousTasks: TaskRow[] = [
        {
          id: "task-evil",
          event_id: "evt-123",
          user_id: "usr-456",
          plan_revision_id: null,
          title: "=1+1",
          description: "@malicious_macro",
          due_date: "2026-12-01T00:00:00.000Z",
          priority: "urgent",
          status: "pending",
          is_vendor_checklist: false,
          created_at: "2026-10-22T00:00:00.000Z",
          updated_at: "2026-10-22T00:00:00.000Z",
        },
      ];

      const csv = generateTasksCsv(maliciousTasks, { includeBom: false });
      expect(csv).toContain("task-evil,'=1+1,'@malicious_macro");
    });

    it("correctly escapes commas and quotes in titles and descriptions", () => {
      const complexTasks: TaskRow[] = [
        {
          id: "task-quotes",
          event_id: "evt-123",
          user_id: "usr-456",
          plan_revision_id: null,
          title: 'Review "Special" Agreement, Part 1',
          description: "Multiline\r\nnotes with, commas",
          due_date: "2026-12-01T00:00:00.000Z",
          priority: "medium",
          status: "in_progress",
          is_vendor_checklist: true,
          created_at: "2026-10-22T00:00:00.000Z",
          updated_at: "2026-10-22T00:00:00.000Z",
        },
      ];

      const csv = generateTasksCsv(complexTasks, { includeBom: false });
      expect(csv).toContain('"Review ""Special"" Agreement, Part 1"');
      expect(csv).toContain('"Multiline\r\nnotes with, commas"');
    });

    it("safely handles international unicode characters", () => {
      const unicodeTasks: TaskRow[] = [
        {
          id: "task-jp",
          event_id: "evt-123",
          user_id: "usr-456",
          plan_revision_id: null,
          title: "会場の手配・契約 (Venue Booking)",
          description: "ケータリングと装飾の確認 🎉",
          due_date: "2026-12-01T00:00:00.000Z",
          priority: "high",
          status: "pending",
          is_vendor_checklist: true,
          created_at: "2026-10-22T00:00:00.000Z",
          updated_at: "2026-10-22T00:00:00.000Z",
        },
      ];

      const csv = generateTasksCsv(unicodeTasks, { includeBom: false });
      expect(csv).toContain("会場の手配・契約 (Venue Booking)");
      expect(csv).toContain("ケータリングと装飾の確認 🎉");
    });
  });

  describe("Budget CSV Generation (generateBudgetCsv)", () => {
    const mockBudgetItems: BudgetItemRow[] = [
      {
        id: "b-002",
        event_id: "evt-123",
        user_id: "usr-456",
        plan_revision_id: null,
        category: "Venue & Facilities",
        item_name: "Grand Ballroom Rental",
        estimated_amount: 5000,
        actual_amount: 5250.5,
        notes: "Includes sound system surcharge",
        created_at: "2026-10-21T10:00:00.000Z",
        updated_at: "2026-10-21T10:00:00.000Z",
      },
      {
        id: "b-001",
        event_id: "evt-123",
        user_id: "usr-456",
        plan_revision_id: null,
        category: "Catering & Bar",
        item_name: "Dinner Buffet (200 guests)",
        estimated_amount: 8000,
        actual_amount: 7600,
        notes: "Discount applied for early payment",
        created_at: "2026-10-20T08:00:00.000Z",
        updated_at: "2026-10-20T08:00:00.000Z",
      },
    ];

    it("outputs the exact 9 columns in the required sequence", () => {
      const csv = generateBudgetCsv([], { includeBom: false });
      const firstLine = csv.split(CRLF)[0];
      expect(firstLine).toBe(BUDGET_CSV_COLUMNS.join(","));
      expect(BUDGET_CSV_COLUMNS).toEqual([
        "Item ID",
        "Category",
        "Item Name",
        "Estimated Amount",
        "Actual Amount",
        "Variance",
        "Notes",
        "Created At",
        "Updated At",
      ]);
    });

    it("orders budget items alphabetically by category ascending", () => {
      const csv = generateBudgetCsv(mockBudgetItems, { includeBom: false });
      const lines = csv.trim().split(CRLF);

      // Catering comes before Venue
      expect(lines[1]).toContain("Catering & Bar");
      expect(lines[2]).toContain("Venue & Facilities");
    });

    it("formats amounts as unadorned decimal strings and computes variance accurately", () => {
      const csv = generateBudgetCsv(mockBudgetItems, { includeBom: false });
      const lines = csv.trim().split(CRLF);

      // Line 1: Catering: estimated 8000.00, actual 7600.00, variance = 7600 - 8000 = -400.00
      expect(lines[1]).toContain(",8000.00,7600.00,-400.00,");

      // Line 2: Venue: estimated 5000.00, actual 5250.50, variance = 5250.50 - 5000 = 250.50
      expect(lines[2]).toContain(",5000.00,5250.50,250.50,");
    });

    it("never prepends formula protection to negative variance numbers", () => {
      // Variance is -400.00; must not be formatted as '-400.00
      const csv = generateBudgetCsv(mockBudgetItems, { includeBom: false });
      expect(csv).toContain(",-400.00,");
      expect(csv).not.toContain(",'-400.00,");
    });

    it("neutralizes formula injection in item name, category, and notes", () => {
      const evilItems: BudgetItemRow[] = [
        {
          id: "b-evil",
          event_id: "evt-123",
          user_id: "usr-456",
          plan_revision_id: null,
          category: "=INJECT_CAT",
          item_name: "+INJECT_NAME",
          estimated_amount: 100,
          actual_amount: 100,
          notes: "-2+3+cmd|' /C calc'!A0",
          created_at: "2026-10-22T00:00:00.000Z",
          updated_at: "2026-10-22T00:00:00.000Z",
        },
      ];

      const csv = generateBudgetCsv(evilItems, { includeBom: false });
      expect(csv).toContain("b-evil,'=INJECT_CAT,'+INJECT_NAME,100.00,100.00,0.00,'-2+3+cmd|' /C calc'!A0");
    });

    it("handles null notes cleanly by rendering an empty string", () => {
      const itemWithNullNotes: BudgetItemRow[] = [
        {
          id: "b-nullnotes",
          event_id: "evt-123",
          user_id: "usr-456",
          plan_revision_id: null,
          category: "Other",
          item_name: "Miscellaneous Fee",
          estimated_amount: 50,
          actual_amount: 50,
          notes: null,
          created_at: "2026-10-22T00:00:00.000Z",
          updated_at: "2026-10-22T00:00:00.000Z",
        },
      ];

      const csv = generateBudgetCsv(itemWithNullNotes, { includeBom: false });
      expect(csv).toContain("b-nullnotes,Other,Miscellaneous Fee,50.00,50.00,0.00,,");
    });

    it("handles empty budget datasets cleanly, returning only header with CRLF", () => {
      const csv = generateBudgetCsv([], { includeBom: false });
      expect(csv).toBe(`${BUDGET_CSV_COLUMNS.join(",")}${CRLF}`);
    });
  });

  describe("Filename Generation & Sanitization (generateExportFilename)", () => {
    const fixedDate = new Date("2026-10-26T12:00:00.000Z");

    it("constructs standard clean filenames", () => {
      const filename = generateExportFilename(
        "Annual Leadership Gala",
        "tasks",
        "csv",
        fixedDate
      );
      expect(filename).toBe("planora-annual-leadership-gala-tasks-2026-10-26.csv");
    });

    it("sanitizes path traversal, slashes, and special characters", () => {
      const filename = generateExportFilename(
        "../../etc/passwd; DROP TABLE events; --",
        "budget",
        "csv",
        fixedDate
      );
      expect(filename).toBe("planora-etc-passwd-drop-table-events-budget-2026-10-26.csv");
      expect(filename).not.toContain("/");
      expect(filename).not.toContain("\\");
      expect(filename).not.toContain(";");
    });

    it("falls back to 'event' when event name is empty or consists solely of invalid characters", () => {
      expect(generateExportFilename("", "tasks", "csv", fixedDate)).toBe(
        "planora-event-tasks-2026-10-26.csv"
      );
      expect(generateExportFilename("   ", "budget", "csv", fixedDate)).toBe(
        "planora-event-budget-2026-10-26.csv"
      );
      expect(generateExportFilename("!@#$%^&*()", "tasks", "csv", fixedDate)).toBe(
        "planora-event-tasks-2026-10-26.csv"
      );
    });

    it("truncates long event names to maximum 50 characters for safe filesystem/header bounds", () => {
      const veryLongName = "A".repeat(100);
      const filename = generateExportFilename(veryLongName, "tasks", "csv", fixedDate);
      expect(filename).toBe(`planora-${"a".repeat(50)}-tasks-2026-10-26.csv`);
    });

    it("normalizes international diacritics into safe ASCII", () => {
      const filename = generateExportFilename("Café Gala & Fête", "budget", "csv", fixedDate);
      expect(filename).toBe("planora-cafe-gala-fete-budget-2026-10-26.csv");
    });
  });

  describe("createCsvAttachmentResponse", () => {
    it("constructs Response with correct status, content-type, disposition, and strict cache headers", async () => {
      const csv = "col1,col2\r\nval1,val2\r\n";
      const filename = "test-export.csv";
      const response = createCsvAttachmentResponse(csv, filename);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
      expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="test-export.csv"');
      expect(response.headers.get("Cache-Control")).toBe("private, no-cache, no-store, must-revalidate");
      expect(response.headers.get("Pragma")).toBe("no-cache");
      expect(response.headers.get("Expires")).toBe("0");

      const text = await response.text();
      expect(text).toBe(csv);
    });
  });
});
