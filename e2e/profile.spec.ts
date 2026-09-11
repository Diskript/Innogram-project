import { expect } from "@playwright/test";
import { test, makeUser, ensureUser } from "./fixtures/auth";

test.describe("profile", () => {
  test("own profile shows the signed-in user without a follow button", async ({
    authedPage: page,
  }) => {
    await page.goto("/profile/e2e_primary");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("E2E primary").first()).toBeVisible();
    // own profile: no follow/unfollow actions
    await expect(page.getByRole("button", { name: /Unfollow/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Follow$/ })).toHaveCount(0);
  });

  test("another user's public profile offers follow and toggles", async ({
    authedPage: page,
  }) => {
    const other = makeUser("profile-other");
    await ensureUser(other);

    await page.goto(`/profile/${other.username}`);
    await page.waitForLoadState("networkidle");

    // the profile may have been followed by an earlier run — normalize to
    // "not following" first, then follow and assert the flip
    const unfollow = page.getByRole("button", { name: /Unfollow/ });
    const follow = page.getByRole("button", { name: /^Follow$/ });
    if (await unfollow.count()) {
      await unfollow.click();
      await expect(follow).toBeVisible({ timeout: 15_000 });
    }
    await follow.click();
    await expect(unfollow).toBeVisible({ timeout: 15_000 });
  });

  test("settings page updates the bio", async ({ authedPage: page }) => {
    await page.goto("/profile/settings");
    await page.waitForLoadState("networkidle");
    const bio = page.getByLabel(/Bio/i);
    await bio.fill(`e2e bio ${Date.now()}`);
    await page.getByRole("button", { name: /Save/i }).first().click();
    await expect(page.getByText(/saved|updated|success/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
