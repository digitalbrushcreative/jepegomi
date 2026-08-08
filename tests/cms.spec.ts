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

test.describe("the shell", () => {
  test("puts the whole tool in the rail", async ({ page }) => {
    await page.goto("/app");

    const rail = page.getByRole("navigation", { name: "Manage" });
    await expect(rail).toBeVisible();

    for (const label of [
      "Dashboard",
      "Pages",
      "Photos",
      "Needs",
      "Payments",
      "Partners",
      "Enquiries",
      "Site details",
      "People",
    ]) {
      await expect(rail.getByRole("link", { name: label, exact: true })).toBeVisible();
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
    await expect(lit).toHaveText("Needs");
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

    // No way to alter a payment from here: the merchant statement is the record.
    await expect(page.getByRole("button")).toHaveCount(0);
  });
});

test.describe("pages", () => {
  test("files every document under its own group", async ({ page }) => {
    await page.goto("/app/pages");

    for (const group of documentGroups) {
      await expect(
        page.getByRole("heading", { name: group.label, exact: true }),
      ).toBeVisible();
    }

    for (const key of documentKeys()) {
      await expect(
        page.getByRole("link", { name: documents[key].title, exact: true }),
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
