import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test as setup } from "@playwright/test";
import { STATE_FILE, email, hasCredentials, password } from "./credentials";

/**
 * Sign in once; every CMS test reuses the cookie.
 *
 * This signs in through the real form rather than minting a session cookie
 * itself, because signing in is one of the things worth testing and a test
 * suite that forged its own session would never notice it had broken.
 *
 * The credentials are yours, out of .env.local — nothing here creates an
 * account. That is deliberate: these tests point at whatever DATABASE_URL is
 * set, which on this project is the real database, and a test run should not be
 * able to add people to it. Without them, this writes an empty state and the
 * CMS tests skip.
 */
setup("sign in to the CMS", async ({ page }) => {
  mkdirSync(dirname(STATE_FILE), { recursive: true });

  if (!hasCredentials) {
    writeFileSync(STATE_FILE, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(
      true,
      "Set E2E_EMAIL and E2E_PASSWORD in .env.local to run the CMS tests.",
    );
    return;
  }

  await page.goto("/app");

  // getByLabel, not getByRole: a password input has no implicit ARIA role.
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();

  // The sidebar only exists once a session does, so it is the proof of one.
  await expect(page.getByRole("navigation", { name: "Manage" })).toBeVisible();

  await page.context().storageState({ path: STATE_FILE });
});
