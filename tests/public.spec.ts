import { expect, test } from "@playwright/test";
import { documents } from "../src/cms/schema";
import { site } from "../src/lib/site";

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
  { path: "/projects/playground", name: "Playground" },
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

  /*
    The sitemap is a hand-written list in app/sitemap.ts, and it is defended
    there on good grounds: it says what *exists*, which is a different question
    from what the nav should offer, and deriving one from the other would drop
    /needs — a page reachable from no menu and among the most important here.

    The cost of writing it by hand is that a page can be built and never added,
    which is exactly what happened: /projects/playground shipped, went into the
    nav, and stayed out of the sitemap. Nothing failed, because nothing was
    looking.

    So this looks — against the CMS schema rather than against the nav. Every
    document there with a `path` is a page somebody can edit and therefore a
    page that exists, which makes it the closest thing to an inventory the code
    has. The exception list is short and each entry has a reason.
  */
  test("the sitemap knows about every page", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();

    /* A receipt. It is reached from the giving flow, not searched for, and
       carries its own `robots: { index: false }` for the same reason. */
    const unlisted = new Set(["/give/thanks"]);

    const paths = new Set(
      Object.values(documents)
        .map((document) => document.path)
        .filter((path): path is string => path !== null && !unlisted.has(path)),
    );

    for (const path of paths) {
      /*
        The live host, not the one under test. The sitemap is built from
        site.url by design — a sitemap has to name the addresses it is claiming,
        and localhost is not one of them.
      */
      const url = `${site.url}${path === "/" ? "" : path}`;
      expect(xml, `${path} should be in the sitemap`).toContain(`<loc>${url}</loc>`);
    }
  });

  /*
    The ministry's to-do list is not part of the ministry's case.

    Four pages carry a dashed box naming what nobody has confirmed yet — service
    times, a signage quote, a Facebook address. They are written where the gap is
    so an editor cannot lose them, and they are for the editor alone: a visitor
    reading "Simon still needs to confirm this" learns only that the site is
    unfinished. They now render inside EditorOnly (components/editor-only.tsx),
    and this is the assertion that keeps them there.

    Every page, not just the four, because the next one of these will be written
    on some page nobody thought to add to a list.
  */
  const editorNote = /Still to (confirm|cost)|Only you see this/i;

  for (const { path, name } of pages) {
    test(`${name} keeps the ministry's own notes off the page`, async ({
      page,
    }) => {
      await page.goto(path);

      // The heading first: proof the body arrived, so absence means absence.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(editorNote)).toHaveCount(0);
    });
  }
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

/*
  The giving form, as somebody who has never given meets it.

  Three things went wrong here at once when the ledger moved behind a sign-in,
  and they are tested together because they are one shape: a giver arrives, is
  told nothing useful about what anything costs, and is expected to type a number
  anyway. The form now asks who they are first — which it always asked, just at
  the end — and hands back the figure for the one thing they picked.
*/
test.describe("giving, signed out", () => {
  test("names each project once in the picker", async ({ page }) => {
    await page.goto("/give");

    /*
      A project broken into steps produces a heading for its "all of it" row and
      another for each part. The project's own name belongs on the first of those
      and no others — printing it on every one made the playground appear three
      times down the list and read as duplicated projects.
    */
    const names = await page
      .locator("form .sticky p.eyebrow")
      .allTextContents();

    const seen = new Set<string>();
    for (const name of names) {
      expect(seen.has(name), `"${name}" heads more than one group`).toBe(false);
      seen.add(name);
    }
    expect(names.length).toBeGreaterThan(0);
  });

  test("asks who is giving before it asks what for", async ({ page }) => {
    await page.goto("/give");

    const form = page.locator("form").filter({ hasText: "Who is giving?" });
    await expect(form.getByText("Your details")).toBeVisible();

    // The picker belongs to the second step, and is not on screen yet.
    await expect(
      form.getByRole("group", { name: /what would you like your gift to go to/i }),
    ).toBeHidden();
  });

  test("shows the total for the item picked, and nothing for the rest", async ({
    page,
  }) => {
    await page.goto("/give");
    const form = page.locator("form").filter({ hasText: "Who is giving?" });

    await form.getByLabel("Who is giving?").fill("A Test Church");
    await form.getByLabel("Email").fill(`giving-${Date.now()}@example.invalid`);
    await form.getByRole("button", { name: "Continue" }).click();

    const picker = form.getByRole("group", {
      name: /what would you like your gift to go to/i,
    });
    await expect(picker).toBeVisible();

    /*
      Nothing in the list carries a balance. The four amounts on screen at this
      point are the suggestion chips, which are public constants and not the
      ledger's — so the assertion is against the ledger's own words rather than
      against anything shaped like money. That the response carries no figure at
      all is asserted properly, against the HTML, in security.spec.ts.
    */
    await expect(form.getByText(/still open/i)).toHaveCount(0);
    await expect(form.getByText(/for the whole item/i)).toHaveCount(0);

    const item = picker
      .locator('input[name="towards"]:not([value^="project:"]):not([value="other"])')
      .first();
    await item.check();

    // Exactly one figure appears, and it belongs to the thing just chosen.
    await expect(form.getByText(/still open/i)).toBeVisible();
  });
});

/*
  The rows these tests wrote, taken back out.

  `supporters` is not a scratch table — it is the list Simon reads at the foot of
  /app -> Partners to see who has been asking what things cost, and a suite run
  four times a day would fill it with addresses at `example.invalid` that nobody
  can write to and nobody should have to scroll past. The reserved domain is what
  makes this safe to delete on sight: no real supporter can ever be at one.
*/
test.afterAll(async () => {
  if (!process.env.DATABASE_URL) return;

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("DELETE FROM supporters WHERE email LIKE '%@example.invalid'");
  } catch {
    // Never worth failing a green run over a tidy-up.
  } finally {
    await pool.end();
  }
});
