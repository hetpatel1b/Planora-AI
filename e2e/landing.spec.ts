import { test, expect } from "@playwright/test";

test.describe("Landing Page & Public Flow", () => {
  test("loads landing page with hero headline, features, and value props", async ({ page }) => {
    await page.goto("/");

    // Verify headline
    const headline = page.locator("h1");
    await expect(headline).toBeVisible();
    await expect(headline).toContainText("Effortless Event Planning");

    // Verify semantic landmarks
    await expect(page.locator("main#main-content")).toBeVisible();

    // Verify key feature card headings exist
    await expect(page.getByRole("heading", { name: "Intelligent Event Setup" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Smart Budget Manager" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What-If Budget Simulator" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Event Risk Radar" })).toBeVisible();
  });

  test("navigates from landing page to sign-in page via navbar action", async ({ page }) => {
    await page.goto("/");

    const signInLink = page.locator("nav").getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await signInLink.click();

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.locator("h1")).toContainText(/Welcome back/i);
  });

  test("contains skip-to-content accessible link", async ({ page }) => {
    await page.goto("/");

    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toBeAttached();
    expect(await skipLink.getAttribute("href")).toBe("#main-content");
  });
});
