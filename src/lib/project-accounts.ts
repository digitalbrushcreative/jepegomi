import { NEED_AREAS, type NeedArea } from "@/lib/giving";

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
 * ## One switch per arm of the ministry, not per registered document
 *
 * The switches used to be generated from `ACCOUNT_SETS` below, which meant a
 * project could only have accounts by being added to a list in a source file.
 * That was right while accounts were a rare, hand-built thing — the kitchen's
 * reconciliation letter, the playground's quotes. It stopped being right the
 * moment Simon could record what a project spent in /app: he would enter a
 * term's transport costs, nothing would appear on anybody's dashboard, and the
 * reason would be a TypeScript array he has never seen.
 *
 * So the switches are generated from `NEED_AREAS` — every arm of the ministry
 * gets one, defaulting to `partners`, and recording spending against a project
 * is all it takes for the people who paid for it to be able to read it. The
 * keys are the area ids, which is what the two hand-written switches were keyed
 * on already: nothing saved needs migrating.
 *
 * `ACCOUNT_SETS` stays for what it is now the only thing it describes — the
 * costing documents that are *not* the ledger, and so cannot be generated from
 * it. The playground's quotes are a list of things not yet bought, held in the
 * CMS; no amount of recorded spending would produce them.
 *
 * Nothing in this file may import anything but types and the area list: it is
 * read by the CMS schema, by server components, and by the public pages.
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
  One entry per costing document that is not the ledger.

  The kitchen used to be here. It is not any more, and not because its accounts
  went away — they are the ledger now, six closed rows with an estimate beside
  each actual, and every project's spending is read the same way. What is left
  in this list is the one document that cannot be derived from what has been
  spent, because nothing has been: a page of quotes for frames nobody has bought.

  `area` is what ties a document to the giving that earns a reading of it.
*/
export const ACCOUNT_SETS = [
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

/* ------------------------------------------- where each project's switch lives */

/*
  The two keys a project has in the saved `projectAccounts` document.

  Written as functions rather than spelled out at every call site because three
  files have to agree on them — the CMS schema that generates the fields, the
  form that saves them, and the pages that read them back — and a key that is a
  string literal in three places is a key that is a typo in one of them.

  `visibilityField` is the bare area id. It was the bare id when the only two
  switches were hand-written for the kitchen and the playground, whose registry
  ids happened to equal their areas, so every setting Simon has already saved
  reads back unchanged under the generated fields.
*/
export const visibilityField = (areaId: NeedArea) => areaId;
export const noteField = (areaId: NeedArea) => `${areaId}Note`;

/** Every arm of the ministry, in the ministry's own order. */
export const ACCOUNTABLE_AREAS = NEED_AREAS;

/**
 * What one project's accounts are currently set to.
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
  areaId: NeedArea,
): AccountVisibility {
  const value = saved?.[visibilityField(areaId)];
  return isAccountVisibility(value) ? value : DEFAULT_VISIBILITY;
}

/**
 * Simon's own paragraph about one project's figures — why a line ran over, what
 * he did about it — or empty for a project he has not written one for.
 *
 * This is the part of a set of accounts that a table cannot hold. "Cement, sand,
 * drainage and ballast all cost more than planned, and the roofing came in under
 * because Pastor Simon did the building himself" is the sentence that turns six
 * over-run rows from a worry into an account of a man building a kitchen, and
 * nothing in the ledger could ever derive it. It is content, so it is in the CMS.
 */
export function accountNoteOf(
  saved: Record<string, unknown> | null | undefined,
  areaId: NeedArea,
): string {
  const value = saved?.[noteField(areaId)];
  return typeof value === "string" ? value.trim() : "";
}
