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

// Login page form structure (no backend needed)
test("login page has form inputs", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

// Register page form structure (no backend needed)
test("register page has form inputs", async ({ page }) => {
  await page.goto("/register");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
