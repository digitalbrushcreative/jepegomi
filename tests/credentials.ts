/**
 * The account the CMS tests sign in as.
 *
 * Its own file rather than a constant in the setup, because Playwright will not
 * let a spec import a setup file — and both need to know whether there is
 * anything to sign in with.
 *
 * Nothing here creates an account. These tests point at whatever DATABASE_URL
 * is set, which on this project is the real database, so the account is one you
 * already have and name in .env.local:
 *
 *   E2E_EMAIL=you@example.com
 *   E2E_PASSWORD=…
 *
 * Without them the CMS tests skip and the public ones still run.
 */
export const email = process.env.E2E_EMAIL;
export const password = process.env.E2E_PASSWORD;

export const hasCredentials = Boolean(email && password);

export const STATE_FILE = "tests/.auth/admin.json";
