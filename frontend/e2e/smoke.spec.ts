import { test, expect } from "@playwright/test";

// Smoke test: login page loads without crashing
test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h1")).toContainText("Bolt Abacus");
});

// Unauthenticated hub access redirects to login
test("hub redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/hub");
  await expect(page).toHaveURL(/\/login/);
});
