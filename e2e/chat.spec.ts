import { expect } from "@playwright/test";
import { test, makeUser, ensureUser } from "./fixtures/auth";

const MESSAGE = `e2e hello ${Date.now()}`;

test.describe("chat", () => {
  test("start a chat with another user and send a message", async ({
    authedPage: page,
  }) => {
    const other = makeUser("chat-other");
    await ensureUser(other);

    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "New chat" }).click();
    const search = page.getByPlaceholder(/Search people/i);
    await search.fill(other.username);

    // pick the seeded user from the search results
    const result = page.getByRole("option", {
      name: new RegExp(other.displayName, "i"),
    });
    await result.first().click();
    await page.getByRole("button", { name: "Start chat" }).click();

    // navigating into the fresh thread
    await page.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 20_000 });

    const composer = page.getByPlaceholder(/Message/);
    await composer.fill(MESSAGE);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(MESSAGE).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
