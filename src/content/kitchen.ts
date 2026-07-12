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

export const remainingNeeds = [
  { icon: "🍽️", text: "Stainless steel plates and cups for the children" },
  { icon: "🪑", text: "Dining tables and chairs for the eating area" },
  { icon: "🏗️", text: "Iron sheets to complete the dining area roofing" },
  { icon: "🔲", text: "Floor tiles for the dining room and the store room" },
  { icon: "🧱", text: "Sand and cement to plaster all walls smooth" },
  { icon: "🔧", text: "Labour and miscellaneous finishing costs" },
] as const;

export type BudgetLine = {
  item: string;
  /** null = figure not yet confirmed; the table renders "TBC" rather than a guess. */
  costUsd: number | null;
  complete: boolean;
};

/**
 * OPEN ITEM — every line cost below is unconfirmed.
 *
 * The source report's dollar amounts arrived corrupted: each "$" and the digit
 * immediately after it had been eaten, so "$8,000" survived only as ",000" and
 * "$400" as "00". The surviving fragments were, in order:
 *
 *   structure ~?,200 · store room ~?50 · iron sheets ?00 · floor tiles ?50
 *   sand & cement ?50 · plates & cups ?00 · tables ?00 · chairs ?00
 *   labour ?00 · TOTAL ~?,650
 *
 * The leading digits are unrecoverable, so guessing them would put invented
 * numbers in front of donors. They stay null until Simon & Joyce confirm.
 * The $8,000 donation is the one figure that survived intact.
 */
export const budget: BudgetLine[] = [
  { item: "Kitchen structure — brickwork, roofing, doors, windows", costUsd: null, complete: true },
  { item: "Store room walls and roof", costUsd: null, complete: true },
  { item: "Iron sheets — dining area roof", costUsd: null, complete: false },
  { item: "Floor tiles — dining room & store", costUsd: null, complete: false },
  { item: "Sand & cement — wall plastering", costUsd: null, complete: false },
  { item: "Stainless steel plates & cups", costUsd: null, complete: false },
  { item: "Dining tables", costUsd: null, complete: false },
  { item: "Dining chairs", costUsd: null, complete: false },
  { item: "Labour & miscellaneous finishing", costUsd: null, complete: false },
];

/** Total project cost — also unconfirmed, for the reason above. */
export const budgetTotalUsd: number | null = null;

export const budgetNote =
  "Estimates in USD. Any surplus supports ongoing feeding program operations. A final reconciliation report will be shared on project completion.";
