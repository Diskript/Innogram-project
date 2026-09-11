import { expect } from "@playwright/test";
import { test, makeUser, ensureUser, loginViaUi } from "./fixtures/auth";

test.describe("auth flow", () => {
  test("signup redirects to the app", async ({ page }) => {
    const user = makeUser(`signup-${Date.now()}`);
    await page.goto("/signup");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    const confirmPassword = page.getByLabel(/Confirm password/i);
    if (await confirmPassword.count())
      await confirmPassword.fill(user.password);
    const username = page.getByLabel(/Username/i);
    if (await username.count()) await username.fill(user.username);
    const displayName = page.getByLabel(/Display ?name/i);
    if (await displayName.count()) await displayName.fill(user.displayName);
    const birthday = page.getByLabel(/Birth/i);
    if (await birthday.count()) await birthday.fill(user.birthday!);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/(\?.*)?$/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/(\?.*)?$/);
  });

  test("login through the UI lands on the feed", async ({ page }) => {
    const user = makeUser("auth-flow");
    await ensureUser(user);
    await loginViaUi(page, user);
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    // sidebar chrome is present for authed users
    await expect(page.getByRole("link", { name: "Innogram" })).toBeVisible();
  });

  test("wrong credentials show an error and stay on /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@test.local");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText(/invalid|wrong|not found|error/i).first(),
    ).toBeVisible();
  });
});
