/**
 * Single source of truth for the Kitchen Build page (/projects/kitchen).
 *
 * The /app CMS edits this same shape, so anything added here shows up on the
 * report without touching the page component.
 */

export const PHOTO_CATEGORIES = [
  { id: "site", label: "Site & Foundation" },
  { id: "walls", label: "Walls & Structure" },
  { id: "roof", label: "Roof & Finish" },
  { id: "people", label: "People" },
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
  { id: 1, category: "site", caption: "Site cleared and prepared for foundation", src: "" },
  { id: 2, category: "site", caption: "Excavation for footings begins", src: "" },
  { id: 3, category: "site", caption: "Foundation trenches complete", src: "" },
  { id: 4, category: "site", caption: "Concrete poured for footings", src: "" },
  { id: 5, category: "walls", caption: "First courses of brickwork — kitchen", src: "" },
  { id: 6, category: "walls", caption: "Walls rising on the main kitchen", src: "" },
  { id: 7, category: "walls", caption: "Window openings formed", src: "" },
  { id: 8, category: "walls", caption: "Kitchen walls at full height", src: "" },
  { id: 9, category: "walls", caption: "Lintels and door frames set", src: "" },
  { id: 10, category: "walls", caption: "Store room walls going up", src: "" },
  { id: 11, category: "walls", caption: "Dining area walls in progress", src: "" },
  { id: 12, category: "walls", caption: "Overview — all three spaces taking shape", src: "" },
  { id: 13, category: "roof", caption: "Roof structure frames installed", src: "" },
  { id: 14, category: "roof", caption: "Iron sheets on the kitchen roof", src: "" },
  { id: 15, category: "roof", caption: "Kitchen interior — looking up at the roof", src: "" },
  { id: 16, category: "roof", caption: "Exterior plastering begins", src: "" },
  { id: 17, category: "roof", caption: "Store room — door fitted", src: "" },
  { id: 18, category: "roof", caption: "Brickwork detail", src: "" },
  { id: 19, category: "people", caption: "Children visiting the new kitchen site", src: "" },
  { id: 20, category: "people", caption: "The building team at work", src: "" },
  { id: 21, category: "people", caption: "Inspecting progress on site", src: "" },
  { id: 22, category: "people", caption: "Community gathered to see the work", src: "" },
  { id: 23, category: "people", caption: "Where we stand today", src: "" },
];

export const beforeAfter = {
  before: {
    heading: "Before — Cooking Outdoors",
    src: "",
    alt: "Meals being cooked outdoors over an open fire",
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

export const donation = {
  donor: "Encounter Church",
  donorLocation: "Palmyra, Pennsylvania",
  amountUsd: 8000,
} as const;

export const stats = [
  { value: "50+", label: "Children Fed Daily" },
  { value: "$8,000", label: "Donated by Encounter Church" },
  { value: "1", label: "Kitchen Rising in Nairobi" },
] as const;

/**
 * The three things the $8,000 could not reach. Costs are Simon's own estimates
 * from the reconciliation letter — see `outstanding` below, which is the same
 * list with its figures.
 */
export const remainingNeeds = [
  {
    icon: "🚰",
    text: "A water tank to harvest rainwater, and the pipes to run it",
    costUsd: 850,
  },
  {
    icon: "🔲",
    text: "Cabro stones to floor the area where the children eat",
    costUsd: 1000,
  },
  {
    icon: "💡",
    text: "Plastering and electricity for the dining hall",
    costUsd: 1138,
  },
] as const;

export type BudgetLine = {
  item: string;
  estimatedUsd: number;
  /** null = never bought/done, because the money ran out. */
  actualUsd: number | null;
  note: string;
  done: boolean;
};

/**
 * The estimated-vs-actual reconciliation from Simon's letter to Encounter Church.
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
  "Figures in USD, as reported by Pastor Simon to Encounter Church. The $8,000 gift is fully spent. The three items above were never reached.";

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
