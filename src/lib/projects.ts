import {
  NEED_AREAS,
  type Area,
  type Ledger,
  type NeedWithLedger,
  areaOf,
} from "@/lib/giving";
import { percentOf } from "@/lib/money";

/**
 * A project, in parts, in order.
 *
 * The ledger has always had two rungs: a project — the kitchen build, the
 * academy — and the costed items underneath it. That is enough for a list and
 * not enough for a build. A building job is a sequence, and a giving page that
 * ignores the sequence will happily take four hundred dollars for paint while
 * the walls it is meant to go on are still an open line in the same budget.
 * The money is real, the thanks are real, and the paint sits in a store room
 * for a year.
 *
 * So there is a rung in between. A *part* is a step of the work — "walls up",
 * "roof and door", "fitting out" — carrying its own itemised list of costs and
 * a number saying where it comes in the running order. The rule is one
 * sentence, and this file is the only place that knows it:
 *
 *   A part is open for giving once every part before it is fully claimed.
 *
 * Fully *claimed*, not fully received. That is the same choice the meters make
 * and for the same reason (see the note on `Ledger`): the moment a church has
 * put its name to the last of the blockwork, the blockwork is somebody's — and
 * the next people through the door should be shown the roof, not asked for
 * money that is already promised.
 *
 * Two escape hatches, both of which fall out of what was already there rather
 * than needing a switch of their own. An item marked finished stops counting
 * towards what its part is still asking for, so a part whose last line came in
 * under budget can be closed off by hand and the next one opens. And an item
 * with no part at all is never sequenced — it is available the moment it is
 * published, which is the right answer for the things that are not steps in
 * anything: a term of a teacher's pay, a roll of exercise books.
 *
 * Nothing here touches the database. It takes the rows the queries in
 * lib/needs.ts hand back and works out the shape of them, which is why the
 * public pages, the giving form and /app can all agree on what is open without
 * three of them implementing this rule slightly differently.
 */

export type NeedPart = {
  id: string;
  /** Which project. Matches an id in NEED_AREAS. */
  area: string;
  title: string;
  summary: string;
  /** Lower comes first. Parts sharing a number open together. */
  sequence: number;
  createdAt: string;
};

export type PartGroup = {
  /** Null for the items that belong to the project rather than to a step of it. */
  part: NeedPart | null;
  needs: NeedWithLedger[];
  /** The part's own totals, summed from its items — including finished ones. */
  ledger: Ledger;
  /**
   * What somebody could still give to here, which is *not* `ledger.openCents`.
   * An item marked finished can be left with money unaccounted for — that is
   * what "we are not asking for the rest" looks like in a ledger — and its
   * remainder must not go on being counted as an ask.
   */
  stillAskingCents: number;
  /** Nothing left to give to. What lets the next part open. */
  settled: boolean;
  /** Everything before it is settled, so a gift can go here now. */
  ready: boolean;
  /** The unfinished part holding this one up. Null whenever `ready`. */
  waitsOn: NeedPart | null;
};

export type ProjectGroup = {
  area: Area;
  /** In running order: the sequenced parts, then anything not in a part. */
  parts: PartGroup[];
  ledger: Ledger;
  stillAskingCents: number;
};

/** The parts of a project a gift can go to today. */
export function readyParts(project: ProjectGroup) {
  return project.parts.filter((group) => group.ready && group.needs.length > 0);
}

/** The parts waiting on earlier work — shown, and not asked for. */
export function laterParts(project: ProjectGroup) {
  return project.parts.filter((group) => !group.ready && group.needs.length > 0);
}

/**
 * The totals of a set of items, as one ledger.
 *
 * Summed from each item's own ledger rather than re-derived from the pledges,
 * so a part cannot disagree with the items inside it. The percentages go
 * through `percentOf` like every other meter on the site — a part's bar and an
 * item's bar rounding differently is the kind of thing nobody reports and
 * everybody notices.
 */
function sumLedger(needs: NeedWithLedger[]): Ledger {
  const costCents = needs.reduce((sum, need) => sum + need.costCents, 0);
  const receivedCents = needs.reduce(
    (sum, need) => sum + need.ledger.receivedCents,
    0,
  );
  const promisedCents = needs.reduce(
    (sum, need) => sum + need.ledger.promisedCents,
    0,
  );
  const claimed = receivedCents + promisedCents;

  return {
    costCents,
    receivedCents,
    promisedCents,
    openCents: Math.max(0, costCents - claimed),
    percentReceived: percentOf(receivedCents, costCents),
    percentClaimed: percentOf(claimed, costCents),
    fullyClaimed: costCents > 0 && claimed >= costCents,
  };
}

/** What is still worth asking for here: open money on items nobody has closed. */
function asking(needs: NeedWithLedger[]) {
  return needs
    .filter((need) => !need.closed)
    .reduce((sum, need) => sum + need.ledger.openCents, 0);
}

function group(part: NeedPart | null, needs: NeedWithLedger[]): PartGroup {
  const stillAskingCents = asking(needs);
  return {
    part,
    needs,
    ledger: sumLedger(needs),
    stillAskingCents,
    settled: stillAskingCents === 0,
    ready: true,
    waitsOn: null,
  };
}

/**
 * The whole ledger, gathered into projects and parts and put in order.
 *
 * Projects come out in the ministry's own running order — the order of
 * NEED_AREAS — rather than in whatever order the database handed the rows
 * back, for the same reason the partner dashboard does it: the kitchen build
 * is not more important than the academy because somebody typed it first.
 *
 * A project with nothing under it at all is dropped. A *part* with nothing
 * under it is kept, because /app has to be able to see a part that has just
 * been created and not yet itemised; the public pages skip those themselves.
 */
export function buildProjects(
  needs: NeedWithLedger[],
  parts: NeedPart[],
): ProjectGroup[] {
  const projects: ProjectGroup[] = [];

  for (const area of NEED_AREAS) {
    const mine = needs.filter((need) => areaOf(need.area).id === area.id);
    const myParts = parts
      .filter((part) => areaOf(part.area).id === area.id)
      .sort(
        (a, b) =>
          a.sequence - b.sequence || a.createdAt.localeCompare(b.createdAt),
      );

    if (mine.length === 0 && myParts.length === 0) continue;

    /*
      Parts sharing a sequence number are one step and open together — two
      trades that can run at the same time should not have to be given a false
      order to sit in this list.
    */
    const steps = new Map<number, NeedPart[]>();
    for (const part of myParts) {
      steps.set(part.sequence, [...(steps.get(part.sequence) ?? []), part]);
    }

    const groups: PartGroup[] = [];

    /*
      The first part still asking for money. Once it is found, everything after
      it in the running order waits on it — and waits on *it*, not on whatever
      immediately precedes them, because that is the honest answer to "why can
      I not give to this yet".
    */
    let blocker: NeedPart | null = null;

    for (const [, step] of [...steps.entries()].sort(([a], [b]) => a - b)) {
      const made = step.map((part) => ({
        ...group(
          part,
          mine.filter((need) => need.partId === part.id),
        ),
        ready: blocker === null,
        waitsOn: blocker,
      }));

      groups.push(...made);
      blocker ??= made.find((one) => !one.settled)?.part ?? null;
    }

    /*
      Anything not in a part — including an item whose part was deleted out from
      under it, which is why this is a lookup against the parts we actually have
      rather than a null check on `partId`. An orphan has to land somewhere
      visible; the alternative is money quietly claimed against an item that
      appears on no page.
    */
    const loose = mine.filter(
      (need) => !myParts.some((part) => part.id === need.partId),
    );
    if (loose.length > 0) groups.push(group(null, loose));

    projects.push({
      area,
      parts: groups,
      ledger: sumLedger(mine),
      stillAskingCents: asking(mine),
    });
  }

  return projects;
}
