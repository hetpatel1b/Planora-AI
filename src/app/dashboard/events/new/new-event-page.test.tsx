import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import NewEventPage from "./page";

// Mock getAuthenticatedUser
const mockGetAuthenticatedUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

// Mock redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock EventForm to isolate page-level tests
vi.mock("@/components/events/event-form", () => ({
  EventForm: ({ mode }: { mode: string }) => (
    <div data-testid="mock-event-form" data-mode={mode}>
      Mock Event Form ({mode})
    </div>
  ),
}));

describe("NewEventPage Server Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: "user-uuid-1111",
    email: "planner@planora.ai",
  };

  it("redirects unauthenticated users to /sign-in with redirectTo param", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: null } });

    await expect(NewEventPage()).rejects.toThrow(
      "REDIRECT:/sign-in?redirectTo=/dashboard/events/new"
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      "/sign-in?redirectTo=/dashboard/events/new"
    );
  });

  it("renders authenticated breadcrumb, header, and Workspace Setup badge", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });

    const element = await NewEventPage();
    const html = renderToString(element);

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain("Back to Dashboard");
    expect(html).toContain("New Event Setup");
    expect(html).toContain("Workspace Setup");
    expect(html).toContain("Intelligent Event Setup");
    expect(html).toContain("Create Event Workspace");
    expect(html).toContain('id="main-content"');
  });

  it("renders EventForm component in create mode", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ data: { user: mockUser } });

    const element = await NewEventPage();
    const html = renderToString(element);

    expect(html).toContain('data-testid="mock-event-form"');
    expect(html).toContain('data-mode="create"');
  });
});

