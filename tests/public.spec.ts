import { expect, test } from "@playwright/test";

/**
 * The public site, as a visitor meets it.
 *
 * Every page here is server-rendered from the CMS with the schema defaults
 * underneath, so "does it render" is a real question with a real answer: a page
 * that throws while reading its content, or a route that quietly stopped
 * existing, both show up here and nowhere else.
 */

/* Every route a visitor can reach, and the heading that proves it arrived. */
const pages = [
  { path: "/", name: "Home" },
  { path: "/about", name: "About" },
  { path: "/church", name: "Church" },
  { path: "/academy", name: "Academy" },
  { path: "/college", name: "Bible College" },
  { path: "/education", name: "Education" },
  { path: "/programs", name: "Programs" },
  { path: "/programs/food-at-school", name: "Food at School" },
  { path: "/programs/digital", name: "Digital" },
  { path: "/programs/transport", name: "Transport" },
  { path: "/projects", name: "Projects" },
  { path: "/projects/kitchen", name: "Kitchen" },
  { path: "/needs", name: "Needs" },
  { path: "/give", name: "Give" },
  { path: "/contact", name: "Contact" },
  { path: "/partners", name: "Partner sign in" },
];

test.describe("the public site", () => {
  for (const { path, name } of pages) {
    test(`${name} renders`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status(), `${path} should answer 200`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // The site's own header, which is what tells this apart from /app.
      await expect(page.getByRole("navigation", { name: "Main" })).toBeAttached();
    });
  }

  test("the header links to the arms of the ministry", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Church", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Give/ }).first()).toBeVisible();
  });

  test("a 404 is a 404", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
  });
});

/**
 * The line between the two halves of the site.
 *
 * /app sits outside the `(site)` route group precisely so that it does not wear
 * the public header and footer. That is invisible until it regresses, which is
 * exactly the kind of thing worth pinning down.
 */
test.describe("the CMS, signed out", () => {
  test("offers a sign-in and nothing else", async ({ page }) => {
    await page.goto("/app");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // No rail without a session, and no public chrome either.
    await expect(page.getByRole("navigation", { name: "Manage" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
  });

  test("keeps its screens shut", async ({ page }) => {
    /*
      Each of these redirects to /app rather than rendering. The point is not
      the redirect — it is that none of the ledger is on screen at the end of it.
    */
    for (const path of [
      "/app/pages",
      "/app/needs",
      "/app/payments",
      "/app/partners",
      "/app/people",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/app$/);
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    }
  });
});
