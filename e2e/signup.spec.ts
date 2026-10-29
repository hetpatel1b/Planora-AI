import { test, expect } from "@playwright/test";

test.describe("Sign Up Flow & Client-Side Validations", () => {
  test("renders sign up page with registration form", async ({ page }) => {
    await page.goto("/sign-up");

    await expect(page.locator("h1")).toContainText(/create your account/i);
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator("input#confirm-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("validates matching password confirmation", async ({ page }) => {
    await page.goto("/sign-up");

    await page.locator("input#email").fill("test.unique@example.com");
    await page.locator("input#password").fill("StrongPassword123!");
    await page.locator("input#confirm-password").fill("DifferentPassword456!");

    await page.getByRole("button", { name: /create account/i }).click();

    const alert = page.getByRole("alert").filter({ hasText: /passwords do not match/i });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Passwords do not match. Please re-enter.");
  });

  test("toggles show and hide password fields independently", async ({ page }) => {
    await page.goto("/sign-up");

    const passwordInput = page.locator("input#password");
    const confirmInput = page.locator("input#confirm-password");

    const togglePasswordBtn = page.getByRole("button", { name: "Show password" });
    const toggleConfirmBtn = page.getByRole("button", { name: "Show confirm password" });

    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(confirmInput).toHaveAttribute("type", "password");

    await togglePasswordBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(confirmInput).toHaveAttribute("type", "password");

    await toggleConfirmBtn.click();
    await expect(confirmInput).toHaveAttribute("type", "text");
  });
});
