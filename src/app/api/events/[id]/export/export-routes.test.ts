import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { GET as getTasksExport } from "./tasks/route";
import { GET as getBudgetExport } from "./budget/route";
import * as serverAuth from "@/lib/supabase/server";
import {
  createMockSupabaseClient,
  createMockAuthSuccess,
  createMockAuthFailure,
} from "@/test/mocks/supabase";

describe("Export Route Handlers (/api/events/[id]/export/*)", () => {
  const validEventId = "11111111-2222-4333-8444-555555555555";
  const mockUser: User = {
    id: "user-test-123",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-10-01T00:00:00.000Z",
    email: "planner@planora.ai",
    role: "authenticated",
  };

  const mockEvent = {
    id: validEventId,
    name: "Global Tech Summit 2026",
    user_id: "user-test-123",
  };

  const mockTasks = [
    {
      id: "t-1",
      event_id: validEventId,
      user_id: "user-test-123",
      plan_revision_id: null,
      title: "Audio Visual Staging",
      description: "Setup mics and screens",
      due_date: "2026-11-20T10:00:00.000Z",
      priority: "high",
      status: "pending",
      is_vendor_checklist: true,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  const mockBudgetItems = [
    {
      id: "b-1",
      event_id: validEventId,
      user_id: "user-test-123",
      plan_revision_id: null,
      category: "Audio & AV",
      item_name: "Sound System",
      estimated_amount: 1500,
      actual_amount: 1650.5,
      notes: "Additional subwoofer included",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createMockRequest = (url: string) => {
    return new NextRequest(new URL(url, "http://localhost:3000"));
  };

  describe("Tasks Export Route (GET /api/events/[id]/export/tasks)", () => {
    it("returns 401 when the session is unauthenticated", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthFailure("No session")
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/tasks`);
      const res = await getTasksExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Authentication required");
    });

    it("returns 400 when the event ID is malformed (not a UUID)", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const req = createMockRequest("/api/events/invalid-uuid/export/tasks");
      const res = await getTasksExport(req, {
        params: Promise.resolve({ id: "invalid-uuid" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid event ID format");
    });

    it("returns 404 when the event is not found or owned by another user", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: null, error: { message: "Not found" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/tasks`);
      const res = await getTasksExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("Event not found or access denied");
    });

    it("returns 500 when task query encounters a database error", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEvent, error: null },
          tasks: { data: null, error: { message: "Query timeout" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/tasks`);
      const res = await getTasksExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("Failed to retrieve checklist tasks");
    });

    it("successfully returns CSV with headers, attachment disposition, and no-store caching", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEvent, error: null },
          tasks: { data: mockTasks, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/tasks`);
      const res = await getTasksExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
      expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
      expect(res.headers.get("Content-Disposition")).toContain("planora-global-tech-summit-2026-tasks-");
      expect(res.headers.get("Cache-Control")).toContain("no-store");

      const text = await res.text();
      expect(text).toContain("Task ID,Title,Description,Due Date,Priority,Status,Vendor Checklist,Created At,Updated At");
      expect(text).toContain("Audio Visual Staging");
      expect(text).toContain("Yes"); // is_vendor_checklist
    });

    it("handles empty task datasets cleanly, returning 200 with CSV headers", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEvent, error: null },
          tasks: { data: [], error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/tasks`);
      const res = await getTasksExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Task ID,Title,Description,Due Date,Priority,Status,Vendor Checklist,Created At,Updated At");
    });

    it("performs zero database mutations", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEvent, error: null },
          tasks: { data: mockTasks, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/tasks`);
      await getTasksExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      const tasksBuilder = mockSupabase.getBuilderForTable("tasks");
      expect(tasksBuilder?.insert).not.toHaveBeenCalled();
      expect(tasksBuilder?.update).not.toHaveBeenCalled();
      expect(tasksBuilder?.delete).not.toHaveBeenCalled();
    });
  });

  describe("Budget Export Route (GET /api/events/[id]/export/budget)", () => {
    it("returns 401 when the session is unauthenticated", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthFailure("No session")
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/budget`);
      const res = await getBudgetExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Authentication required");
    });

    it("returns 400 when the event ID is malformed (not a UUID)", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const req = createMockRequest("/api/events/invalid-uuid/export/budget");
      const res = await getBudgetExport(req, {
        params: Promise.resolve({ id: "invalid-uuid" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid event ID format");
    });

    it("returns 404 when the event is not found or owned by another user", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: null, error: { message: "Not found" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/budget`);
      const res = await getBudgetExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("Event not found or access denied");
    });

    it("returns 500 when budget query encounters a database error", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEvent, error: null },
          budget_items: { data: null, error: { message: "Query timeout" } },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/budget`);
      const res = await getBudgetExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("Failed to retrieve budget items");
    });

    it("successfully returns CSV with headers, unadorned decimal numbers, and attachment headers", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEvent, error: null },
          budget_items: { data: mockBudgetItems, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/budget`);
      const res = await getBudgetExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
      expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
      expect(res.headers.get("Content-Disposition")).toContain("planora-global-tech-summit-2026-budget-");
      expect(res.headers.get("Cache-Control")).toContain("no-store");

      const text = await res.text();
      expect(text).toContain("Item ID,Category,Item Name,Estimated Amount,Actual Amount,Variance,Notes,Created At,Updated At");
      expect(text).toContain("Sound System");
      expect(text).toContain(",1500.00,1650.50,150.50,");
    });

    it("handles empty budget datasets cleanly, returning 200 with CSV headers", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEvent, error: null },
          budget_items: { data: [], error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/budget`);
      const res = await getBudgetExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Item ID,Category,Item Name,Estimated Amount,Actual Amount,Variance,Notes,Created At,Updated At");
    });

    it("performs zero database mutations", async () => {
      vi.spyOn(serverAuth, "getAuthenticatedUser").mockResolvedValue(
        createMockAuthSuccess(mockUser)
      );

      const mockSupabase = createMockSupabaseClient({
        tables: {
          events: { data: mockEvent, error: null },
          budget_items: { data: mockBudgetItems, error: null },
        },
      });
      vi.spyOn(serverAuth, "createClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof serverAuth.createClient>>
      );

      const req = createMockRequest(`/api/events/${validEventId}/export/budget`);
      await getBudgetExport(req, {
        params: Promise.resolve({ id: validEventId }),
      });

      const budgetBuilder = mockSupabase.getBuilderForTable("budget_items");
      expect(budgetBuilder?.insert).not.toHaveBeenCalled();
      expect(budgetBuilder?.update).not.toHaveBeenCalled();
      expect(budgetBuilder?.delete).not.toHaveBeenCalled();
    });
  });
});
