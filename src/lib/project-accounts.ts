import type { NeedArea } from "@/lib/giving";

/**
 * The sets of private figures a project can have, and who is allowed to read
 * each one.
 *
 * ## What an "account" is here
 *
 * Not the ledger. Every project's ledger — what it costs, what has arrived,
 * what is still open — is public on /needs and stays public, because a giver
 * has to see what they are being asked for. An *account* is the other document:
 * the line-by-line one. Simon's reconciliation of the kitchen gift, estimated
 * against actual. The quotes behind the playground total. Papers that say what
 * a ministry in Nairobi bought, what it paid, and what is about to be delivered
 * to its yard.
 *
 * Those were public once, moved behind the partner door for the reasons set out
 * in lib/disclosure.ts, and are now Simon's to place: each one carries a switch
 * in the CMS with three positions, and the middle one is the rule that file
 * describes.
 *
 * ## Why a registry rather than two booleans
 *
 * Because there will be a third project, and a fourth. Everything downstream is
 * generated from the list below — the CMS fields, their defaults, the type of
 * the saved document — so adding a project's accounts is adding an entry here
 * and rendering the component behind the check. Nobody has to remember to go and
 * add a switch, which is exactly the kind of thing that does not get remembered
 * and ends up published.
 *
 * Nothing in this file may import anything but types: it is read by the CMS
 * schema, by server components, and by the public pages.
 */

export const ACCOUNT_VISIBILITIES = [
  {
    value: "everyone",
    label: "Anyone",
    help: "Published on the project page, where any visitor can read them.",
  },
  {
    value: "partners",
    label: "The people who paid for it",
    help: "Behind the partner sign-in, shown to whoever has a stake in this project. This is the usual setting.",
  },
  {
    value: "nobody",
    label: "Nobody, for now",
    help: "Hidden from everybody, partners included. Use this while figures are being corrected.",
  },
] as const;

export type AccountVisibility = (typeof ACCOUNT_VISIBILITIES)[number]["value"];

/** The setting anything unset falls back to — today's behaviour, unchanged. */
export const DEFAULT_VISIBILITY: AccountVisibility = "partners";

export type AccountSet = {
  /** The CMS field name, and the key in the saved document. */
  id: string;
  /** Which project's stake in it counts. Matches an id in NEED_AREAS. */
  area: NeedArea;
  /** How the switch is labelled in /app. */
  label: string;
  /** What is actually in this set of papers, for somebody deciding. */
  help: string;
};

/*
  One entry per set of private figures on the site.

  `area` is what ties a set of accounts to the giving that earns a reading of
  it — the playground is filed under the academy because the yard is the
  academy's, not because anybody gave to a project called "playground".
*/
export const ACCOUNT_SETS = [
  {
    id: "kitchen",
    area: "kitchen",
    label: "The kitchen accounts",
    help: "Pastor Simon's reconciliation of the build, line by line: what each thing was estimated at, what it actually cost, and the three items the money never reached.",
  },
  {
    /*
      Filed under the playground itself, now that the playground is a project a
      gift can name. It used to be filed under the academy — the yard is the
      academy's — which was the closest available answer while "playground" was
      not one of the arms of the ministry. It is one now, so the people who open
      these costings are the people who paid toward this yard.
    */
    id: "playground",
    area: "playground",
    label: "The playground costings",
    help: "What each frame and each stretch of surfacing is estimated at, behind the total the page prints. These are things due to be delivered to the school yard.",
  },
] as const satisfies AccountSet[];

export type AccountSetId = (typeof ACCOUNT_SETS)[number]["id"];

export function isAccountVisibility(value: unknown): value is AccountVisibility {
  return ACCOUNT_VISIBILITIES.some((option) => option.value === value);
}

/**
 * One entry by id. Throws on an unknown one rather than returning undefined:
 * every caller is a page asking "may I draw this?", and an id that is not in the
 * registry is a typo in the source, not a state to handle at runtime.
 */
export function accountSet(id: AccountSetId): AccountSet {
  const found = ACCOUNT_SETS.find((set) => set.id === id);
  if (!found) throw new Error(`No project accounts registered as "${id}".`);
  return found;
}

/**
 * What one set of accounts is currently set to.
 *
 * Takes the saved CMS document rather than reading it, so a page that has
 * already loaded its content does not go back for it, and so this stays free of
 * anything that cannot run where it is called. Anything unrecognised — a
 * document saved before this switch existed, a value edited by hand in the
 * database — comes back as the default rather than as an error, and the default
 * is the closed one.
 */
export function visibilityOf(
  saved: Record<string, unknown> | null | undefined,
  id: AccountSetId,
): AccountVisibility {
  const value = saved?.[id];
  return isAccountVisibility(value) ? value : DEFAULT_VISIBILITY;
}
