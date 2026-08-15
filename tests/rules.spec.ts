import { expect, test } from "@playwright/test";
import { ORGANISED_GIVING_CENTS, disclosureFor, opensAccounts } from "@/lib/disclosure";
import type { Partner, PartnerProject } from "@/lib/giving";
import { sniffImage } from "@/lib/image-upload";
import { recipientsFor } from "@/lib/letters";
import { named, oneLine } from "@/lib/mail/send";
import { safeUrl } from "@/lib/mail/template";
import { parseUsd } from "@/lib/money";
import { site } from "@/lib/site";

/**
 * The rules, tested without a browser.
 *
 * Everything here is a pure function, which is exactly why it is worth pinning
 * this way rather than through a page: these are the decisions that cannot be
 * seen on screen when they go wrong. A disclosure rule that opens one rung too
 * far shows a page that looks completely normal — it is simply somebody else's
 * accounts. A signature check that accepts a renamed file shows a photo.
 *
 * No browser and no database, so this project runs in a second and runs
 * anywhere, including on a machine that has never had Postgres on it.
 */

/* --------------------------------------------------------- who may see what */

const giver = (over: Partial<Partner> = {}): Partner => ({
  id: "p1",
  name: "Someone",
  kind: "person",
  location: "",
  email: "someone@example.invalid",
  contactName: "",
  verified: false,
  hasLogin: false,
  note: "",
  createdAt: new Date(0).toISOString(),
  ...over,
});

/** A project they gave to, with `received` the part that actually arrived. */
const project = (areaId: string, received: number): PartnerProject =>
  ({
    area: { id: areaId, label: areaId, blurb: "" },
    needs: [{ yoursReceivedCents: received }],
    gift: null,
    yoursCents: received,
    yoursReceivedCents: received,
  }) as unknown as PartnerProject;

/**
 * The same, given to the project as a whole — "for the kitchen, wherever it
 * helps" — rather than against a costed line. No needs at all, which is the
 * shape `groupByProject` produces for an undesignated gift.
 */
const areaGift = (areaId: string, received: number): PartnerProject =>
  ({
    area: { id: areaId, label: areaId, blurb: "" },
    needs: [],
    gift: { yoursReceivedCents: received },
    yoursCents: received,
    yoursReceivedCents: received,
  }) as unknown as PartnerProject;

test.describe("how far a giver can see", () => {
  test("somebody who has given nothing sees only their own", () => {
    const seen = disclosureFor({
      partner: giver(),
      projects: [],
      receivedCents: 0,
    });

    expect(seen.tier).toBe("own");
    expect(opensAccounts(seen, "kitchen")).toBe(false);
  });

  test("a claim nobody has paid opens nothing", () => {
    /*
      The load-bearing case, and the one the code door created. Anybody can put
      their name against a $1,500 item on the public form without sending a
      penny — so if a *claim* counted, the ministry's reconciliation would be a
      form submission and an emailed code away from the open web.
    */
    const seen = disclosureFor({
      partner: giver(),
      projects: [project("kitchen", 0)],
      receivedCents: 0,
    });

    expect(seen.tier).toBe("own");
    expect(opensAccounts(seen, "kitchen")).toBe(false);
  });

  test("money that arrived against an item opens that project, and only that one", () => {
    const seen = disclosureFor({
      partner: giver(),
      projects: [project("kitchen", 5_000), project("playground", 0)],
      receivedCents: 5_000,
    });

    expect(seen.tier).toBe("project");
    expect(opensAccounts(seen, "kitchen")).toBe(true);
    expect(opensAccounts(seen, "playground")).toBe(false);
  });

  test("a gift to the project as a whole opens that project too", () => {
    /*
      The kitchen page tells the public, in as many words, that "partners who
      gave towards this work read it in full when they sign in". This used to
      require an *itemised* gift, so somebody who gave $300 towards the kitchen
      generally signed in and was shown nothing — the site making a promise the
      rule then broke. Undesignated giving that arrived opens the project it
      arrived for.
    */
    const seen = disclosureFor({
      partner: giver(),
      projects: [areaGift("kitchen", 30_000)],
      receivedCents: 30_000,
    });

    expect(seen.tier).toBe("project");
    expect(opensAccounts(seen, "kitchen")).toBe(true);
    // And still only that one — this widened which gifts count, not which books.
    expect(opensAccounts(seen, "playground")).toBe(false);
  });

  test("an unpaid gift to a project as a whole still opens nothing", () => {
    const seen = disclosureFor({
      partner: giver(),
      projects: [areaGift("kitchen", 0)],
      receivedCents: 0,
    });

    expect(seen.tier).toBe("own");
    expect(opensAccounts(seen, "kitchen")).toBe(false);
  });

  test("an unverified church is still only a claim about itself", () => {
    /*
      `kind` is a dropdown on /give. Until Simon has ticked the box beside it,
      "Church" is something a stranger typed about themselves — so it must not
      be what opens the books.
    */
    const seen = disclosureFor({
      partner: giver({ kind: "church", verified: false }),
      projects: [],
      receivedCents: 0,
    });

    expect(seen.tier).toBe("own");
  });

  test("a verified church sees everything", () => {
    const seen = disclosureFor({
      partner: giver({ kind: "church", verified: true }),
      projects: [],
      receivedCents: 0,
    });

    expect(seen.tier).toBe("everything");
    expect(opensAccounts(seen, "anything-at-all")).toBe(true);
  });

  test("the organised-giving threshold is a boundary, not a range", () => {
    const at = disclosureFor({
      partner: giver(),
      projects: [],
      receivedCents: ORGANISED_GIVING_CENTS,
    });
    const justUnder = disclosureFor({
      partner: giver(),
      projects: [],
      receivedCents: ORGANISED_GIVING_CENTS - 1,
    });

    expect(at.tier).toBe("everything");
    expect(justUnder.tier).not.toBe("everything");
  });
});

/* ------------------------------------------------------ what a file really is */

test.describe("what an uploaded file really is", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = Buffer.concat([
    Buffer.from([0x89]),
    Buffer.from("PNG\r\n\x1a\n", "latin1"),
    Buffer.alloc(4),
  ]);

  test("recognises the four the site serves", () => {
    expect(sniffImage(jpeg)).toBe("image/jpeg");
    expect(sniffImage(png)).toBe("image/png");
    expect(
      sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1")),
    ).toBe("image/webp");
    expect(
      sniffImage(Buffer.from("\0\0\0\x18ftypavif\0\0\0\0", "latin1")),
    ).toBe("image/avif");
  });

  test("refuses everything else, whatever it is called", () => {
    /*
      The extension a photo is written under comes from this answer, and the
      extension decides the Content-Type it is later served with from the site's
      own origin. A file that says "image/jpeg" and holds markup is the whole
      reason this function exists.
    */
    for (const [what, bytes] of [
      ["html", "<html><script>alert(1)</script>"],
      ["svg", "<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>"],
      ["gif", "GIF89a..............."],
      ["mp4", "\0\0\0\x18ftypisom\0\0\0\0"],
      ["pdf", "%PDF-1.7\n........"],
    ] as const) {
      expect(sniffImage(Buffer.from(bytes, "latin1")), what).toBeNull();
    }

    expect(sniffImage(Buffer.alloc(0)), "empty").toBeNull();
    expect(sniffImage(Buffer.from([0xff, 0xd8])), "truncated jpeg").toBeNull();
  });
});

/* -------------------------------------------------------- mail header safety */

test.describe("names on their way into an email header", () => {
  test("a comma cannot become a second recipient", () => {
    expect(named("Smith, John", "a@b.org")).not.toContain(",");
  });

  test("a newline cannot start a header of its own", () => {
    const forged = named("Ruth\r\nBcc: everyone@example.com", "a@b.org");
    expect(forged).not.toMatch(/[\r\n]/);
    expect(forged).not.toContain("Bcc:");
  });

  test("angle brackets cannot rewrite the address", () => {
    const forged = named("Ruth <attacker@example.com>", "real@jepegomi.org");
    expect(forged).toContain("<real@jepegomi.org>");
    expect(forged).not.toContain("attacker@example.com");
  });

  test("a name that is nothing but punctuation falls back to the address", () => {
    expect(named("<<>>", "a@b.org")).toBe("a@b.org");
  });

  test("a subject line stays one line", () => {
    const subject = oneLine("Gift\r\nBcc: someone@example.com");
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

/* ------------------------------------------------ a letter written in /app */

test.describe("addresses pasted into the email screen", () => {
  /*
    The list is typed by a person into a box, which means it arrives with
    whatever they had in the clipboard: a column out of a spreadsheet, a row out
    of a mail client, a stray blank line. All of it has to come out as addresses
    or come out as nothing — an unparsed line silently dropped is a partner who
    is never written to and nobody notices.
  */
  test("takes the shapes people actually paste", async () => {
    const list = await recipientsFor(
      "custom",
      "ruth@example.invalid\nPastor Njoroge <njoroge@example.invalid>, office@example.invalid;\n\n",
    );

    expect(list).toEqual([
      { name: "", email: "ruth@example.invalid" },
      { name: "Pastor Njoroge", email: "njoroge@example.invalid" },
      { name: "", email: "office@example.invalid" },
    ]);
  });

  test("nobody is written to twice", async () => {
    const list = await recipientsFor(
      "custom",
      "ruth@example.invalid\nRuth <RUTH@example.invalid>",
    );

    expect(list).toHaveLength(1);
  });

  test("anything that is not an address is left out", async () => {
    const list = await recipientsFor(
      "custom",
      "Name Surname\nruth@example.invalid\nnot an address\n@\n",
    );

    expect(list).toEqual([{ name: "", email: "ruth@example.invalid" }]);
  });
});

test.describe("links in an email", () => {
  /*
    Every link the template draws now includes one somebody typed into /app, and
    escaping leaves `javascript:` and `data:` completely intact. Nothing
    legitimate here is anything but http, https or mailto.
  */
  test("keeps the ones that are really links", () => {
    for (const href of [
      "https://www.jepegomi.org/needs",
      "http://example.invalid",
      "mailto:support@jepegomi.org",
    ]) {
      expect(safeUrl(href), href).toBe(href);
    }
  });

  test("sends everything else to the front page instead", () => {
    for (const href of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "  javascript:alert(1)",
      "",
    ]) {
      expect(safeUrl(href), href).toBe(site.url);
    }
  });
});

/* ------------------------------------------------------------------- money */

test.describe("reading an amount somebody typed", () => {
  test("takes the shapes people actually write", () => {
    expect(parseUsd("400")).toBe(40_000);
    expect(parseUsd("$400")).toBe(40_000);
    expect(parseUsd("1,000.50")).toBe(100_050);
    expect(parseUsd(" 12.5 ")).toBe(1250);
  });

  test("refuses anything that is not a positive amount of money", () => {
    /*
      Every one of these used to be a way to put a NaN, a negative, or an
      absurdity into the ledger — and a total that includes a NaN is a page
      where every figure reads "$NaN", including the ones that were fine.
    */
    for (const bad of ["", "0", "-5", "abc", "1e6", "4.005", "Infinity", "1/2", "٤٠٠"]) {
      expect(parseUsd(bad), bad).toBeNull();
    }
  });
});
