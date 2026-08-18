import type { IconName } from "@/components/icons";

/**
 * The vocabulary of the giving ledger — its shapes, its labels, its lists.
 *
 * Deliberately separate from lib/needs.ts and lib/partners.ts, which do the
 * talking to Postgres. A form is a client component, and a client component
 * that reaches for one constant out of a module also drags in everything that
 * module imports: the whole `pg` driver, `node:crypto`, and the connection
 * pool, none of which can exist in a browser. Keeping the words apart from the
 * queries is what lets both sides of the app agree on what a pledge status is
 * called without either of them shipping the other's dependencies.
 *
 * Nothing in this file may import anything but types.
 */

/*
  Which arm of the ministry a need belongs to. The icon follows from the area
  rather than being a field Simon fills in, for the same reason the front page
  picks its own icons: he writes what is needed and what it costs, and the site
  decides what it looks like.

  `project` is the second name some of these have, and it exists because two of
  them are two things at once. School Transport is a programme — a van, a
  driver, a run that happens twice a day whether or not anybody gives. The Bus
  Upgrade is a project: one purchase, with a price, that is either bought or is
  not. The same is true of Jepegomi Digital, which streams services every week,
  and the Service Livestream kit, which is a camera and a laptop somebody has
  to buy.

  Running them together made both harder to read. "Give to School transport"
  sounds like a subscription to a bus route; the page it lands on is asking for
  a bus. So a project that is a raise inside a wider programme names the raise,
  and the programme keeps its own name on its own page. Areas with nothing to
  raise for — the church, the college — have no `project` and never needed one.
*/
export const NEED_AREAS = [
  { id: "kitchen", label: "The kitchen build", icon: "trowel", href: "/projects/kitchen" },
  { id: "playground", label: "The playground", icon: "child", href: "/projects/playground" },
  {
    id: "transport",
    label: "School transport",
    project: "Bus Upgrade",
    icon: "bus",
    href: "/programs/transport",
  },
  {
    id: "digital",
    label: "Jepegomi Digital",
    project: "Service Livestream",
    icon: "globe",
    href: "/programs/digital",
  },
  { id: "food", label: "Food at School", icon: "pot", href: "/programs/food-at-school" },
  { id: "academy", label: "Jepegomi Academy", icon: "book", href: "/academy" },
  { id: "church", label: "The church", icon: "church", href: "/church" },
  { id: "college", label: "Bible College", icon: "book", href: "/college" },
  { id: "other", label: "Across the ministry", icon: "give", href: "/about" },
] as const satisfies {
  id: string;
  label: string;
  /** The raise inside this programme, where it is one. See the note above. */
  project?: string;
  icon: IconName;
  href: string;
}[];

export type NeedArea = (typeof NEED_AREAS)[number]["id"];
export type Area = (typeof NEED_AREAS)[number];

/**
 * What to call this area where a gift is being asked for.
 *
 * The project name where there is one, the area's own label where there is not.
 * Every giving surface goes through this — /needs, the form's picker, a
 * partner's dashboard — so that the thing somebody chooses on one page is the
 * thing that is named back to them on the next. The bare `label` is for the
 * programme itself, and belongs on the programme's page.
 */
export function projectName(area: Area): string {
  return "project" in area ? area.project : area.label;
}

/** Falls back to "across the ministry" rather than throwing on an unknown area. */
export function areaOf(id: string) {
  return NEED_AREAS.find((area) => area.id === id) ?? NEED_AREAS[NEED_AREAS.length - 1];
}

/**
 * The project a link on this site points at, where it points at one.
 *
 * Used by the front page, whose appeal panels are written in the CMS: an editor
 * types a link to /programs/transport and the Give button beside it can then
 * carry the bus with it, without anybody having to know that a giving form has
 * a query string. Anything that is not a project's own page comes back null and
 * the button goes to the form unaddressed, which is what it always did.
 */
export function areaForHref(href: string): Area | null {
  return NEED_AREAS.find((area) => area.href === href) ?? null;
}

/*
  A gift towards a whole project rather than towards a costed line inside one.

  The picker submits one field, `towards`, and it has always held either a
  need's slug or the word "other". A project is the third answer and it is
  prefixed rather than bare, so a need whose slug happened to be "playground"
  can never be mistaken for one — the same reasoning that has "other" checked
  before the slug lookup in giveAction.
*/
const PROJECT_PREFIX = "project:";

export function isNeedArea(value: string): value is NeedArea {
  return NEED_AREAS.some((area) => area.id === value);
}

export function projectValue(id: NeedArea) {
  return `${PROJECT_PREFIX}${id}`;
}

/** The project a submitted `towards` names, or null if it names none. */
export function areaForValue(value: string): Area | null {
  if (!value.startsWith(PROJECT_PREFIX)) return null;
  const id = value.slice(PROJECT_PREFIX.length);
  return NEED_AREAS.find((area) => area.id === id) ?? null;
}

/**
 * Which arm of the ministry a gift given in the giver's own words was for — or
 * null, which is the ordinary answer.
 *
 * The designation box on /give is free text and stays free text: somebody who
 * writes "school fees for one child" has said something a dropdown could not
 * have held, and the ledger records it in their words. But most people click one
 * of the suggestion buttons above it, and those buttons *are* the arms of the
 * ministry — so a gift labelled exactly "The kitchen build" can be filed against
 * the kitchen without anybody being asked a second question.
 *
 * Matching is on the whole string, not a substring. "Not the kitchen build"
 * contains the label and means the opposite of it, and a ledger that guesses is
 * worse than one that leaves the field null and lets Simon set it in /app.
 *
 * Both names count, where an area has two. The buttons on /give offer the
 * project — "Bus Upgrade" — so that is what most of these arrive as, but
 * "School transport" is what somebody writing in their own words is likely to
 * put, and it is the same money either way. Filing one and not the other would
 * make the ledger depend on which page a giver happened to start from.
 */
export function areaForDesignation(designation: string): NeedArea | null {
  const written = designation.trim().toLowerCase();
  if (!written) return null;

  const match = NEED_AREAS.find(
    (area) =>
      area.label.toLowerCase() === written ||
      projectName(area).toLowerCase() === written,
  );
  return match ? match.id : null;
}

/**
 * The icons an item may be given, beyond the one its project already carries.
 *
 * A short list on purpose. This is not "every icon in the set" — it is the
 * handful that mean something on a costed item: a water tank, a floor, a light,
 * a meal. Somebody choosing from four sensible pictures picks a good one;
 * somebody choosing from thirty picks whichever is nearest the top.
 */
export const NEED_ICONS = [
  "water",
  "paving",
  "light",
  "pot",
  "book",
  "child",
  "trowel",
  "bus",
  "church",
] as const satisfies readonly IconName[];

export const PARTNER_KINDS = [
  { id: "church", label: "Church" },
  { id: "person", label: "Person" },
  { id: "organisation", label: "Organisation" },
] as const;

export function isPartnerKind(value: string) {
  return PARTNER_KINDS.some((kind) => kind.id === value);
}

export type Need = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  detail: string;
  area: string;
  /**
   * The part of the project this item belongs to, or null for one that belongs
   * to the project as a whole. What a part is, and why an item's place in the
   * running order matters, is in lib/projects.ts.
   */
  partId: string | null;
  costCents: number;
  /**
   * What it was expected to cost, when that is a different figure from what it
   * did. Null on nearly every row — see the column note in lib/db.ts. An item
   * with no separate estimate reads back as `costCents` in the accounts.
   */
  estimatedCents: number | null;
  /**
   * One line on why the two differ: "price rose, and the job grew". Appears in
   * a project's accounts beside the item, and nowhere on the public pages.
   */
  note: string;
  /**
   * An `IconName`, or empty for "use the project's own icon". Stored as free
   * text and read through `areaOf` when blank — an unknown name renders as the
   * project's icon rather than as a hole in the page.
   */
  icon: string;
  published: boolean;
  closed: boolean;
  position: number;
  createdAt: string;
};

/**
 * What a need has raised and what is left of it.
 *
 * `promisedCents` deliberately includes claims Simon has not approved yet. The
 * alternative — counting a claim only once he has seen it — means two churches
 * can both be told $450 is open on a Sunday afternoon and both write a cheque
 * for it. Holding the balance from the moment somebody claims it is the honest
 * answer to the question the page is actually being asked, which is "is this
 * still there for me?". A claim that turns out to be nonsense is withdrawn in
 * /app and the balance comes straight back.
 */
export type Ledger = {
  costCents: number;
  /** Money that has actually arrived. */
  receivedCents: number;
  /** Claimed, but not yet arrived. */
  promisedCents: number;
  /** Claimed by nobody. This is the figure a new giver acts on. */
  openCents: number;
  percentReceived: number;
  percentClaimed: number;
  fullyClaimed: boolean;
};

export type NeedWithLedger = Need & { ledger: Ledger };

/* ----------------------------------------- one project's books, reconciled */

/**
 * A project's accounts, as Pastor Simon's letter sets them out: what was spent,
 * what was never reached, and the two totals underneath.
 *
 * Built from the needs of one area and nothing else. `closed` is what separates
 * the two lists, because that is already what it means — a closed item is work
 * that is finished, an open one is work still being asked for — so the
 * reconciliation needs no state of its own and cannot fall out of step with the
 * ledger the rest of the site reads.
 */
export type BudgetLine = {
  id: string;
  item: string;
  estimatedCents: number;
  /** What it came to. Null for a line that was never reached, or never priced. */
  actualCents: number | null;
  note: string;
};

export type ProjectBudget = {
  /** Finished work, in the order it is listed in /app. */
  spent: BudgetLine[];
  /** Never reached — the money ran out, or the work has not started. */
  outstanding: BudgetLine[];
  /** What the finished lines actually came to. */
  spentCents: number;
  /**
   * What finishing the rest would cost. The one figure here a stranger may read:
   * a page that invites you to finish a building without saying what finishing
   * it costs is asking for a blank cheque.
   */
  stillNeededCents: number;
  /** What the finished lines were originally estimated at. */
  estimatedCents: number;
};

export type NeedUpdate = {
  id: string;
  needId: string;
  body: string;
  photo: string;
  photoAlt: string;
  createdAt: string;
  authorName: string | null;
};

export type PledgeStatus = "pending" | "promised" | "received" | "declined";

/*
  Written from the giver's side of the table, because these labels appear on a
  partner's own dashboard as well as in /app. "Declined" is a thing done to
  somebody; "withdrawn" is a claim that came off the ledger, which is all a
  church needs to know and all that is ever actually true — Simon takes one off
  because the gift was redirected or never came, not as a judgement.
*/
export const PLEDGE_LABELS: Record<PledgeStatus, string> = {
  pending: "Awaiting confirmation",
  promised: "Promised",
  received: "Received",
  declined: "Withdrawn",
};

/*
  The one-click answers to "what would you like it to go towards?" on the give
  form, for a giver who is not picking a costed item off the list. They fill the
  same free-text box rather than replacing it — the box is the field that is
  actually submitted, so a suggestion can be edited into something else and
  somebody with a different idea is never boxed out.

  "Wherever it does the most" leads because it is the honest default and the one
  most people mean. It used to read "Wherever the need is greatest", which is the
  language of an appeal rather than of a partnership — and it went onto the
  ledger in the giver's own name, so it was Simon reading back a sentence about
  how badly he needed it. The rest are the arms of the ministry, in the order
  they are listed everywhere else.

  None of these may match an area label, or `areaForDesignation` would file a
  gift meant for the whole ministry under one arm of it.
*/
export const GIVING_SUGGESTIONS = [
  "Wherever it does the most",
  ...NEED_AREAS.filter((area) => area.id !== "other").map(projectName),
];

export type Pledge = {
  id: string;
  /**
   * Null when the gift is not against a listed item — a giver who came to /give
   * and wrote what they wanted to support. `designation` holds their words.
   */
  needId: string | null;
  needSlug: string | null;
  needTitle: string | null;
  /** Whether that item has a public page. False for a draft or a closed-off record. */
  needPublished: boolean;
  /** The giver's own words. Empty whenever `needId` is set. */
  designation: string;
  /**
   * The arm of the ministry a designated gift was for, where it could be told —
   * see `areaForDesignation`. Null on most of them, and always null when
   * `needId` is set, because then the need carries the area itself.
   */
  area: NeedArea | null;
  partnerId: string | null;
  partnerName: string | null;
  partnerEmail: string | null;
  amountCents: number;
  status: PledgeStatus;
  message: string;
  createdAt: string;
  receivedAt: string | null;
};

/**
 * What a pledge is towards, in one line — the item's title if it has one, and
 * otherwise what the giver wrote. Every screen that lists pledges goes through
 * here so none of them has to remember that the title can be null.
 */
export function pledgeTowards(
  pledge: Pick<Pledge, "needTitle" | "designation">,
): string {
  return pledge.needTitle ?? (pledge.designation || "the ministry");
}

export type Partner = {
  id: string;
  name: string;
  kind: string;
  location: string;
  email: string;
  contactName: string;
  verified: boolean;
  hasLogin: boolean;
  note: string;
  createdAt: string;
};

export type PartnerWithTotals = Partner & {
  claimedCents: number;
  receivedCents: number;
  pledgeCount: number;
};

/**
 * Somebody Simon has said may read a partner's giving alongside them.
 *
 * A church's account is one email address, and for a church that is often the
 * wrong number: the gift went out under the office address, and the treasurer,
 * the missions pastor and whoever writes the newsletter all have a reason to
 * look at what it built. There is no way to work out from a gift who those
 * people are, so nothing tries to — every row here is one Simon typed in.
 */
export type PartnerReader = {
  id: string;
  partnerId: string;
  email: string;
  /** What to call them. Blank is allowed; the address is the identity. */
  name: string;
  /** Simon's own note. Never shown to them. */
  note: string;
  createdAt: string;
};

/* ------------------------------------------ what one partner's giving built */

/** One listed item, with this partner's own share of it alongside the totals. */
export type PartnerNeed = NeedWithLedger & {
  yoursCents: number;
  yoursReceivedCents: number;
};

/** Designated giving that never had a listed item behind it, summed per area. */
export type PartnerAreaGift = {
  area: NeedArea;
  yoursCents: number;
  yoursReceivedCents: number;
  giftCount: number;
};

/**
 * A partner's giving, gathered under the thing it paid for.
 *
 * A church does not think of its giving as eleven rows in a ledger. It thinks
 * "we built the kitchen" — and the kitchen, in the ledger, is six budget lines
 * and possibly an undesignated gift on top of them. The area is what ties those
 * together, and it is already on every need and now on every designated gift, so
 * the grouping needs no new column and no second source of truth.
 *
 * `href` on the area is the project page. That link is the point of the whole
 * exercise: a church that paid for cement and sand and roofing gets shown the
 * kitchen, not a list of materials.
 */
export type PartnerProject = {
  area: Area;
  needs: PartnerNeed[];
  gift: PartnerAreaGift | null;
  yoursCents: number;
  yoursReceivedCents: number;
};

export function groupByProject(
  needs: PartnerNeed[],
  gifts: PartnerAreaGift[],
): PartnerProject[] {
  const projects = new Map<string, PartnerProject>();

  /*
    Keyed off NEED_AREAS rather than the rows, so the order is the ministry's
    running order and not whatever the database handed back. An area nobody gave
    to is dropped at the end — this builds the list for one partner, and every
    heading on it has to be something they actually paid for.
  */
  for (const area of NEED_AREAS) {
    projects.set(area.id, {
      area,
      needs: [],
      gift: null,
      yoursCents: 0,
      yoursReceivedCents: 0,
    });
  }

  const projectFor = (id: string) => projects.get(areaOf(id).id)!;

  for (const need of needs) {
    const project = projectFor(need.area);
    project.needs.push(need);
    project.yoursCents += need.yoursCents;
    project.yoursReceivedCents += need.yoursReceivedCents;
  }

  for (const gift of gifts) {
    const project = projectFor(gift.area);
    project.gift = gift;
    project.yoursCents += gift.yoursCents;
    project.yoursReceivedCents += gift.yoursReceivedCents;
  }

  return [...projects.values()].filter(
    (project) => project.needs.length > 0 || project.gift !== null,
  );
}
