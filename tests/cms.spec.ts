import { expect, test } from "@playwright/test";
import { documentGroups, documentKeys, documents } from "../src/cms/schema";
import { hasCredentials } from "./credentials";

/**
 * The CMS, signed in.
 *
 * These drive the thing Simon & Joyce actually use: the rail down the left, the
 * filing the pages are in, and the editor at the end of it. The document list
 * is read from the schema rather than typed out, so adding a page to
 * src/cms/schema.ts extends this suite by itself — and a page that gets added
 * to the schema but never reaches the sidebar fails here.
 */

test.skip(
  !hasCredentials,
  "Set E2E_EMAIL and E2E_PASSWORD in .env.local to run the CMS tests.",
);

/**
 * One rail link by its label, tolerating the count beside it.
 *
 * Three of these links carry a badge — claims, partners and enquiries waiting —
 * and a badge is part of the link, so its accessible name is "Needs 2" on a
 * morning somebody has claimed two things and "Needs" on a morning nobody has.
 * Matching the label exactly therefore passed or failed on what was in the
 * database that hour, which is not a thing about the rail at all.
 *
 * Anchored at both ends rather than loosened to a substring, so this still
 * catches the failure it was written for: a link whose label has been changed
 * or lost. Only the digits are optional.
 *
 * The space before them has to be optional too, because the two ways of asking
 * disagree about it: an accessible name is assembled from the label and the
 * badge as "Needs 2", and `toHaveText` reads the raw textContent of the same
 * element, where the two spans sit against each other as "Needs2".
 */
const railLink = (label: string) =>
  new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\d*$`);

test.describe("the shell", () => {
  test("puts the whole tool in the rail", async ({ page }) => {
    await page.goto("/app");

    const rail = page.getByRole("navigation", { name: "Manage" });
    await expect(rail).toBeVisible();

    for (const label of [
      "Dashboard",
      "Pages",
      "Photos",
      "Email",
      "Needs",
      "Where the money went",
      "Payments",
      "Partners",
      "Enquiries",
      "Site details",
      "People",
    ]) {
      await expect(rail.getByRole("link", { name: railLink(label) })).toBeVisible();
    }

    // The categories the links are filed under.
    for (const section of ["Content", "Giving", "Settings"]) {
      await expect(rail.getByText(section, { exact: true })).toBeVisible();
    }
  });

  test("wears none of the public chrome", async ({ page }) => {
    await page.goto("/app");

    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View site" })).toBeVisible();
  });

  test("lights exactly one link, and the right one", async ({ page }) => {
    await page.goto("/app/needs");

    const rail = page.getByRole("navigation", { name: "Manage" });
    const lit = rail.locator("[aria-current='page']");

    await expect(lit).toHaveCount(1);
    await expect(lit).toHaveText(railLink("Needs"));
  });

  test("lights Site details rather than Pages, inside Site details", async ({
    page,
  }) => {
    /*
      The two share a path — /app/pages/site sits under /app/pages — so this is
      the case that catches a naive startsWith() in the active-link logic.
    */
    await page.goto("/app/pages/site");

    const rail = page.getByRole("navigation", { name: "Manage" });
    const lit = rail.locator("[aria-current='page']");

    await expect(lit).toHaveCount(1);
    await expect(lit).toHaveText("Site details");
  });

  test("says where you are, across the top", async ({ page }) => {
    await page.goto("/app/pages/home");

    const trail = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(trail).toContainText("Pages");
    await expect(trail).toContainText("Home");
  });

  test("signs you out again", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Manage" })).toHaveCount(0);
  });
});

test.describe("the dashboard", () => {
  test("leads with what is waiting", async ({ page }) => {
    await page.goto("/app");

    for (const label of [
      "Claims to confirm",
      "New enquiries",
      "Partners to verify",
      "Received in total",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(
      page.getByRole("heading", { name: "Claims waiting" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recently edited" }),
    ).toBeVisible();
  });

  test("a stat is the way to the screen that clears it", async ({ page }) => {
    await page.goto("/app");
    await page.getByText("New enquiries", { exact: true }).click();

    await expect(page).toHaveURL(/\/app\/enquiries$/);
    await expect(page.getByRole("heading", { name: "Enquiries" })).toBeVisible();
  });
});

test.describe("payments", () => {
  test("shows what the site has taken", async ({ page }) => {
    await page.goto("/app/payments");

    await expect(page.getByRole("heading", { name: "Payments", level: 1 })).toBeVisible();

    for (const label of ["Received", "Charged", "In progress", "Came to nothing"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    /*
      Either the table or the empty state, depending on whether anybody has paid
      on this database yet — both are a pass. What would not be is neither.
    */
    const table = page.getByRole("table");
    const empty = page.getByText("Nothing has been paid on the site yet");
    await expect(table.or(empty).first()).toBeVisible();
  });

  test("is read-only — Pesapal's word, not ours", async ({ page }) => {
    await page.goto("/app/payments");

    /*
      No way to alter a payment from here: the merchant statement is the record.

      Scoped to the screen rather than the document, because the chrome around
      it has buttons of its own — Sign out, and the menu toggle on a narrow
      window — and neither of those is a way to edit a payment. Unscoped, this
      asserted something nobody meant and that no version of the page could
      satisfy.
    */
    await expect(page.locator("#main").getByRole("button")).toHaveCount(0);
  });
});

test.describe("where the money went", () => {
  /*
    Read-only, like everything else in this file. Nothing here presses Record —
    these tests point at the real database, and a screen whose whole job is
    writing rows into the giving ledger is the last one to leave test data in.
    What is worth pinning without writing anything is that the vocabulary is
    right, because the vocabulary is the entire reason this screen exists: the
    same rows were always reachable under Needs, and nobody could find them.
  */
  test("asks what was bought, not what is needed", async ({ page }) => {
    await page.goto("/app/spending");

    await expect(
      page.getByRole("heading", { name: "Where the money went", level: 1 }),
    ).toBeVisible();

    const add = page
      .locator("form")
      .filter({ has: page.getByLabel("Which project") });

    for (const label of [
      "Which project",
      "What was bought",
      "Estimated",
      "Actual",
      "Why the two differ",
    ]) {
      await expect(add.getByLabel(label)).toBeVisible();
    }

    await expect(add.getByRole("button", { name: "Record this" })).toBeVisible();
  });

  test("offers no way to put an expense on the public site", async ({ page }) => {
    await page.goto("/app/spending");

    /*
      The single worst bug this screen could have is an expense that arrives on
      /needs with a Give button under it — a church asked to pay for something
      already bought. The way to not have it is to have no control for it, so
      the two switches the Needs form carries are absent here and the action
      decides both. See the head of app/spending/actions.ts.
    */
    const add = page
      .locator("form")
      .filter({ has: page.getByLabel("Which project") });

    await expect(add.getByRole("checkbox")).toHaveCount(0);
  });

  test("shows what is on the books, or says there is nothing", async ({
    page,
  }) => {
    await page.goto("/app/spending");

    const booked = page.getByRole("heading", { name: "On the books" });
    const empty = page.getByRole("heading", { name: "Nothing recorded yet" });
    await expect(booked.or(empty).first()).toBeVisible();
  });
});

test.describe("pages", () => {
  test("files every document under its own group", async ({ page }) => {
    await page.goto("/app/pages");

    /*
      The screen, not the document. Standing on /app/pages opens the Pages
      drawer in the rail, which lists every document by the same title this
      screen does — so an unscoped lookup finds each of them twice and fails on
      the ambiguity rather than on anything being wrong.
    */
    const screen = page.locator("#main");

    for (const group of documentGroups) {
      await expect(
        screen.getByRole("heading", { name: group.label, exact: true }),
      ).toBeVisible();
    }

    for (const key of documentKeys()) {
      await expect(
        screen.getByRole("link", { name: documents[key].title, exact: true }),
      ).toBeVisible();
    }
  });

  test("opens a document into its editor", async ({ page }) => {
    await page.goto("/app/pages");
    await page.getByRole("link", { name: "Home", exact: true }).first().click();

    await expect(page).toHaveURL(/\/app\/pages\/home$/);
    await expect(page.getByRole("heading", { name: "Home", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(page.getByRole("link", { name: "View page" })).toBeVisible();
  });

  test("opens the rail into the document list once you are inside", async ({
    page,
  }) => {
    await page.goto("/app/pages/about");

    const rail = page.getByRole("navigation", { name: "Manage" });
    // The sub-list under Pages: siblings you can hop straight to.
    await expect(rail.getByRole("link", { name: "Church", exact: true })).toBeVisible();
    await expect(rail.getByRole("link", { name: "Contact", exact: true })).toBeVisible();
  });

  test("shows every field the schema declares", async ({ page }) => {
    await page.goto("/app/pages/contact");

    for (const field of Object.values(documents.contact.fields)) {
      await expect(page.getByText(field.label, { exact: true }).first()).toBeVisible();
    }
  });

  test("draws a choice field as radios, with the saved one selected", async ({
    page,
  }) => {
    /*
      The newest field type, and the one it matters most to see rendered: these
      are the switches that decide who may read a project's accounts, so an
      editor has to be able to tell at a glance which position each is in.
      Radios rather than a dropdown for exactly that reason — a select shows one
      option and hides the two you are choosing against.
    */
    await page.goto("/app/pages/projectAccounts");

    const radios = page.getByRole("radio");
    await expect(radios.first()).toBeVisible();

    // The default is the middle rung, and nothing has been saved over it.
    await expect(
      page.getByRole("radio", { name: /people who paid for it/i }).first(),
    ).toBeChecked();
  });

  test("every document opens without falling over", async ({ page }) => {
    /*
      A document added to the schema with a field type the editor cannot draw is
      a page that 500s, and the only way to find out is to open it. Cheap, and it
      is the one test that grows by itself as documents are added.
    */
    for (const key of Object.keys(documents)) {
      const response = await page.goto(`/app/pages/${key}`);
      expect(response?.status(), `${key} should render`).toBeLessThan(400);
      await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    }
  });
});

/**
 * The notes the site keeps to itself, on the public pages they belong to.
 *
 * A "still to confirm" box is written into the hole it describes — the service
 * times box sits where the service times would be — so that an editor meets it
 * while looking at the page rather than in a list somewhere else. Which means
 * these live on public routes and are gated by the session instead of by the
 * URL, the one thing on this site that is. See components/editor-only.tsx; the
 * other half of this, that a visitor sees none of it, is in public.spec.ts.
 */
test.describe("the ministry's own notes", () => {
  const NOTED_PAGES = ["/church", "/college", "/academy", "/programs/digital"];
  const editorNote = /Still to (confirm|cost)|Only you see this/i;

  test("are on the public page for an editor and nobody else", async ({
    page,
    browser,
  }) => {
    /*
      A second context with no storage state — the same URL, fetched as a
      stranger, in the same run. Comparing the two is the whole test: an
      assertion that the signed-in page has a note would depend on which fields
      happen to be blank in the database this suite is pointed at, and an
      assertion that the signed-out page has none is already made in
      public.spec.ts. What cannot be data-dependent is that they differ in one
      direction only.
    */
    /*
      The empty state is spelled out rather than left off. A bare
      `newContext()` in this project comes up carrying the admin cookie the
      setup step saved — which would make the stranger a second editor, and the
      assertion below would pass on a page that had failed.
    */
    const visitor = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const strangersPage = await visitor.newPage();

    let seen = 0;

    try {
      for (const path of NOTED_PAGES) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const forEditor = await page.getByText(editorNote).count();

        await strangersPage.goto(path);
        await expect(
          strangersPage.getByRole("heading", { level: 1 }),
        ).toBeVisible();

        await expect(
          strangersPage.getByText(editorNote),
          `${path} should keep its notes from a visitor`,
        ).toHaveCount(0);

        seen += forEditor;
      }
    } finally {
      await visitor.close();
    }

    /*
      Not a failure — it means Simon and Joyce have answered everything, which
      is the point of the boxes. It is worth saying out loud, because a suite
      that silently proved nothing would read exactly the same as one that did.
    */
    test.skip(
      seen === 0,
      "Every field on those pages is filled in, so there is no note to gate.",
    );
  });
});

/**
 * Writing a letter.
 *
 * Nothing here presses Send, and nothing here ever should: these run against
 * whatever DATABASE_URL is set, which on this project is the real database with
 * the real partners in it. What is worth proving without sending anything is
 * that the preview is the template — the whole reason it is rendered on the
 * server by the same function that builds the message — and that the send
 * button stays out of reach until there is something to send.
 */
test.describe("writing an email", () => {
  const write = async (page: import("@playwright/test").Page) => {
    await page.goto("/app/email");

    /*
      `exact`, because the Eyebrow field's own hint says "the small line above
      the heading" — and an accessible name is the label plus everything else
      describing the box, hint included.
    */
    await page.getByLabel("Subject", { exact: true }).fill("The kitchen has a roof on it");
    await page.getByLabel("Heading", { exact: true }).fill("The kitchen has a roof on it");
    await page
      .getByLabel("The letter", { exact: true })
      .fill("On Tuesday the cooks made porridge in it for the first time.");
  };

  test("holds the send back until there is a letter to send", async ({ page }) => {
    await page.goto("/app/email");

    const send = page.getByRole("button", { name: /^Send to / });
    await expect(send).toBeDisabled();

    await write(page);
    await expect(send).toBeEnabled({ timeout: 20_000 });
  });

  test("previews the real template, not an impression of it", async ({ page }) => {
    await write(page);

    /*
      Reaching inside the iframe on purpose. A screenshot would prove it drew
      something; this proves the thing it drew is the message — the masthead
      image, the words that were typed, and the ministry's own address under
      them.
    */
    const preview = page.frameLocator("iframe[title='Preview of the email']");

    await expect(
      preview.getByRole("heading", { name: "The kitchen has a roof on it" }),
    ).toBeVisible({ timeout: 20_000 });
    /*
      The paragraph, specifically. The same words are also in the hidden
      preheader — the line an inbox shows under the subject — which is built
      from the opening of the letter on purpose.
    */
    await expect(
      preview
        .getByRole("paragraph")
        .filter({ hasText: "On Tuesday the cooks made porridge" }),
    ).toBeVisible();
    await expect(preview.getByRole("img")).toBeVisible();
    /* The masthead's own line, not the address repeated in the footer. */
    await expect(
      preview.getByText("Kahawa Sukari, Nairobi, Kenya", { exact: true }),
    ).toBeVisible();
  });

  test("says who it would go to before it goes", async ({ page }) => {
    await page.goto("/app/email");

    await page.getByLabel("Who it goes to").selectOption("custom");
    await page
      .getByLabel("The addresses")
      .fill("ruth@example.invalid\nnjoroge@example.invalid");

    await expect(page.getByText("2 people", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    /* Read back as the server resolved them, not as they sit in the textarea. */
    await expect(
      page.getByText("ruth@example.invalid, njoroge@example.invalid", {
        exact: true,
      }),
    ).toBeVisible();

    /* And the count is on the button, so nobody presses it without seeing it. */
    await expect(page.getByRole("button", { name: "Send to 2 people" })).toBeVisible();
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test("hides the rail behind a menu, and gives it back", async ({ page }) => {
    await page.goto("/app");

    const rail = page.getByRole("navigation", { name: "Manage" });
    await expect(rail).not.toBeInViewport();

    await page.getByRole("button", { name: "Open the menu" }).click();
    await expect(rail).toBeInViewport();

    // Following a link puts it away again — it covers the page you asked for.
    await rail.getByRole("link", { name: "Pages", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/pages$/);
    await expect(rail).not.toBeInViewport();
  });
});
