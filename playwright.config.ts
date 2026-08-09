import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

/*
  The test files read E2E_EMAIL and E2E_PASSWORD, which live in .env.local
  alongside everything else the app needs. Playwright does not read .env files,
  so this is Next's own loader doing it — the same one `next dev` uses, so the
  tests and the server they drive can never be reading different values.
*/
loadEnvConfig(process.cwd());

/**
 * Browser tests, against a real dev server.
 *
 * The site is almost entirely server-rendered, so there is very little here
 * that a unit test could reach: what is worth checking is whether a page
 * actually renders, whether a link goes where it says, and whether the CMS lets
 * the right person in and keeps everybody else out. That is a browser's job.
 *
 * Chromium only, on purpose. These are smoke tests for a site two people
 * maintain, not a compatibility matrix — a second engine would double the run
 * for a class of bug this site has never had.
 */

/*
  The ordinary dev port, because Next 16 allows exactly one `next dev` per
  project directory — a second one refuses to start whatever port it is given.
  So these attach to the server you already have running rather than trying to
  own one, and start their own only when there is nothing there.
*/
const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  /* The dev server compiles a route on first hit, and some of these are big. */
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["html", { open: "never" }], ["list"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    /*
      Signing in happens once, in its own project, and every CMS test reuses the
      cookie it saved. Doing it per-test would be a dozen round trips through a
      form that is not what any of them are testing.
    */
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    /*
      The pure rules — who may see whose accounts, what an uploaded file really
      is, what may reach an email header. No browser, no server, no database, so
      this project is the one that still runs on a laptop with nothing set up,
      and it is the one that fails in under a second when a rule changes.
    */
    { name: "rules", testMatch: /rules\.spec\.ts/ },
    /*
      Signed out, which is the state both of these files are about: what a
      visitor sees, and what somebody who is not supposed to be here cannot get.
      No `storageState`, so nothing in either can accidentally lean on the
      session the setup project saved.
    */
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /(public|security)\.spec\.ts/,
    },
    {
      name: "cms",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: /cms\.spec\.ts/,
    },
  ],

  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: baseURL,
    /* Attach to yours if it is up; start one only when nothing answers. */
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
