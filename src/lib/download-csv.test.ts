import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { triggerCsvDownload } from "./download-csv";

describe("triggerCsvDownload utility", () => {
  let originalWindow: typeof global.window;
  let originalDocument: typeof global.document;
  let originalFetch: typeof global.fetch;

  let mockLink: {
    href: string;
    download: string;
    style: Record<string, string>;
    click: ReturnType<typeof vi.fn>;
  };
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let appendChildMock: ReturnType<typeof vi.fn>;
  let removeChildMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalWindow = global.window;
    originalDocument = global.document;
    originalFetch = global.fetch;

    mockLink = {
      href: "",
      download: "",
      style: {},
      click: vi.fn(),
    };

    createObjectURLMock = vi.fn(() => "blob:http://localhost/blob-id");
    revokeObjectURLMock = vi.fn();
    appendChildMock = vi.fn();
    removeChildMock = vi.fn();

    // Setup global window and document mocks for Node test environment
    global.window = {
      URL: {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      },
    } as unknown as typeof window;

    global.document = {
      createElement: vi.fn((tag: string) => {
        if (tag === "a") return mockLink;
        return {};
      }),
      body: {
        appendChild: appendChildMock,
        removeChild: removeChildMock,
      },
    } as unknown as typeof document;
  });

  afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("downloads file using Content-Disposition header filename on 200 OK", async () => {
    const mockBlob = new Blob(["csv content"], { type: "text/csv" });
    const mockHeaders = new Headers({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="planora-annual-gala-tasks-2026-10-26.csv"',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: mockHeaders,
      blob: async () => mockBlob,
    });

    const result = await triggerCsvDownload(
      "/api/events/test-id/export/tasks",
      "fallback.csv"
    );

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockLink.download).toBe("planora-annual-gala-tasks-2026-10-26.csv");
    expect(mockLink.href).toBe("blob:http://localhost/blob-id");
    expect(mockLink.click).toHaveBeenCalledOnce();
    expect(appendChildMock).toHaveBeenCalledWith(mockLink);
    expect(removeChildMock).toHaveBeenCalledWith(mockLink);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/blob-id");
  });

  it("uses fallback filename when Content-Disposition is absent", async () => {
    const mockBlob = new Blob(["budget,item"], { type: "text/csv" });
    const mockHeaders = new Headers({
      "Content-Type": "text/csv; charset=utf-8",
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: mockHeaders,
      blob: async () => mockBlob,
    });

    const result = await triggerCsvDownload(
      "/api/events/test-id/export/budget",
      "planora-fallback-budget.csv"
    );

    expect(result.success).toBe(true);
    expect(mockLink.download).toBe("planora-fallback-budget.csv");
    expect(mockLink.click).toHaveBeenCalledOnce();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it("handles 401 Unauthorized with server error JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Authentication required to export data." }),
    });

    const result = await triggerCsvDownload(
      "/api/events/test-id/export/tasks",
      "fallback.csv"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Authentication required to export data.");
    expect(mockLink.click).not.toHaveBeenCalled();
    expect(createObjectURLMock).not.toHaveBeenCalled();
  });

  it("handles 404 Not Found without JSON response gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    const result = await triggerCsvDownload(
      "/api/events/test-id/export/tasks",
      "fallback.csv"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Export failed with status 404.");
    expect(mockLink.click).not.toHaveBeenCalled();
  });

  it("handles network failure and returns safe error message without throwing", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const result = await triggerCsvDownload(
      "/api/events/test-id/export/budget",
      "fallback.csv"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error occurred while downloading");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
