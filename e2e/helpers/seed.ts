import type { Page } from "@playwright/test";

export const AUTH_URL = process.env.E2E_AUTH_URL ?? "http://localhost:3002";
export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";

export interface SeedUser {
  email: string;
  password: string;
  username: string;
  displayName: string;
  birthday?: string;
}

/**
 * Seeds a user through the auth API. 201 on the first run, 409 when the
 * user already exists — both are fine; anything else fails loudly.
 */
export async function registerUser(user: SeedUser): Promise<void> {
  const res = await fetch(`${AUTH_URL}/jwt-auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      username: user.username,
      displayName: user.displayName,
      birthday: user.birthday ?? "1990-01-01",
    }),
  });
  if (![201, 409].includes(res.status)) {
    throw new Error(
      `Failed to seed user ${user.username}: ${res.status} ${await res.text()}`,
    );
  }
}

/**
 * Drives the real /login UI flow so the innogram_session cookie and the
 * localStorage refresh token are set exactly like in production.
 */
export async function loginViaUi(page: Page, user: SeedUser): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(\?.*)?$/);
  await page.waitForLoadState("networkidle");
}
