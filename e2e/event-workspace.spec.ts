import { test, expect } from "@playwright/test";

test.describe("Event Workspace & Core User Journey (Objectives B, E & F)", () => {
  test("redirects unauthenticated direct access on event workspace to /sign-in preserving destination", async ({
    page,
  }) => {
    const testEventId = "11111111-1111-4111-8111-111111111111";
    await page.goto(`/dashboard/events/${testEventId}`);

    // Must be redirected to sign-in with redirectTo query param
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?redirectTo=.*${testEventId}`));
    await expect(page.locator("h1")).toContainText(/Welcome back/i);
  });

  test("redirects unauthenticated user accessing event creation to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/events/new");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("redirects unauthenticated user accessing print PDF dossier export route to /sign-in", async ({
    page,
  }) => {
    const testEventId = "11111111-1111-4111-8111-111111111111";
    await page.goto(`/dashboard/events/${testEventId}/export/pdf`);
    await expect(page).toHaveURL(new RegExp(`/sign-in\\?redirectTo=.*${testEventId}`));
  });

  test("executes end-to-end event planning journey when test credentials are provisioned", async ({
    page,
  }) => {
    // Safety Guard: Require dedicated test credentials (e.g. from local Supabase container)
    const testEmail = process.env.E2E_TEST_USER_EMAIL;
    const testPassword = process.env.E2E_TEST_USER_PASSWORD;

    test.skip(
      !testEmail || !testPassword,
      "Skipping live mutation test: Requires E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD provisioned against a test Supabase instance (local or CI)."
    );

    // 1. Sign in with test credentials
    await page.goto("/sign-in");
    await page.locator("input#email").fill(testEmail!);
    await page.locator("input#password").fill(testPassword!);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // 2. Verify navigation to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h1")).toContainText(/Event Planning Workspace/i);

    // 3. Navigate to Event Creation
    await page.getByRole("link", { name: /create new event/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/events\/new/);
    await expect(page.locator("h1")).toContainText(/Intelligent Event Setup/i);

    // 4. Form inputs & category chips
    const weddingChip = page.getByRole("button", { name: /Wedding & Reception/i });
    await expect(weddingChip).toBeVisible();
    await weddingChip.click();

    const uniqueEventName = `E2E Test Gala — ${Date.now()}`;
    await page.locator("input#event-name").fill(uniqueEventName);

    // Set target date 90 days in future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const isoDateOnly = futureDate.toISOString().split("T")[0];
    await page.locator("input#event-date").fill(isoDateOnly);

    await page.locator("input#event-location").fill("Moscone Center West");
    await page.locator("input#guest-count").fill("250");
    await page.locator("input#event-budget").fill("45000");

    // 5. Submit Event Form
    const submitBtn = page.getByRole("button", { name: /Initialize Event Workspace/i });
    await submitBtn.click();

    // 6. Verify navigation to Command Center
    await expect(page).toHaveURL(/\/dashboard\/events\/[a-f0-9-]+/, { timeout: 20000 });
    await expect(page.locator("h1")).toContainText(uniqueEventName);

    // 7. Locate and activate Vendor Checklist Jump Navigation
    const vendorNavButton = page.getByRole("link", { name: /Vendor Checklist/i });
    await expect(vendorNavButton).toBeVisible();
    await vendorNavButton.click();

    // 8. Verify timeline section status filter is set to Vendor
    const vendorFilterTab = page.getByRole("button", { name: /Vendor \(/i });
    await expect(vendorFilterTab).toHaveAttribute("aria-pressed", "true");

    // 9. Verify Export Menu dropdown is accessible
    const exportBtn = page.getByRole("button", { name: /Export options for/i });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    const exportMenu = page.getByRole("menu");
    await expect(exportMenu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(exportMenu).not.toBeVisible();
  });
});

