import { test, expect } from "@playwright/test";

/**
 * Requires the Django API on http://localhost:8000 (e.g. `docker compose up` from repo root)
 * and VITE_API_URL pointing at it (see apps/frontend/.env.example).
 */
const AUTH_KEY = "enginventory_user";

async function loginAsTestUser(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [AUTH_KEY, JSON.stringify({ name: "E2E User", email: "e2e@example.com" })] as const,
  );
}

test.describe("public pages", () => {
  test("landing loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("authenticated app", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test("sidebar navigation reaches all main sections", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible();

    const links: { name: RegExp; path: string }[] = [
      { name: /^Dashboard$/, path: "/dashboard" },
      { name: /^Inventory$/, path: "/inventory" },
      { name: /^Requests$/, path: "/requests" },
      { name: /^Borrowed$/, path: "/borrowed" },
      { name: /^Suppliers$/, path: "/suppliers" },
      { name: /^Reports$/, path: "/reports" },
    ];

    for (const { name, path } of links) {
      await page.getByRole("link", { name }).first().click();
      await expect(page).toHaveURL(new RegExp(`${path.replace("/", "\\/")}$`));
      await expect(page.locator("main")).toBeVisible();
    }

    await page.getByRole("link", { name: /^Settings$/ }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.locator("main")).toBeVisible();

    // Activity is linked from the header bell menu, not the sidebar
    await page.goto("/activity");
    await expect(page).toHaveURL(/\/activity$/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("top bar: notifications popover opens", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Notifications" }).click();
    // Dashboard also has a "Recent Activity" card; popover is identified by this CTA copy
    await expect(page.getByRole("button", { name: /view all activity/i })).toBeVisible();
    await page.getByRole("button", { name: /view all activity/i }).click();
    await expect(page).toHaveURL(/\/activity$/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("inventory: open and close Add Item dialog", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.locator("main")).toBeVisible();
    await page.getByRole("button", { name: /add item/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /add new item/i })).toBeVisible();
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
