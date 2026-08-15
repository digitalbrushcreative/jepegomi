import { expect, test as check } from "@playwright/test";

/**
 * Whose server is that, then.
 *
 * This runs before anything that needs a browser, and its only job is to refuse
 * to go on if the thing answering on our port is not this site.
 *
 * It exists because that is not hypothetical. These tests attach to a server
 * that is already running rather than insisting on starting one — Next allows a
 * single `next dev` per project directory, so demanding a fresh one would mean
 * shutting down the one you are working in. The cost of attaching is that a port
 * is just a number, and on a laptop with several projects on it the number gets
 * taken. Twice in one afternoon this suite pointed at somebody else's
 * application: once at a Rails app that had claimed :3000, once at another
 * Next.js site that had taken over the port this one had moved to.
 *
 * Neither did any harm, and both were confusing in the same expensive way — the
 * failure surfaced as "sign-in form has no Email field", which reads as a broken
 * login page and sends you looking at the login page. The wasted half hour is
 * the whole argument for this file. A wrong-server failure has to say it is a
 * wrong-server failure.
 *
 * The port itself is pinned to 5174 in package.json and in playwright.config.ts.
 * That makes a collision unlikely; this makes it *legible*, which matters more,
 * because no port number is actually reserved to anybody.
 */

/*
  What identifies this site, in one string.

  The ministry's own name, which is in the title, the metadata and the logo on
  every page that renders — including the sign-in box at /app, which is the most
  stripped-down page the app has. Deliberately not a route or a header: any
  Next.js app answers to `X-Powered-By: Next.js`, which is exactly how the second
  of those two mix-ups managed to look normal.
*/
const MARKER = "Jepegomi";

check("the server on our port is this site", async ({ page, baseURL }) => {
  const response = await page.goto("/");

  const status = response?.status();
  const body = await page.content();

  if (!body.includes(MARKER)) {
    const title = await page.title().catch(() => "");

    throw new Error(
      [
        `Something else is answering on ${baseURL}.`,
        "",
        `Expected a page mentioning "${MARKER}". Got HTTP ${status ?? "no response"}` +
          (title ? `, titled "${title}".` : "."),
        "",
        "Nothing has been run against it. Start this project's own server —",
        "`npm run dev`, which binds :5174 — or point the tests somewhere else",
        "with E2E_PORT, and try again.",
      ].join("\n"),
    );
  }

  // Belt and braces: a marker in a 500 page would be a rendering failure, not a
  // healthy server, and every suite after this one would fail obscurely.
  expect(status, "the site answered, but not with a working page").toBeLessThan(
    400,
  );
});
