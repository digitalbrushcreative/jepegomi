import { type Page, expect, test } from "@playwright/test";

/**
 * The sign-in form actually on screen.
 *
 * Filtered to the visible one, and that filter is load-bearing rather than
 * defensive. Every page on this site streams (Partial Prerendering, see
 * `cacheComponents` in next.config.ts), and React streams by parking the
 * finished markup in a `<div hidden>` at the end of `<body>` before moving it
 * into place. Arriving at /partners by way of a redirect from
 * /partners/dashboard leaves one of those buffers behind, so the document holds
 * two copies of the form: the one a person can see, and one with
 * `display: none` that a bare `getByLabel("Email")` matches just as happily.
 *
 * A test that grabs the wrong one does not fail cleanly — it sits there filling
 * an invisible box until it times out, which reads like a slow site rather than
 * a bad selector. Worth the two lines to never think about again.
 */
function signInForm(page: Page) {
  return page.locator("form").filter({ visible: true }).first();
}

/**
 * An address that is certainly not a partner, and certainly has not been used
 * before.
 *
 * `.invalid` is reserved by RFC 2606 and can never belong to anybody, so asking
 * for a code against one writes a counter row and nothing else. The unique part
 * matters just as much: asking is limited to three an hour *per address* (see
 * RATES.codeRequest), so a fixed address would make these tests pass once and
 * then fail each other, and the whole suite, for the rest of the hour.
 */
function strangerAddress(what: string) {
  return `not-a-partner-${what}-${Date.now()}@example.invalid`;
}

/**
 * Arrive as somebody the rate limiter has never seen.
 *
 * A unique address is only half of hermetic. Every limit in lib/rate-limit.ts is
 * counted twice — once against the address and once against the caller — and the
 * second counter is what these tests kept tripping over: `callerKey()` finds no
 * forwarded header on a local dev server, so every request from every test in
 * every run of the suite lands in the one "unknown" bucket. Twenty code requests
 * an hour is generous for a person and nothing at all for a suite run four
 * times, which is why this file started failing with "try again in about 37
 * minutes" rather than with anything to do with what it was testing.
 *
 * Setting the header is honest rather than a cheat: in production the platform
 * overwrites `x-forwarded-for` with the real client before the application ever
 * sees it, so this is the shape of thing the code reads in the field. The value
 * is not parsed as an address anywhere — it is a bucket key — so a label that
 * says where it came from is more use than a plausible-looking IP.
 */
async function freshCaller(page: Page, what: string) {
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `test-${what}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
}

/**
 * The things that must stay true when links go out to strangers.
 *
 * Everything here is a regression test for a decision made somewhere else in
 * the codebase — a header set in next.config.ts, a session check at the top of
 * a page, a counter in lib/rate-limit.ts. None of them is visible on screen, so
 * none of them would be noticed going missing. That is exactly what makes them
 * worth pinning: a guard nobody can see is a guard nobody misses.
 *
 * These run in the `public` project, signed out, which is the state that
 * matters — the question every one of them asks is what a person who is not
 * supposed to be here can get.
 */

/* ------------------------------------------------------------- the headers */

test.describe("the security headers", () => {
  test("every page carries them", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();

    /*
      Asserted by substring rather than whole-string equality, so adding a
      source to the policy does not break the test that the policy exists.
      The three directives checked are the three doing work: no framing, no
      posting the giving form somewhere else, and nothing loaded off-origin.
    */
    const csp = headers["content-security-policy"];
    expect(csp, "there should be a CSP at all").toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");

    // The stack we are running is nobody else's business.
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("the giving form may still reach Pesapal", async ({ request }) => {
    /*
      The one directive that can break paying rather than merely relaxing a
      defence. `form-action` is checked against the *redirect* a form submission
      follows, and paying is a POST to a server action that answers with a
      redirect to the gateway — so a policy of `form-action 'self'` would let
      the gift through and then refuse the navigation carrying it, silently, on
      the live site only. See the note in next.config.ts.
    */
    const csp = (await request.get("/give")).headers()["content-security-policy"];
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("https://pay.pesapal.com");
  });

  test("the map on /contact is still allowed to load", async ({ request }) => {
    const csp = (await request.get("/contact")).headers()["content-security-policy"];
    expect(csp).toContain("frame-src https://www.openstreetmap.org");
  });

  test("the sermon player may load, and only the -nocookie one", async ({
    request,
  }) => {
    /*
      The other half of the bargain in components/video-frame.tsx: the player is
      only reached once somebody presses play, and when they do it is the host
      that does not write an advertising cookie for them. `www.youtube.com`
      slipping into the policy would be the same video and a different promise.
    */
    const csp = (await request.get("/programs/digital")).headers()[
      "content-security-policy"
    ];
    expect(csp).toContain("https://www.youtube-nocookie.com");
    expect(csp).not.toContain("https://www.youtube.com");
  });

  test("the signed-in areas are never cached or indexed", async ({ request }) => {
    /*
      A partner's giving sitting in an intermediary cache and being handed to
      the next person through it is the failure the whole partner area exists to
      prevent, and the meta tag in each page's metadata is not what a cache
      reads.
    */
    for (const path of ["/app", "/app/needs", "/partners", "/partners/dashboard"]) {
      const headers = (await request.get(path)).headers();

      /*
        Asserted as "not shareable" rather than as the exact string, because the
        two environments word it differently and both are correct: production
        sends the `no-store` from next.config.ts, while `next dev` replaces it
        with its own `no-cache, must-revalidate`. What must never appear is a
        shared-cache directive — an `s-maxage` here is a partner's giving sitting
        on a CDN, and that is the regression worth catching in either.
      */
      const cache = headers["cache-control"] ?? "";
      expect(cache, `${path} must not be cached`).toMatch(/no-store|no-cache/);
      expect(cache, `${path} must never be shared`).not.toMatch(
        /s-maxage|public/,
      );

      expect(headers["x-robots-tag"], `${path} must not be indexed`).toContain(
        "noindex",
      );
    }
  });
});

/* --------------------------------------------------------- what is crawlable */

test.describe("what a crawler is told", () => {
  test("robots.txt keeps the private areas out of the index", async ({
    request,
  }) => {
    const body = await (await request.get("/robots.txt")).text();

    expect(body).toContain("Disallow: /app");
    expect(body).toContain("Disallow: /partners/dashboard");
    expect(body).toContain("Disallow: /partners/preview");
    expect(body).toContain("Sitemap:");
  });

  test("the sitemap lists the public site and nothing behind a session", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);

    const body = await response.text();

    // The pages that ask for money are the ones it matters most to have in.
    expect(body).toContain("/needs");
    expect(body).toContain("/give");
    expect(body).toContain("/projects/kitchen");

    /*
      And nothing that answers a redirect to a stranger. A dashboard address in
      a sitemap is a church's name in a search result.

      Matched against the full address rather than the path, so a need whose
      slug happens to contain one of these words does not fail the test.
    */
    expect(body).not.toContain("jepegomi.org/app");
    expect(body).not.toContain("jepegomi.org/partners");
  });
});

/* ---------------------------------------------------------- the credentials */

test.describe("the sign-in forms", () => {
  test("cannot put a password in the address bar", async ({ page }) => {
    /*
      The CMS form submits through an onSubmit handler that calls
      `preventDefault`, so ordinarily the browser never submits it. A form with
      no method is a GET, though, and a GET that happens *before* this component
      hydrates writes what is in the boxes into the URL — an administrator's
      password, into the history, the access log, and the next Referer out.

      Pinned as an attribute rather than by racing hydration, because the race
      is the thing that is hard to reproduce and easy to regress: somebody
      removing `method="post"` would see no difference at all on a fast machine.
    */
    await page.goto("/app");
    await expect(signInForm(page)).toHaveAttribute("method", "post");
  });

  test("say nothing about which email addresses have accounts", async ({
    page,
  }) => {
    /*
      One message for every way of failing. A form that says "no such account"
      for one address and "wrong password" for another is a form that answers
      the question "does this church give to Jepegomi?" — which is the fact the
      partner area exists to keep private.
    */
    await page.goto("/partners/password");

    const form = signInForm(page);
    await form.getByLabel("Email").fill("definitely-not-a-partner@example.invalid");
    await form.getByLabel("Password").fill("wrong-password-entirely");
    await form.getByRole("button", { name: "Sign in" }).click();

    /*
      Scoped to the form for a second reason besides the streaming buffer: Next's
      development overlay also carries role="alert", so an unscoped lookup
      matches two elements the moment anything else on the page complains — and
      then this test fails for a reason that has nothing to do with what it is
      checking.
    */
    const alert = form.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText(/no such|not found|unknown|no account exists/i);
  });

  test("the code door answers a stranger exactly as it answers a giver", async ({
    page,
  }) => {
    /*
      The front door emails a code to an address that has given, and this is the
      one place the whole scheme could leak the giver list: an answer that reads
      differently for an address on it. So the assertion is on the *shape* of the
      reply to an address that certainly is not — a conditional sentence, and the
      second step offered regardless, exactly as somebody real would see.

      Runs without a database. Issuing the code needs one, and the point here is
      that failing to reach it changes nothing about what is said.
    */
    await freshCaller(page, "shape");
    await page.goto("/partners");

    const form = signInForm(page);
    await form.getByLabel("Email").fill(strangerAddress("shape"));
    await form.getByRole("button", { name: "Email me a code" }).click();

    await expect(form.getByLabel("Your code")).toBeVisible();
    await expect(form).toContainText(/If that address has given/i);
    await expect(form).not.toContainText(
      /no such|not found|unknown|we don't have|do not have/i,
    );
  });

  test("a wrong code is refused without saying which part was wrong", async ({
    page,
  }) => {
    await freshCaller(page, "wrong-code");
    await page.goto("/partners");

    const form = signInForm(page);
    await form.getByLabel("Email").fill(strangerAddress("wrong-code"));
    await form.getByRole("button", { name: "Email me a code" }).click();

    await form.getByLabel("Your code").fill("000000");
    await form.getByRole("button", { name: "Sign in" }).click();

    const alert = form.getByRole("alert");
    await expect(alert).toBeVisible();
    // Not "no code was ever sent to that address", which is the same leak again.
    await expect(alert).not.toContainText(/no such|never sent|not a partner|unknown/i);
    await expect(page).toHaveURL(/\/partners$/);
  });
});

/* --------------------------------------------------------- the project books */

/*
  The switch in /app → Giving → Project accounts can put these on the open web,
  and that is a decision Simon is allowed to make. What is pinned here is where
  it sits when nobody has made it: the default is closed, and a page that starts
  printing the reconciliation because a field was added, renamed, or read wrong
  would look exactly like a page that is fine.
*/
test.describe("a project's line-by-line figures", () => {
  test("are not on the public kitchen page by default", async ({ page }) => {
    await page.goto("/projects/kitchen");

    // The heading the accounts table carries, and the column that only it has.
    await expect(page.getByText(/Where the \$[\d,]+ went/)).toHaveCount(0);
    await expect(
      page.getByRole("columnheader", { name: "Estimated" }),
    ).toHaveCount(0);

    // The willingness is still on the page — that half is the point of it.
    await expect(page.getByText(/accounted for/i).first()).toBeVisible();
  });

  test("are not on the public playground page by default", async ({ page }) => {
    await page.goto("/projects/playground");

    /*
      Shilling prices are the tell. The public page prints two dollar totals and
      nothing itemised; every line of the estimate carries a KSh figure, so one
      appearing means the tables are being drawn.
    */
    await expect(page.getByText(/KSh\s?[\d,]+/).first()).toHaveCount(0);
  });
});

/* ------------------------------------------------------------- the two doors */

test.describe("the partner area, signed out", () => {
  test("the dashboard is shut", async ({ page }) => {
    await page.goto("/partners/dashboard");

    // Back at the door, with nothing of anybody's giving on screen.
    await expect(page).toHaveURL(/\/partners$/);
    await expect(signInForm(page).getByLabel("Email")).toBeVisible();
  });

  test("a preview cannot be reached by guessing an id", async ({ page }) => {
    /*
      /partners/preview/[id] renders one partner's giving and lives in the
      public route group, with no layout above it doing the check on its behalf.
      A well-formed id that belongs to nobody is used deliberately: the answer
      must be the same for an id that exists and one that does not, or the page
      becomes a way to ask which churches give here.
    */
    await page.goto("/partners/preview/00000000-0000-4000-8000-000000000000");

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});

/* ------------------------------------------------------------ brute forcing */

/*
  Skipped without a database, because the counter is a row in one. Everything
  else in this file works against the schema defaults, so the rest of the suite
  still runs on a machine that has never had Postgres on it.
*/
test.describe("guessing at a partner password", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Set DATABASE_URL to exercise the sign-in throttle.",
  );

  test("is refused after a handful of tries", async ({ page }) => {
    /*
      A fresh address each run, so the per-address counter starts empty. Without
      it the test would pass the first time and fail for the next quarter of an
      hour, which is the kind of flake that gets a suite ignored.

      `.invalid` is reserved by RFC 2606 and can never be a real partner — this
      writes a counter row against an address that cannot exist and nothing else.
    */
    const email = `throttle-${Date.now()}@example.invalid`;

    /*
      And a fresh caller too, so what this proves is the *per-address* limit
      rather than whichever of the two ran out first. Twelve attempts a run
      against a shared per-caller bucket of thirty would otherwise have the
      suite locking itself out on its third run in a quarter of an hour.
    */
    await freshCaller(page, "throttle");
    await page.goto("/partners/password");

    let refused = false;

    /*
      The limit is 8 (see RATES in lib/rate-limit.ts). Twelve attempts, and the
      assertion is that the throttle appears somewhere inside them rather than
      on any exact one — pinning the count would make this a test of the number
      instead of a test that the door closes at all.
    */
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const form = signInForm(page);
      await form.getByLabel("Email").fill(email);
      await form.getByLabel("Password").fill(`wrong-password-${attempt}`);
      await form.getByRole("button", { name: "Sign in" }).click();

      /*
        The button reads "Checking…" while the action is in flight, so waiting
        for it to say "Sign in" again is waiting for this attempt's own answer.
        Without it the assertion below can read the *previous* attempt's message,
        which is still on screen, and the loop learns nothing.
      */
      await expect(form.getByRole("button", { name: "Sign in" })).toBeVisible();

      const message = form.getByRole("alert");
      await expect(message).toBeVisible();

      if (/Too many/i.test((await message.textContent()) ?? "")) {
        refused = true;
        break;
      }
    }

    expect(
      refused,
      "repeated wrong passwords should eventually be throttled",
    ).toBe(true);

    // And it stays shut on the next attempt rather than letting one through.
    const form = signInForm(page);
    await form.getByLabel("Password").fill("wrong-again");
    await form.getByRole("button", { name: "Sign in" }).click();
    await expect(form.getByRole("alert")).toContainText(/Too many/i);

    // Whatever else happened, nobody got in.
    await expect(page).toHaveURL(/\/partners\/password$/);
  });
});

/* ------------------------------------------------------- mailing on request */

test.describe("asking for sign-in codes", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Set DATABASE_URL to exercise the code-request throttle.",
  );

  test("is throttled, so the form cannot be turned on a giver's inbox", async ({
    page,
  }) => {
    /*
      Nothing is being guessed here — a code request cannot get anybody in. What
      it can do, unthrottled, is send somebody an email a second from the
      ministry, about their own giving, and burn the ministry's sending
      reputation doing it. Three an hour per address; see RATES.codeRequest.

      A fresh `.invalid` address each run, for the same reason as the throttle
      test above: a per-address counter that survives the run would make this
      pass once and fail for the rest of the hour.
    */
    const email = `codes-${Date.now()}@example.invalid`;

    let refused = false;

    /*
      A fresh page per attempt, rather than clicking "send it again" round a
      loop. Both count the same request, but only this one has an unambiguous
      finish line: from an empty form there are exactly two things that can
      appear next, and waiting for either of them is waiting for *this*
      attempt's answer. Re-submitting the code step leaves the same markup on
      screen whether the answer has come back or not, and a loop that cannot
      tell reads the previous round's result and learns nothing.
    */
    for (let attempt = 1; attempt <= 6 && !refused; attempt += 1) {
      await page.goto("/partners");

      const form = signInForm(page);
      await form.getByLabel("Email").fill(email);
      await form.getByRole("button", { name: "Email me a code" }).click();

      const alert = form.getByRole("alert");
      await expect(form.getByLabel("Your code").or(alert).first()).toBeVisible();

      refused = await alert.isVisible();
    }

    expect(
      refused,
      "repeated code requests for one address should eventually be refused",
    ).toBe(true);
  });
});

/* ------------------------------------------------- writing into the ledger */

/**
 * A gift the site refuses must leave nothing behind.
 *
 * This is the one file that reads the database, and it does so only to count
 * rows — the whole assertion is that a refused submission changed nothing. It
 * earns the dependency by being a regression test for a bug that was live: the
 * payment path created the partner row *before* it looked the item up, so a
 * claim for more than an item still needed was refused on screen and recorded
 * in the Partners queue anyway, from a form nobody has to sign in to use. The
 * promise path had always done it the other way round, which is exactly why
 * nobody noticed.
 */
test.describe("a refused gift", () => {
  test.skip(!process.env.DATABASE_URL, "Needs DATABASE_URL to count rows.");

  test("leaves nothing in the ledger", async ({ page }) => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const count = async (table: string) =>
      Number((await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n);

    try {
      const partnersBefore = await count("partners");
      const pledgesBefore = await count("pledges");

      await freshCaller(page, "refused-gift");
      await page.goto("/give");

      // The browser's own checks are turned off so the submission reaches the
      // server, which is the only validation a hand-written POST would meet.
      await page.evaluate(() =>
        document.querySelectorAll("form").forEach((f) => f.setAttribute("novalidate", "")),
      );

      /*
        A costed item, specifically — not a whole project and not "something
        else". This test is about the balance on an item being enforced by the
        server, and those other two have no balance to exceed: a gift towards
        the playground, or towards words a giver typed, is refused by nothing
        because there is nothing there to run out.
      */
      await page
        .locator(
          'form input[name="towards"]:not([value^="project:"]):not([value="other"])',
        )
        .first()
        .check();
      await page.locator('form input[name="amount"]').first().fill("999999999");
      await page.locator('form input[name="name"]').first().fill("Refused Probe");
      await page
        .locator('form input[name="email"]')
        .first()
        .fill(strangerAddress("refused"));

      /*
        The pay button by preference — it is the path that had the bug. Falling
        back to the promise button keeps this meaningful on a deployment with no
        payment gateway configured, where that button is not rendered at all.
      */
      const pay = page.getByRole("button", { name: /pay|card|m-pesa|give now/i }).first();
      const button = (await pay.count())
        ? pay
        : page.getByRole("button", { name: /record|send it/i }).first();
      await button.click();

      await expect(page.getByRole("alert").first()).toContainText(/still open|only/i);

      expect(await count("partners"), "no partner row for a refused gift").toBe(
        partnersBefore,
      );
      expect(await count("pledges"), "no pledge for a refused gift").toBe(
        pledgesBefore,
      );
    } finally {
      await pool.end();
    }
  });
});
