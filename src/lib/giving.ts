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
*/
export const NEED_AREAS = [
  { id: "kitchen", label: "The kitchen build", icon: "trowel", href: "/projects/kitchen" },
  { id: "food", label: "Food at School", icon: "pot", href: "/programs/food-at-school" },
  { id: "academy", label: "Jepegomi Academy", icon: "book", href: "/academy" },
  { id: "church", label: "The church", icon: "church", href: "/church" },
  { id: "college", label: "Bible College", icon: "book", href: "/college" },
  { id: "other", label: "Across the ministry", icon: "give", href: "/about" },
] as const satisfies {
  id: string;
  label: string;
  icon: IconName;
  href: string;
}[];

export type NeedArea = (typeof NEED_AREAS)[number]["id"];

/** Falls back to "across the ministry" rather than throwing on an unknown area. */
export function areaOf(id: string) {
  return NEED_AREAS.find((area) => area.id === id) ?? NEED_AREAS[NEED_AREAS.length - 1];
}

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
  costCents: number;
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

export type Pledge = {
  id: string;
  needId: string;
  needSlug: string;
  needTitle: string;
  partnerId: string | null;
  partnerName: string | null;
  partnerEmail: string | null;
  amountCents: number;
  status: PledgeStatus;
  message: string;
  createdAt: string;
  receivedAt: string | null;
};

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
