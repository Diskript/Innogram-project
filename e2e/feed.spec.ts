import { expect } from "@playwright/test";
import { test, makeUser, ensureUser, loginViaUi } from "./fixtures/auth";

test.describe("feed", () => {
  test("created post shows on the author's profile and in another user's feed", async ({
    browser,
  }) => {
    const author = makeUser("feed-author");
    const reader = makeUser("feed-reader");
    await ensureUser(author);
    await ensureUser(reader);

    const POST_TEXT = `E2E feed post ${Date.now()}`;

    // author creates the post
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await loginViaUi(pageA, author);
    await pageA.getByPlaceholder("What's happening?").fill(POST_TEXT);
    await pageA.getByRole("button", { name: "Post" }).click();

    // author sees it on their own profile
    await pageA.goto(`/profile/${author.username}`);
    await expect(pageA.getByText(POST_TEXT).first()).toBeVisible({
      timeout: 15_000,
    });

    // the reader logs in and sees it in their feed (own posts are excluded
    // from the feed by design — userId not: self)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginViaUi(pageB, reader);
    await expect(pageB.getByText(POST_TEXT).first()).toBeVisible({
      timeout: 15_000,
    });

    await contextA.close();
    await contextB.close();
  });
});
