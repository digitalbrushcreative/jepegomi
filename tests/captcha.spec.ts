import { type Page, expect, test } from "@playwright/test";

/**
 * The captcha, and specifically the parts of it that fail quietly.
 *
 * Whether Google scores a browser correctly is Google's to get right and
 * nothing we could assert against anyway. What is worth pinning down is the
 * behaviour around it, all of which is invisible when it breaks:
 *
 *   - **Nothing is fetched from Google until somebody touches the form.** The
 *     privacy claim the whole design rests on, and one line moving it into an
 *     ordinary page load would silently undo.
 *   - **One press is one submission.** The giving form writes to the ledger.
 *     An earlier version of this fetched the token at submit time and handed
 *     the submission back to React, which raced; this exists so nobody
 *     reintroduces that.
 *   - **A form that cannot get a token still behaves.** Strict forms say so in
 *     words rather than failing mutely.
 *
 * Google is never actually called. The script request is intercepted and
 * answered with a stub, so these run offline and cannot be made to fail by
 * somebody else's outage.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

/*
  With no key set there is no captcha in the build at all — no hidden field, no
  script, no interception — and every assertion below would be testing the
  absence of the thing it is about. Skipped rather than quietly passing, the
  same way the CMS tests skip without a login.
*/
test.skip(
  !SITE_KEY,
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set, so there is no captcha to test.",
);

/**
 * Google's script, replaced with one that mints a predictable token.
 *
 * `token` is what `grecaptcha.execute` resolves with; `fail` makes it reject,
 * which is how a blocked or broken load looks from the page's side.
 */
async function stubRecaptcha(page: Page, { fail = false } = {}) {
  await page.route("https://www.google.com/recaptcha/api.js**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: fail
        ? `window.grecaptcha = {
             ready: (cb) => cb(),
             execute: () => Promise.reject(new Error("blocked")),
           };`
        : `window.grecaptcha = {
             ready: (cb) => cb(),
             execute: (key, options) =>
               Promise.resolve("stub-token:" + options.action),
           };`,
    }),
  );
}

/** Every POST the page makes to its own origin — a server action is one. */
function countActionPosts(page: Page) {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().startsWith(page.url().split("?")[0])) {
      posts.push(request.url());
    }
  });
  return posts;
}

test.describe("the captcha", () => {
  test("does not call Google until somebody starts filling the form in", async ({
    page,
  }) => {
    let asked = false;
    await page.route("https://www.google.com/recaptcha/api.js**", (route) => {
      asked = true;
      return route.fulfill({ contentType: "application/javascript", body: "" });
    });

    await page.goto("/contact");
    await page.waitForLoadState("networkidle");

    expect(asked, "reading the page should not introduce a reader to Google").toBe(
      false,
    );

    await page.getByLabel("Your name").click();
    await expect.poll(() => asked, { timeout: 5_000 }).toBe(true);
  });

  test("sends the giving form exactly once, with the button that was pressed", async ({
    page,
  }) => {
    await stubRecaptcha(page);
    await page.goto("/give");

    const form = page.locator("form").filter({ visible: true }).first();

    /*
      What the gift is towards is a required radio group, and the browser
      refuses to submit without it — so leaving it out tests nothing about the
      captcha and everything about HTML validation.
    */
    await form.locator('input[name="towards"]').first().check();
    await form.locator('input[name="amount"]').fill("250");

    /*
      The form asks what the gift is for before it asks who is giving, so the
      second half is not on screen yet. Filling it in would silently fail — and
      "one press is one POST" is a claim about a form somebody could actually
      have reached this button on.
    */
    await form.getByRole("button", { name: /^continue/i }).click();

    await form.locator('input[name="name"]').fill("Ruth Wanjiku");
    await form.locator('input[name="email"]').fill("ruth@example.invalid");

    const posts = countActionPosts(page);

    /*
      The pledge button rather than the paying one: pressing "give now" would
      redirect off to Pesapal, which is not this test's business. What matters
      is that one press produces one POST.
    */
    const pledge = form.getByRole("button", { name: /record this gift|another way/i }).first();
    await pledge.click();

    await expect.poll(() => posts.length, { timeout: 15_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(2_000);

    expect(posts.length, "one press must be one submission").toBe(1);
  });

  test("turns the contact form away when no token can be minted", async ({ page }) => {
    await stubRecaptcha(page, { fail: true });
    await page.goto("/contact");

    const form = page.locator("form").filter({ visible: true }).first();
    await form.getByLabel("Your name").fill("Ruth Wanjiku");
    await form.getByLabel("Your email").fill("ruth@example.invalid");
    await form
      .getByLabel("Your message")
      .fill("This one should not reach anybody, because no token can be minted.");

    /* The mint has had its chance and failed, so the field is still empty. */
    await expect(form.locator('input[name="captchaToken"]')).toHaveValue("");

    /*
      Slower than the two-second clock in lib/forms.ts, which a browser driven
      by a script clears without trying. Trip it and the action answers `done`
      like the honeypot — the form is replaced by the thank-you, there is no
      alert to read, and this test fails for a reason that has nothing to do
      with the captcha it is about.
    */
    await page.waitForTimeout(2_500);

    await form.getByRole("button", { name: /send message/i }).click();

    /*
      Told plainly, with an address — not thanked, and not left staring at a
      form that did nothing. The wording is the contact action's.
    */
    await expect(form.getByRole("alert")).toContainText(/could not check/i);
  });

  test("has a token ready before the form is sent", async ({ page }) => {
    await stubRecaptcha(page);
    await page.goto("/contact");

    const form = page.locator("form").filter({ visible: true }).first();
    const token = form.locator('input[name="captchaToken"]');

    await expect(token, "empty until somebody touches the form").toHaveValue("");

    await form.getByLabel("Your name").click();

    /*
      Minted on first focus and held, rather than fetched when send is pressed.
      Read from the DOM rather than from the request body, because a server
      action posts an encoded payload rather than plain form fields.

      The action name is checked too: the server refuses a token minted for a
      different form, so a copied `<SpamTraps />` with the wrong name would turn
      every submission away and this is what says so.
    */
    await expect(token).toHaveValue("stub-token:contact", { timeout: 15_000 });
  });
});
