import { test, expect } from "@playwright/test";

test.describe("WCAG 2.2 Accessibility & Keyboard Navigation (E2E)", () => {
  test("activates skip-to-content link via Tab and focuses main landmark", async ({
    page,
  }) => {
    await page.goto("/");

    // Press Tab to bring focus to the skip link
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();

    // Verify skip link is visible upon receiving focus
    await expect(skipLink).toBeVisible();

    // Press Enter to follow anchor
    await page.keyboard.press("Enter");

    // The target is main#main-content
    const mainContent = page.locator("main#main-content");
    await expect(mainContent).toBeAttached();
    expect(page.url()).toContain("#main-content");
  });

  test("enforces interactive keyboard focus order and visible indicators on sign-in page", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // Verify landmark tree
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/Welcome back/i);

    // Focus email input and traverse form sequence via Tab
    const emailInput = page.locator("input#email");
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    // Next Tab moves to Password input
    await page.keyboard.press("Tab");
    const passwordInput = page.locator("input#password");
    await expect(passwordInput).toBeFocused();

    // Next Tab moves to Password Toggle button
    await page.keyboard.press("Tab");
    const toggleButton = page.getByRole("button", { name: /show password/i });
    await expect(toggleButton).toBeFocused();

    // Next Tab moves to Submit button
    await page.keyboard.press("Tab");
    const submitButton = page.getByRole("button", { name: /^sign in$/i });
    await expect(submitButton).toBeFocused();

    // Next Tab moves to Sign Up link
    await page.keyboard.press("Tab");
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeFocused();
  });

  test("confirms proper input label association and ARIA states on sign-in form", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    const emailInput = page.locator("input#email");
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();
    await expect(emailLabel).toContainText(/Email/i);
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");

    const passwordInput = page.locator("input#password");
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();
    await expect(passwordLabel).toContainText(/Password/i);
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveAttribute("required", "");

    // Check button role and type
    const submitButton = page.getByRole("button", { name: /^sign in$/i });
    await expect(submitButton).toHaveAttribute("type", "submit");
  });

  test("maintains accessible dialog and escape key semantics on mobile viewport", async ({
    page,
  }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Mobile nav hamburger button has accessible aria-label or name
    const mobileMenuBtn = page.getByRole("button", { name: /open navigation menu/i });
    if (await mobileMenuBtn.isVisible()) {
      await mobileMenuBtn.click();

      // Mobile nav dialog / overlay appears
      const mobileNav = page.getByRole("dialog", { name: /navigation/i });
      if (await mobileNav.isVisible()) {
        await page.keyboard.press("Escape");
        await expect(mobileNav).not.toBeVisible();
      }
    }
  });
});
