import { getContent } from "@/cms/content";

/**
 * The Kitchen Build report, read out of the CMS.
 *
 * What is left of the old src/content/kitchen.ts, which was the last file on this site
 * still holding figures a person would want to change. The reconciliation went
 * to the ledger — it is rows in `needs` now — and this is the rest: who gave,
 * how far along the build is, and the before-and-after.
 *
 * The parsing is the whole reason this file exists rather than the pages reading
 * the document directly. Every CMS leaf is a string, because that is what a form
 * submits, and three of these are numbers that get printed into a page or fed to
 * a progress meter. "75%", "" and "seventy-five" all arrive here, and the page
 * must not print any of them.
 */

export type KitchenReport = {
  donor: string;
  donorTitled: string;
  donorLocation: string;
  /** Never rendered on a public page — see the note in cms/schema.ts. */
  giftCents: number;
  percentComplete: number;
  progressCaption: string;
  mealsPerDay: string;
  kitchensCooking: string;
  before: { heading: string; alt: string; bullets: string[] };
  after: { heading: string; alt: string; bullets: string[] };
};

/** Whole dollars out of a text box, in cents. Anything unreadable is zero. */
function dollars(raw: unknown): number {
  const value = Number(String(raw ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
}

/**
 * A percentage, clamped to something a bar can actually draw. A meter is a
 * picture of a fraction, and a picture of 140% is a broken page rather than an
 * ambitious one.
 */
function percent(raw: unknown): number {
  const value = Number(String(raw ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

const bullets = (rows: readonly { text: string }[]) =>
  rows.map((row) => row.text).filter(Boolean);

export async function getKitchenReport(): Promise<KitchenReport> {
  const content = await getContent("kitchen");

  return {
    donor: content.donor,
    donorTitled: content.donorTitled,
    donorLocation: content.donorLocation,
    giftCents: dollars(content.giftUsd),
    percentComplete: percent(content.percentComplete),
    progressCaption: content.progressCaption,
    mealsPerDay: content.mealsPerDay,
    kitchensCooking: content.kitchensCooking,
    before: {
      heading: content.beforeHeading,
      alt: content.beforeAlt,
      bullets: bullets(content.beforeBullets),
    },
    after: {
      heading: content.afterHeading,
      alt: content.afterAlt,
      bullets: bullets(content.afterBullets),
    },
  };
}

/**
 * The three headline numbers.
 *
 * The first is not in the CMS document above: the children fed are the children
 * enrolled — the school feeds everyone it teaches — so it comes from the
 * academy's own field and cannot sit here going stale while the school grows.
 * Null when that field is blank, which is why the fallback is a word rather than
 * a number.
 *
 * The middle one used to be the size of the gift. It is now what the kitchen
 * does rather than what it cost: three tiles that say children, meals and
 * kitchen describe a building; three that say children, dollars and kitchen
 * describe a transaction, and the second was never the page anybody meant.
 */
export function kitchenStats(report: KitchenReport, childrenFed: number | null) {
  return [
    {
      value: childrenFed ? String(childrenFed) : "All",
      label: "Children Fed Daily",
    },
    { value: report.mealsPerDay, label: "Hot Meals Cooked Daily" },
    { value: report.kitchensCooking, label: "Kitchen Cooking in Nairobi" },
  ] as const;
}
