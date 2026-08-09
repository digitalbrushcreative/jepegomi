import { getContent } from "@/cms/content";
import { kesPerUsd, usdFromKes } from "@/lib/money";

/**
 * The playground appeal, priced.
 *
 * Everything here used to be src/content/playground.ts — eight quote lines, two
 * totals and a boolean, in a file, with a comment at the top explaining that a
 * real quote from a Nairobi supplier would mean editing it. It is a CMS document
 * now, and this is where the numbers are read out of it and added up.
 *
 * The arithmetic stayed in code, which is the whole distinction: Simon types the
 * things that are facts about the world — what a swing set costs in shillings —
 * and the site works out what that comes to in dollars. A total typed into a box
 * is a total free to stop equalling the lines above it the moment one of them is
 * edited.
 *
 * There was a switch here saying whether a supplier had priced the job yet, and
 * every figure the page printed wore an "estimated" label off the back of it.
 * The site now says once, on /needs, that its figures come from quotes and
 * estimates, and says it where somebody is deciding what to give — which is
 * both more honest and less noisy than hedging each number in turn.
 */

export type QuoteLine = {
  item: string;
  note: string;
  priceKes: number;
  /** Converted at the site's one rate, rounded — see `usdFromKes`. */
  priceUsd: number;
};

export type Playground = {
  equipmentHeading: string;
  equipmentBody: string;
  equipment: QuoteLine[];
  groundHeading: string;
  groundBody: string;
  ground: QuoteLine[];
  equipmentUsd: number;
  groundUsd: number;
  totalUsd: number;
  asItStands: string[];
  photo: { src: string; alt: string; caption: string };
};

/**
 * Shillings out of a text box.
 *
 * The CMS stores every leaf field as a string, which is the right trade for a
 * form somebody types into — but it means "150,000", "150000 " and "" all arrive
 * here and only one of them is a number. Anything that is not one reads as zero
 * rather than as NaN, because a zero drops a line quietly out of a total and a
 * NaN turns the whole page into "$NaN".
 */
function kes(raw: unknown): number {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  const value = Number(digits);
  return Number.isFinite(value) ? value : 0;
}

function lines(
  rows: readonly { item: string; note: string; priceKes: string }[],
  rate: number,
): QuoteLine[] {
  return rows.map((row) => {
    const priceKes = kes(row.priceKes);
    return {
      item: row.item,
      note: row.note,
      priceKes,
      priceUsd: usdFromKes(priceKes, rate),
    };
  });
}

export async function getPlayground(): Promise<Playground> {
  const [content, site] = await Promise.all([
    getContent("playground"),
    getContent("site"),
  ]);

  const rate = kesPerUsd(site.kesPerUsd);
  const equipment = lines(content.equipment, rate);
  const ground = lines(content.ground, rate);

  /*
    Summed from the rounded per-line dollars rather than from the shillings, so
    the column a reader adds up themselves comes to the same total the page
    prints. Adding first and rounding once is more accurate and looks like an
    error on the page, which is the wrong way round for a figure whose whole job
    is to be checkable.
  */
  const total = (rows: QuoteLine[]) =>
    rows.reduce((sum, row) => sum + row.priceUsd, 0);

  const equipmentUsd = total(equipment);
  const groundUsd = total(ground);

  return {
    equipmentHeading: content.equipmentHeading,
    equipmentBody: content.equipmentBody,
    equipment,
    groundHeading: content.groundHeading,
    groundBody: content.groundBody,
    ground,
    equipmentUsd,
    groundUsd,
    totalUsd: equipmentUsd + groundUsd,
    asItStands: content.asItStands.map((row) => row.text).filter(Boolean),
    photo: {
      src: content.photo,
      alt: content.photoAlt,
      caption: content.photoCaption,
    },
  };
}
