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

/**
 * One named raise, inside one arm of the ministry.
 *
 * The rung the ledger did not used to have. An `area` was doing this job, which
 * caps a programme at one project — fine while the kitchen was the only thing
 * anybody was building, wrong the moment the academy wants a classroom block
 * and a library at once. See the note on the table in lib/db.ts.
 *
 * `area` is carried here as well as on the parts and needs below it. That is a
 * duplication on purpose and the same one `need_parts` already made: every
 * query that groups by arm of the ministry would otherwise reach through two
 * joins, and the writes that could pull the copies apart all go through
 * `updateProject`.
 */
export type Project = {
  id: string;
  /** Which arm of the ministry. Matches an id in NEED_AREAS. */
  area: string;
  slug: string;
  title: string;
  summary: string;
  /** Running order inside its arm. Gates nothing — see the note in lib/db.ts. */
  sequence: number;
  published: boolean;
  closed: boolean;
  createdAt: string;
};

export type NeedPart = {
  id: string;
  /** Which arm of the ministry. Matches an id in NEED_AREAS. */
  area: string;
  /** Which project it is a step of. Null only on a row not yet backfilled. */
  projectId: string | null;
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
  /**
   * The raise itself. Null for items whose project row is missing — an area
   * that has needs and no project yet, which the backfill in lib/db.ts closes
   * on the next boot. Kept rather than dropped, because an item nobody can see
   * is worse than one under a heading built from its area.
   */
  project: Project | null;
  /** The arm of the ministry it sits in. */
  area: Area;
  /** In running order: the sequenced parts, then anything not in a part. */
  parts: PartGroup[];
  ledger: Ledger;
  stillAskingCents: number;
};

/** What to call one of these on a page, whether or not it has its row yet. */
export function projectTitle(group: ProjectGroup): string {
  return group.project ? group.project.title : group.area.label;
}

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
 * Two levels of ordering, and they mean different things. The arms of the
 * ministry come out in the order of NEED_AREAS, for the reason the partner
 * dashboard does the same: the kitchen build is not more important than the
 * academy because somebody typed it first. Inside an arm the projects come out
 * by their own `sequence`, which is running order on a page and gates nothing —
 * a library nobody has started is not waiting on a classroom block.
 *
 * Parts are the level that *does* gate, and the rule is unchanged and still
 * lives here. It now runs per project rather than per area, which is the whole
 * point of the rung: "walls up" holding back "roof on" is a sequence, and the
 * academy's library holding back the academy's water tank never was one. Under
 * the old shape those shared a numbering and blocked each other.
 *
 * A project with nothing under it at all is dropped. A *part* with nothing
 * under it is kept, because /app has to be able to see a part that has just
 * been created and not yet itemised; the public pages skip those themselves.
 */
export function buildProjects(
  needs: NeedWithLedger[],
  parts: NeedPart[],
  projects: Project[],
): ProjectGroup[] {
  const built: ProjectGroup[] = [];

  for (const area of NEED_AREAS) {
    const areaNeeds = needs.filter((need) => areaOf(need.area).id === area.id);
    const areaParts = parts.filter((part) => areaOf(part.area).id === area.id);

    if (areaNeeds.length === 0 && areaParts.length === 0) continue;

    /*
      Every project in this arm that has anything in it, plus one standing for
      whatever has no project at all. That last is not a normal state — the
      backfill in lib/db.ts gives every row one — but a need whose project was
      deleted comes loose, and an item nobody can see is worse than an item
      under a heading built from its area. Same argument as the loose parts
      below, one rung up.
    */
    const mine = projects
      .filter((project) => project.area === area.id)
      .sort(
        (a, b) =>
          a.sequence - b.sequence || a.createdAt.localeCompare(b.createdAt),
      );

    const known = new Set(mine.map((project) => project.id));
    const orphaned =
      areaNeeds.some((need) => !need.projectId || !known.has(need.projectId)) ||
      areaParts.some((part) => !part.projectId || !known.has(part.projectId));

    const buckets: (Project | null)[] = orphaned ? [...mine, null] : mine;

    for (const project of buckets) {
      const inProject = (row: { projectId: string | null }) =>
        project
          ? row.projectId === project.id
          : !row.projectId || !known.has(row.projectId);

      const projectNeeds = areaNeeds.filter(inProject);
      const projectParts = areaParts
        .filter(inProject)
        .sort(
          (a, b) =>
            a.sequence - b.sequence || a.createdAt.localeCompare(b.createdAt),
        );

      if (projectNeeds.length === 0 && projectParts.length === 0) continue;

      /*
        Parts sharing a sequence number are one step and open together — two
        trades that can run at the same time should not have to be given a false
        order to sit in this list.
      */
      const steps = new Map<number, NeedPart[]>();
      for (const part of projectParts) {
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
            projectNeeds.filter((need) => need.partId === part.id),
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
      const loose = projectNeeds.filter(
        (need) => !projectParts.some((part) => part.id === need.partId),
      );
      if (loose.length > 0) groups.push(group(null, loose));

      built.push({
        project,
        area,
        parts: groups,
        ledger: sumLedger(projectNeeds),
        stillAskingCents: asking(projectNeeds),
      });
    }
  }

  return built;
}
