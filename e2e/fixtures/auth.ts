import { test as base, type Page } from "@playwright/test";
import { loginViaUi, registerUser, type SeedUser } from "../helpers/seed";

export type TestFixtures = {
  authedPage: Page;
};

export const test = base.extend<TestFixtures>({
  authedPage: async ({ page }, use) => {
    const user = primaryUser();
    await registerUser(user);
    await loginViaUi(page, user);
    await use(page);
  },
});

export function makeUser(suffix: string): SeedUser {
  return {
    email: `e2e-${suffix}@innogram.test`,
    password: "E2e-Secure-Pass-123",
    username: `e2e_${suffix.replace(/[^a-zA-Z0-9_]/g, "_")}`,
    displayName: `E2E ${suffix}`,
    birthday: "1990-01-01",
  };
}

export function primaryUser(): SeedUser {
  return makeUser("primary");
}

export async function ensureUser(user: SeedUser): Promise<void> {
  await registerUser(user);
}

export { loginViaUi, registerUser };
