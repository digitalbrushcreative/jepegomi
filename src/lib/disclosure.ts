import type { Partner, PartnerProject } from "@/lib/giving";
import type { AccountVisibility } from "@/lib/project-accounts";

/**
 * How far into the books one partner can see.
 *
 * The kitchen page used to carry Pastor Simon's reconciliation letter in full,
 * on the open web: cement estimated $900 and cost $1,550, drainage $900 and cost
 * $1,450, and so on down to the line that came in under because Simon did the
 * building himself. That is a remarkable document and the ministry is right to
 * be willing to show it. It is also, on a public page, simply the ministry's
 * books — a stranger reading it learns what this ministry can be bought for,
 * what it over-runs on, and what a gift to it is worth, and none of that was
 * ever the point of the page. The point of the page is a kitchen.
 *
 * So the accounts moved behind the door that already existed. What is public is
 * the *ask* — what is still short, and what finishing it would cost — because a
 * giver has to be able to see what they are being asked for before they give.
 * What is private is the *account* — what a gift that has already been given was
 * spent on, line by line. That belongs to the people who gave it.
 *
 * "The people who gave it" is not one group, which is the whole reason this file
 * exists rather than a boolean on the session:
 *
 *   own          They can see their own giving and nothing else. Somebody who
 *                sent $10 towards the ministry is owed an honest record of their
 *                own $10, not a builder's merchant reconciliation for a building
 *                they have no stake in.
 *
 *   project      Money of theirs reached a project, so the figures around *that*
 *                project open up — what it bought, what each thing was estimated
 *                at, what it actually came to. They paid towards that budget;
 *                they may read it.
 *
 *   everything   They organised to give — a church, a company — or they gave at
 *                a scale that is an organised decision whoever made it. These
 *                are the partners the reconciliation letter was written for in
 *                the first place, and they see all of it.
 *
 * The rungs are cumulative and each one is earned by something the giver
 * actually did, never by asking.
 *
 * ## Earned by what, exactly
 *
 * Money that *arrived*, and nothing else. Every figure this file reads is a
 * `received` total — a status only Simon can set, in /app, once he has seen the
 * money — and never a `claimed` one.
 *
 * That distinction used to be invisible and is now the load-bearing part. While
 * the only way into the partner area was a password Simon typed out by hand, it
 * did not matter what these rules keyed on: he was the gate. Since the door
 * opens to anybody who can read the email of an address in the ledger (see
 * lib/partner-codes.ts), every input here has to be something a stranger cannot
 * assert about themselves — and a claim *is* self-asserted. Anyone can put their
 * name against a $1,500 item on the public form without sending a penny, and if
 * that counted, the ministry's own reconciliation would be four clicks from the
 * open web. Received money cannot be typed into a form.
 *
 * The same goes for `kind`. It is a dropdown on /give, so "Church" is a claim
 * about oneself until Simon has ticked `verified` beside it, and only the ticked
 * version opens anything.
 */

/**
 * The gift above which a person is treated as an organised giver.
 *
 * One number, and the only one worth arguing about. It sits well above what
 * somebody gives on a Sunday impulse and well below the $8,000 that built the
 * kitchen — the sum you do not send without having decided something first, and
 * having decided it, you are owed the books.
 *
 * In cents, like every other figure that comes off the ledger.
 */
export const ORGANISED_GIVING_CENTS = 100_000;

/**
 * The kinds of partner who are an organisation rather than a person.
 *
 * Read off `PARTNER_KINDS`, and deliberately a list of what *is* organised
 * rather than a check for `kind !== "person"`. A kind added later is a kind
 * nobody has thought about yet, and the safe answer for a stranger is the
 * narrow one.
 */
const ORGANISED_KINDS: ReadonlySet<string> = new Set(["church", "organisation"]);

export type DisclosureTier = "own" | "project" | "everything";

export type Disclosure = {
  tier: DisclosureTier;
  /**
   * Area ids this partner's money actually reached.
   *
   * Populated at every tier, including `everything`. It used to be left empty
   * there on the grounds that a partner who may read all of it does not need a
   * list of the ones they paid for — true of permission, and the reason the
   * kitchen's church was shown the playground's costings. Permission is not the
   * only question a page asks; see `stakeIn`.
   */
  projects: ReadonlySet<string>;
};

/**
 * What this partner may read, worked out from what they have given.
 *
 * Takes the projects the dashboard has already grouped rather than going back to
 * the database for them. Two queries answering the same question is two chances
 * for the page to show a set of accounts the rule would have refused.
 */
export function disclosureFor({
  partner,
  projects,
  receivedCents,
}: {
  partner: Partner;
  projects: PartnerProject[];
  /**
   * Everything of theirs that has actually arrived and been marked received.
   * Not what they have claimed — see the note above on why that difference is
   * the whole security of this file.
   */
  receivedCents: number;
}): Disclosure {
  /*
    Money that reached this project, however it was addressed.

    This used to require an *itemised* gift — a costed line taken off the list
    and paid for — and treat "for the kitchen, wherever it helps" as buying no
    place in the kitchen's budget. The argument was that the two are different
    acts, which they are. It was the wrong rule anyway, for two reasons that only
    became visible once every project kept accounts rather than just the kitchen.

    The first is that the kitchen page tells the public, in as many words, that
    "partners who gave towards this work read it in full when they sign in".
    Somebody who gave $300 towards the kitchen read that, signed in, and was
    shown nothing — the site made a promise the rule then broke.

    The second is that the distinction protected a document that no longer exists
    in that form. What the narrow rule guarded was one donor's private
    reconciliation letter, published to everybody as soon as anybody could read
    it. What it guards now is a project's own record of what it bought, and "I
    paid towards this project, so I may see what this project bought" is the rule
    a person would guess. Guessing right is most of what makes a thing feel
    honest.

    Still received money only, and still per project. The threshold above is the
    separate, larger permission — to read the books of projects you did *not* pay
    towards — and it is untouched.
  */
  const paidTowards = new Set(
    projects
      .filter((project) => project.yoursReceivedCents > 0)
      .map((project) => project.area.id),
  );

  /*
    Worked out before the tier, and carried into every one of them. The list is
    a record of what this partner's money did, which is true of a verified
    church exactly as it is true of anybody else — the tier decides what they
    may *read*, and has no business editing the history.
  */
  if (
    (ORGANISED_KINDS.has(partner.kind) && partner.verified) ||
    receivedCents >= ORGANISED_GIVING_CENTS
  ) {
    return { tier: "everything", projects: paidTowards };
  }

  return {
    tier: paidTowards.size > 0 ? "project" : "own",
    projects: paidTowards,
  };
}

/** Whether this partner has *earned* a reading of one project's accounts. */
export function opensAccounts(disclosure: Disclosure, areaId: string) {
  return disclosure.tier === "everything" || disclosure.projects.has(areaId);
}

/**
 * Whether this partner's own money reached one project.
 *
 * The other half of `opensAccounts`, and the two are asked for different
 * reasons. That one is permission: may this person be shown these figures at
 * all. This one is relevance: is this project theirs — did they pay for any of
 * it.
 *
 * They came apart the first time a verified church signed in. Encounter Church
 * built the kitchen and nothing else, and the dashboard drew them the
 * playground's costings: a page of steel frames nobody has bought, filed under
 * a project they have never given a penny towards. Nothing was leaked — a
 * church at the `everything` tier is entitled to read those figures — but being
 * entitled to read a thing is not a reason to be handed it. The dashboard is an
 * account of the work you have partnered with us for, and a project you have no
 * stake in is not that, however open its books are to you.
 *
 * So the dashboard draws by stake and the tier goes on governing permission.
 * Somewhere to go on giving is a different question, and the page already
 * answers it further down, where everything still short is offered under its own
 * heading with a link to /needs.
 */
export function stakeIn(disclosure: Disclosure, areaId: string) {
  return disclosure.projects.has(areaId);
}

/**
 * Whether a set of accounts is shown to the person in front of us.
 *
 * Two questions, answered in the right order. The switch in the CMS asks *who
 * these papers are for* — anybody, the people who paid for them, or nobody
 * while the figures are being corrected. Only in the middle case does the rule
 * above get asked at all, and that is the one Simon should almost always leave
 * it on. See lib/project-accounts.ts for the switch, and the head of this file
 * for the rule.
 *
 * `disclosure` is null on a public page, where nobody has signed in. That is why
 * the check is written as one function used by both: the kitchen page and the
 * partner dashboard have to agree about what "anybody" means, and the way to
 * guarantee two callers agree is to give them one function rather than two
 * conditions that look alike today.
 */
export function showsAccounts({
  visibility,
  disclosure,
  areaId,
}: {
  visibility: AccountVisibility;
  /** Null when nobody is signed in. */
  disclosure: Disclosure | null;
  areaId: string;
}) {
  if (visibility === "nobody") return false;
  if (visibility === "everyone") return true;
  return disclosure !== null && opensAccounts(disclosure, areaId);
}
