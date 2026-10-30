import { describe, it, expect } from "vitest";
import { generateTasksCsv, generateBudgetCsv } from "./export-csv";
import type { TaskRow } from "./validations/task";
import type { BudgetItemRow } from "./validations/budget";

describe("CSV Export Edge Branch Coverage", () => {
  describe("generateTaskCsv sorting and fallback branches", () => {
    it("sorts tasks with mixed due dates and identical due dates with created_at fallback", () => {
      const taskWithDue1: TaskRow = {
        id: "11111111-0000-0000-0000-000000000001",
        event_id: "e1",
        user_id: "u1",
        plan_revision_id: null,
        title: "Task with Due Date A",
        description: null,
        due_date: "2026-11-01T10:00:00.000Z",
        priority: "medium",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "2026-10-01T10:00:00.000Z",
        updated_at: "2026-10-01T10:00:00.000Z",
      };

      const taskWithDue2SameDate: TaskRow = {
        id: "11111111-0000-0000-0000-000000000002",
        event_id: "e1",
        user_id: "u1",
        plan_revision_id: null,
        title: "Task with Due Date B Same Day Older Created",
        description: null,
        due_date: "2026-11-01T10:00:00.000Z",
        priority: "medium",
        status: "pending",
        is_vendor_checklist: false,
        created_at: "2026-09-01T10:00:00.000Z", // older created_at
        updated_at: "2026-09-01T10:00:00.000Z",
      };

      const taskWithoutDue: TaskRow = {
        id: "11111111-0000-0000-0000-000000000003",
        event_id: "e1",
        user_id: "u1",
        plan_revision_id: null,
        title: "Task without Due Date",
        description: null,
        due_date: null,
        priority: "low",
        status: "pending",
        is_vendor_checklist: true,
        created_at: "2026-10-05T10:00:00.000Z",
        updated_at: "2026-10-05T10:00:00.000Z",
      };

      const taskWithInvalidDate: TaskRow = {
        id: "11111111-0000-0000-0000-000000000004",
        event_id: "e1",
        user_id: "u1",
        plan_revision_id: null,
        title: "Task with Invalid Created Date",
        description: null,
        due_date: null,
        priority: "high",
        status: "in_progress",
        is_vendor_checklist: false,
        created_at: "not-a-valid-date",
        updated_at: null as unknown as string,
      };

      // Pass in arbitrary order to test both a.due_date && !b.due_date and !a.due_date && b.due_date
      const csv = generateTasksCsv([
        taskWithoutDue,
        taskWithDue1,
        taskWithInvalidDate,
        taskWithDue2SameDate,
      ]);

      expect(csv).toContain("Task with Due Date A");
      expect(csv).toContain("Task with Due Date B Same Day Older Created");
      expect(csv).toContain("Task without Due Date");

      // Verify that tasks with due dates appear before tasks without due dates
      const posDueB = csv.indexOf("Task with Due Date B Same Day Older Created");
      const posDueA = csv.indexOf("Task with Due Date A");
      const posNoDue = csv.indexOf("Task without Due Date");

      expect(posDueB).toBeLessThan(posDueA); // Due dates match, so sorted by created_at ascending (Sep before Oct)
      expect(posDueA).toBeLessThan(posNoDue); // Tasks with due date sort before tasks without
    });
  });

  describe("generateBudgetCsv sorting and fallback branches", () => {
    it("sorts budget items with equal category falling back to created_at and handles invalid created_at", () => {
      const item1: BudgetItemRow = {
        id: "b1",
        event_id: "e1",
        user_id: "u1",
        plan_revision_id: null,
        category: "Catering",
        item_name: "Dinner Buffet",
        estimated_amount: 5000,
        actual_amount: 4800,
        notes: null,
        created_at: "2026-10-02T10:00:00.000Z",
        updated_at: "2026-10-02T10:00:00.000Z",
      };

      const item2SameCategoryOlder: BudgetItemRow = {
        id: "b2",
        event_id: "e1",
        user_id: "u1",
        plan_revision_id: null,
        category: "Catering",
        item_name: "Morning Refreshments",
        estimated_amount: 1000,
        actual_amount: 1000,
        notes: "Tea and cookies",
        created_at: "2026-10-01T10:00:00.000Z", // older
        updated_at: null as unknown as string,
      };

      const item3InvalidDate: BudgetItemRow = {
        id: "b3",
        event_id: "e1",
        user_id: "u1",
        plan_revision_id: null,
        category: "Catering",
        item_name: "Dessert Bar",
        estimated_amount: 800,
        actual_amount: null as unknown as number,
        notes: null,
        created_at: "invalid-iso-date",
        updated_at: null as unknown as string,
      };

      const item4EmptyCategory: BudgetItemRow = {
        id: "b4",
        event_id: "e1",
        user_id: "u1",
        plan_revision_id: null,
        category: "" as unknown as string,
        item_name: "Uncategorized Sundry",
        estimated_amount: 200,
        actual_amount: 200,
        notes: null,
        created_at: null as unknown as string,
        updated_at: null as unknown as string,
      };

      const csv = generateBudgetCsv([item1, item2SameCategoryOlder, item3InvalidDate, item4EmptyCategory]);

      expect(csv).toContain("Morning Refreshments");
      expect(csv).toContain("Dinner Buffet");
      expect(csv).toContain("Dessert Bar");
      expect(csv).toContain("Uncategorized Sundry");

      // Verify that item2 (older created_at) sorts before item1 (newer created_at) within Catering
      const posItem2 = csv.indexOf("Morning Refreshments");
      const posItem1 = csv.indexOf("Dinner Buffet");
      expect(posItem2).toBeLessThan(posItem1);
    });
  });
});
