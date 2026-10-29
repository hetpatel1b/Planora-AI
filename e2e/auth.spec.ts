import { test, expect } from "@playwright/test";

test.describe("Authentication & Route Protection (Scenario A)", () => {
  test("redirects unauthenticated users attempting to access /dashboard to /sign-in", async ({
    page,
  }) => {
    // Navigate directly to protected route
    await page.goto("/dashboard");

    // Must be redirected to sign-in page
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.locator("h1")).toContainText(/Welcome back/i);
  });

  test("redirects unauthenticated users attempting to access /dashboard/events/new to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/events/new");

    // Must be redirected to sign-in
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("renders sign-in form with all required accessible controls", async ({ page }) => {
    await page.goto("/sign-in");

    // Brand and heading
    await expect(page.locator("h1")).toContainText("Welcome back");
    await expect(page.getByRole("link", { name: /Back to Planora AI/i })).toBeVisible();

    // Inputs and buttons
    const emailInput = page.locator("input#email");
    const passwordInput = page.locator("input#password");
    const submitButton = page.getByRole("button", { name: /^sign in$/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Link to Sign Up
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
  });

  test("toggles password visibility interactively", async ({ page }) => {
    await page.goto("/sign-in");

    const passwordInput = page.locator("input#password");
    const toggleButton = page.getByRole("button", { name: /show password/i });

    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle button to reveal password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click again to mask password
    const hideButton = page.getByRole("button", { name: /hide password/i });
    await hideButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("displays error message on invalid credentials submission", async ({ page }) => {
    await page.goto("/sign-in");

    await page.locator("input#email").fill("nonexistent.user.test@example.com");
    await page.locator("input#password").fill("IncorrectPassword123!");

    const submitButton = page.getByRole("button", { name: /^sign in$/i });
    await submitButton.click();

    // Alert banner should appear with credentials error or network error
    const alert = page.locator("[role='alert']");
    await expect(alert).toBeVisible({ timeout: 15000 });
  });
});
