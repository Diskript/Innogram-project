import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("unauthenticated visit redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
