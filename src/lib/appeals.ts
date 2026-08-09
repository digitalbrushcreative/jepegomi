import { getContent } from "@/cms/content";
import { type Area, type NeedArea, areaOf } from "@/lib/giving";
import { busPrice, kesPerUsd, usdFromKes } from "@/lib/money";
import { getPlayground } from "@/lib/playground";

/**
 * The projects a gift can go to whole, with what the whole job costs.
 *
 * The ledger — needs, parts, pledges, meters — is the itemised way to give, and
 * it is the better one: a church that pays for the cabro floor can be shown the
 * floor. But it only ever held the kitchen, because the kitchen is the only
 * project anybody has sat down and broken into lines. The playground, the bus
 * and the streaming kit have all been costed too; their figures simply live in
 * the CMS, on the pages that argue for them, where nothing could be given
 * towards them except by writing their name into a box.
 *
 * So this is the second rung, deliberately thin: one figure per project, which
 * is what the whole job comes to. A gift against one is recorded exactly as a
 * gift somebody described in their own words already is — a pledge with no need
 * row and the project's own name on it — and because the name it carries is the
 * project's label, `areaForDesignation` files it under the project and the
 * giver's dashboard shows them the work rather than a line of text. No new
 * table, no new column, nothing to seed before a page will answer.
 *
 * What is deliberately *not* here is what has come in against any of them. The
 * kitchen has meters because its items are a ledger; these are asks. A running
 * total of gifts held toward a bus is a statement of the cash this ministry has
 * on hand, and the site took one of those down on purpose — see the note on the
 * bus fields in cms/schema.ts.
 */

export type Appeal = {
  area: Area;
  /** What the project is asking for, in a line. */
  summary: string;
  /** The whole job, in cents, like every other figure in the ledger. */
  costCents: number;
};

/**
 * Dollars off a project page into the ledger's own unit.
 *
 * Those pages round hard on the way out of shillings — to the nearest ten, and
 * to the nearest hundred for the bus — because the rate moves daily and a
 * supplier's price is a negotiation. Nothing here re-derives any of that: an
 * appeal has to show the same figure the project's own page does, or a giver
 * who followed a link from one to the other has caught the site disagreeing
 * with itself about what a playground costs.
 */
const cents = (dollars: number) => Math.round(dollars) * 100;

export async function getAppeals(): Promise<Appeal[]> {
  const [playground, transport, digital, site] = await Promise.all([
    getPlayground(),
    getContent("transport"),
    getContent("digital"),
    getContent("site"),
  ]);

  const rate = kesPerUsd(site.kesPerUsd);
  const bus = busPrice(transport.busPriceKes, site.kesPerUsd);

  /*
    Summed from the rounded per-line dollars, the same way the playground's own
    total is, so the two halves of the site round identically.
  */
  const kitUsd = digital.kit.reduce(
    (sum, line) =>
      sum +
      usdFromKes(Number(String(line.priceKes).replace(/[^\d]/g, "")) || 0, rate),
    0,
  );

  const appeals: { id: NeedArea; summary: string; costCents: number }[] = [
    {
      id: "playground",
      summary:
        "Galvanised equipment to replace what was welded on site, and a rubber crumb surface for the children to land on.",
      costCents: cents(playground.totalUsd),
    },
    {
      id: "transport",
      summary: `A ${transport.busSeats}-seater bus for the school run — the school has outgrown its van, and a bus carries the children still to come.`,
      costCents: bus.usdCents,
    },
    {
      id: "digital",
      summary:
        "A camera, a laptop that can edit, microphones, a light, and a year of the connection the services go out over.",
      costCents: cents(kitUsd),
    },
  ];

  /*
    A project with no figure on it is not an ask. A cleared price box in the CMS
    would otherwise put "$0" in front of a giver, which reads as either a bug or
    a free playground.
  */
  return appeals
    .filter((appeal) => appeal.costCents > 0)
    .map((appeal) => ({
      area: areaOf(appeal.id),
      summary: appeal.summary,
      costCents: appeal.costCents,
    }));
}

/** One appeal by its project, or null — used to price a Give button. */
export async function getAppeal(id: NeedArea): Promise<Appeal | null> {
  const appeals = await getAppeals();
  return appeals.find((appeal) => appeal.area.id === id) ?? null;
}
