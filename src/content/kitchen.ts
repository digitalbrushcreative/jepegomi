/**
 * Single source of truth for the Kitchen Build page (/projects/kitchen).
 *
 * The /app CMS edits this same shape, so anything added here shows up on the
 * report without touching the page component.
 */

import type { IconName } from "@/components/icons";

/**
 * The three runs of photographs Simon has sent, in the order they arrived:
 * the walls going up in February, the roofed kitchen in May, and the first
 * meals cooked in it in June. There is no "Site & Foundation" tab because
 * there are no photographs of that — the first ones we have already show
 * block walls at knee height.
 */
export const PHOTO_CATEGORIES = [
  { id: "walls", label: "Walls & Structure" },
  { id: "roof", label: "Roof & Finish" },
  { id: "people", label: "Cooking & Eating" },
] as const;

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]["id"];

export type Photo = {
  id: number;
  category: PhotoCategory;
  caption: string;
  /** Empty until a real photo is uploaded — the slot renders as a placeholder. */
  src: string;
};

export const photos: Photo[] = [
  // February 2026 — the walls.
  { id: 1, category: "walls", caption: "Laying the first courses of the kitchen wall", src: "" },
  { id: 2, category: "walls", caption: "Blocks stacked and waiting, walls at knee height", src: "" },
  { id: 3, category: "walls", caption: "The kitchen going up beside the school", src: "" },
  { id: 4, category: "walls", caption: "Walls rising, timber props and ladder in place", src: "" },
  { id: 5, category: "walls", caption: "Doorway and window openings formed", src: "" },
  { id: 6, category: "walls", caption: "The passage between the kitchen and the store room", src: "" },
  { id: 7, category: "walls", caption: "Concrete lintels cast over the openings", src: "" },
  { id: 8, category: "walls", caption: "Inside — the cooking platforms take shape", src: "" },
  { id: 9, category: "walls", caption: "The serving counter, plastered", src: "" },
  { id: 10, category: "walls", caption: "Ring beam poured — walls at their full height", src: "" },
  // May 2026 — roofed, plastered and fitted out.
  { id: 11, category: "roof", caption: "Roofed, plastered and standing", src: "" },
  { id: 12, category: "roof", caption: "The kitchen from the yard", src: "" },
  { id: 13, category: "roof", caption: "In the doorway, with cooking underway inside", src: "" },
  { id: 14, category: "roof", caption: "Inside — the jiko in place on a tiled floor", src: "" },
  { id: 15, category: "roof", caption: "The two-pot wood-burning jiko, close up", src: "" },
  // June 2026 — the kitchen doing the job it was built for.
  { id: 16, category: "people", caption: "The fire lit under the new jiko", src: "" },
  { id: 17, category: "people", caption: "Rice and beans, plated for the children", src: "" },
  { id: 18, category: "people", caption: "The meal laid out beneath the kitchen vents", src: "" },
  { id: 19, category: "people", caption: "Food carried out to the children", src: "" },
  { id: 20, category: "people", caption: "The queue at the kitchen door", src: "" },
  { id: 21, category: "people", caption: "Lunch in the classroom", src: "" },
  { id: 22, category: "people", caption: "Every child eating the same meal", src: "" },
  { id: 23, category: "people", caption: "Plates in hand, on the way back to class", src: "" },
];

export const beforeAfter = {
  before: {
    heading: "Before — Cooking Outdoors",
    src: "",
    alt: "A cooking pot balanced on stones over an open wood fire on bare ground",
    bullets: [
      "Open fire cooking outdoors",
      "No shelter, storage or dining space",
      "Exposed to weather & smoke",
    ],
  },
  after: {
    heading: "Now — The New Kitchen",
    src: "",
    alt: "The new kitchen building at Jepegomi Academy",
    bullets: [
      "Brick walls & iron sheet roof",
      "Dedicated store room",
      "Dining area for 50+ children",
    ],
  },
} as const;

/** Percent complete, as reported by Simon & Joyce. */
export const progress = {
  percentComplete: 75,
  caption: "Structure done · finishing touches underway",
} as const;

/**
 * Who gave, deliberately unnamed.
 *
 * The giving congregation is not named anywhere on the public site. Another
 * church reading this page should see an invitation, not somebody else's
 * project — a named partner reads as a claim already staked. The gift and the
 * reconciliation below are reported exactly as they were given; only the name
 * is withheld.
 */
export const donation = {
  /** Lower case: it lands mid-sentence far more often than it opens one. */
  donor: "a partner church",
  /** The same words, for the one heading that starts with them. */
  donorTitled: "A partner church",
  donorLocation: "the United States",
  amountUsd: 8000,
} as const;

/**
 * The three headline numbers.
 *
 * The first one is not written here. The children fed are the children
 * enrolled — the school feeds everyone it teaches — so it is passed in from the
 * academy's CMS field (see `getChildrenFed`) and cannot sit here going stale
 * while the school grows. Null when that field is blank, which is why the
 * fallback is a word rather than a number.
 */
export const statsFor = (childrenFed: number | null) =>
  [
    {
      value: childrenFed ? String(childrenFed) : "All",
      label: "Children Fed Daily",
    },
    { value: "$8,000", label: `Donated by ${donation.donor}` },
    { value: "1", label: "Kitchen Rising in Nairobi" },
  ] as const;

/**
 * The three things the $8,000 could not reach. Costs are Simon's own estimates
 * from the reconciliation letter — see `outstanding` below, which is the same
 * list with its figures.
 */
export const remainingNeeds = [
  {
    icon: "water",
    text: "A water tank to harvest rainwater, and the pipes to run it",
    costUsd: 850,
  },
  {
    icon: "paving",
    text: "Cabro stones to floor the area where the children eat",
    costUsd: 1000,
  },
  {
    icon: "light",
    text: "Plastering and electricity for the dining hall",
    costUsd: 1138,
  },
] satisfies { icon: IconName; text: string; costUsd: number }[];

export type BudgetLine = {
  item: string;
  estimatedUsd: number;
  /** null = never bought/done, because the money ran out. */
  actualUsd: number | null;
  note: string;
  done: boolean;
};

/**
 * The estimated-vs-actual reconciliation from Simon's letter to the donor.
 *
 * Both columns balance to the $8,000 gift exactly: the estimates sum to $8,000,
 * and the six actual figures sum to $8,000. Transport is the one line the letter
 * marks "Used" without giving a figure, so it stays null rather than guessed.
 *
 * Lines 1–6 came in over estimate; the roofing-and-labour line came in *under*
 * because Pastor Simon did the building he knew how to do himself, as his own
 * giving to the ministry, and put the saved labour into materials.
 */
export const budget: BudgetLine[] = [
  {
    item: "Cement",
    estimatedUsd: 900,
    actualUsd: 1550,
    note: "More needed for drainage work",
    done: true,
  },
  {
    item: "Sand",
    estimatedUsd: 1200,
    actualUsd: 1650,
    note: "Price rose, and the job grew",
    done: true,
  },
  {
    item: "Drainage",
    estimatedUsd: 900,
    actualUsd: 1450,
    note: "Larger area required under NEEMA regulations",
    done: true,
  },
  {
    item: "Ballast",
    estimatedUsd: 700,
    actualUsd: 1175,
    note: "More area to cover",
    done: true,
  },
  {
    item: "Jiko — wood-burning stoves",
    estimatedUsd: 656,
    actualUsd: 1055,
    note: "Better quality and a bigger size than planned",
    done: true,
  },
  {
    item: "Roofing & labour",
    estimatedUsd: 1554,
    actualUsd: 1120,
    note: "Came in under — Pastor Simon did the building he could himself, as his giving to the ministry",
    done: true,
  },
  {
    item: "Transport",
    estimatedUsd: 240,
    actualUsd: null,
    note: "Used",
    done: true,
  },
];

/** Never started — the gift was fully spent before these could be reached. */
export const outstanding: BudgetLine[] = [
  {
    item: "Water tank for harvesting water, plus pipes",
    estimatedUsd: 850,
    actualUsd: null,
    note: "Not bought — funds ran out",
    done: false,
  },
  {
    item: "Cabro stones — the children's eating area floor",
    estimatedUsd: 1000,
    actualUsd: null,
    note: "Not done — funds ran out",
    done: false,
  },
  {
    item: "Dining hall — plastering and electricity",
    estimatedUsd: 1138,
    actualUsd: null,
    note: "Not done — funds ran out",
    done: false,
  },
];

export const budgetTotals = {
  given: donation.amountUsd,
  spent: budget.reduce((sum, line) => sum + (line.actualUsd ?? 0), 0),
  stillNeeded: outstanding.reduce((sum, line) => sum + line.estimatedUsd, 0),
};

export const budgetNote =
  "Figures in USD, as reported by Pastor Simon to the donor. The $8,000 gift is fully spent. The three items above were never reached.";

/**
 * The first-pass itemised estimate, before it was consolidated into the
 * reconciliation above. Kept for the record; not shown on the site.
 *
 * Cement $900 · sand $1,200 · ballast $700 · floor hardcore stones $750 ·
 * cabro floor stones $1,000 · drainage culverts and concrete $150 ·
 * water tank and pipes $850 · 2 wood-burning jikos $56 · stones for raising
 * sides $400 · cooking sufurias and pots $200 · roofing $500 ·
 * children's tables, chairs and utensils $200 · labour $1,004.
 */
