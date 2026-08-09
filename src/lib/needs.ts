import { randomUUID } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { toIso } from "@/lib/dates";
import { isDatabaseConfigured, sql } from "@/lib/db";
import type {
  Ledger,
  Need,
  NeedArea,
  NeedUpdate,
  NeedWithLedger,
  PartnerAreaGift,
  PartnerNeed,
  Pledge,
  PledgeStatus,
  ProjectBudget,
} from "@/lib/giving";
import { percentOf } from "@/lib/money";
import type { NeedPart } from "@/lib/projects";

/**
 * The giving ledger.
 *
 * A *need* is one thing the ministry is short of, with one price on it. A
 * *pledge* is one partner claiming part of that price. A need is funded by
 * however many pledges it takes to reach its cost — which is the whole idea:
 * a church that can give $400 towards an $850 water tank should be able to,
 * and should be able to see that the remaining $450 is still there for
 * somebody else to pick up.
 *
 * What the public sees, and what it does not:
 *
 *   Public      every figure. The cost, what has arrived, what is promised,
 *               what is still open, and the progress reported back with photos.
 *   Public      no names. Not who gave, not how many gave, not how much any one
 *               of them gave. A giving page that ranks its donors turns a gift
 *               into a scoreboard, and a small church into a small line on it.
 *   The partner their own giving, in full, once they are signed in — and
 *               nobody else's, ever. There is no query in this file that will
 *               hand one partner another partner's row.
 *   /app        all of it, because somebody has to reconcile the bank.
 *
 * The shapes and labels these functions traffic in live in lib/giving.ts, which
 * imports nothing — so a form component can name a pledge status without
 * dragging the Postgres driver into the browser bundle.
 */

export const NEEDS_TAG = "needs";

/** Tag for one need's own page and its updates. */
export function needTag(slug: string) {
  return `need:${slug}`;
}

/* ---------------------------------------------------------------- shaping */

type Row = Record<string, unknown>;

const int = (value: unknown) => Number(value ?? 0);
const str = (value: unknown) => String(value ?? "");

function toNeed(row: Row): Need {
  return {
    id: str(row.id),
    slug: str(row.slug),
    title: str(row.title),
    summary: str(row.summary),
    detail: str(row.detail),
    area: str(row.area),
    partId: row.part_id ? str(row.part_id) : null,
    costCents: int(row.cost_cents),
    estimatedCents:
      row.estimated_cents === null || row.estimated_cents === undefined
        ? null
        : int(row.estimated_cents),
    note: str(row.note),
    icon: str(row.icon),
    published: Boolean(row.published),
    closed: Boolean(row.closed),
    position: int(row.position),
    createdAt: toIso(row.created_at),
  };
}

function toLedger(costCents: number, claimedCents: number, receivedCents: number): Ledger {
  const claimed = Math.min(claimedCents, Number.MAX_SAFE_INTEGER);
  return {
    costCents,
    receivedCents,
    promisedCents: Math.max(0, claimed - receivedCents),
    openCents: Math.max(0, costCents - claimed),
    percentReceived: percentOf(receivedCents, costCents),
    percentClaimed: percentOf(claimed, costCents),
    fullyClaimed: claimed >= costCents,
  };
}

function toNeedWithLedger(row: Row): NeedWithLedger {
  const need = toNeed(row);
  return {
    ...need,
    ledger: toLedger(need.costCents, int(row.claimed_cents), int(row.received_cents)),
  };
}

function toPart(row: Row): NeedPart {
  return {
    id: str(row.id),
    area: str(row.area),
    title: str(row.title),
    summary: str(row.summary),
    sequence: int(row.sequence),
    createdAt: toIso(row.created_at),
  };
}

function toUpdate(row: Row): NeedUpdate {
  return {
    id: str(row.id),
    needId: str(row.need_id),
    body: str(row.body),
    photo: str(row.photo),
    photoAlt: str(row.photo_alt),
    createdAt: toIso(row.created_at),
    authorName: row.author_name ? str(row.author_name) : null,
  };
}

function toPledge(row: Row): Pledge {
  return {
    id: str(row.id),
    needId: row.need_id ? str(row.need_id) : null,
    needSlug: row.need_slug ? str(row.need_slug) : null,
    needTitle: row.need_title ? str(row.need_title) : null,
    needPublished: Boolean(row.need_published),
    designation: str(row.designation),
    area: row.area ? (str(row.area) as NeedArea) : null,
    partnerId: row.partner_id ? str(row.partner_id) : null,
    partnerName: row.partner_name ? str(row.partner_name) : null,
    partnerEmail: row.partner_email ? str(row.partner_email) : null,
    amountCents: int(row.amount_cents),
    status: str(row.status) as PledgeStatus,
    message: str(row.message),
    createdAt: toIso(row.created_at),
    receivedAt: row.received_at ? toIso(row.received_at) : null,
  };
}

/*
  Every query below reads its totals from the `need_ledger` view and its names
  from `pledge_detail`, both defined in lib/db.ts. What counts as claimed is
  decided there, once, rather than in each of these queries — see the comment on
  the view for why that matters.
*/

/* ----------------------------------------------------------- public reads */

/**
 * Every published need, in Simon's running order, with its ledger.
 *
 * Cached and tagged, like the CMS content is: it changes when somebody claims
 * something or Simon banks a payment, and both of those call updateTag. If the
 * database is unreachable — or has never had these tables created, which is the
 * case until somebody first opens /app — this returns nothing and the giving
 * pages say so, rather than the public site falling over.
 */
export async function getPublishedNeeds(): Promise<NeedWithLedger[]> {
  "use cache";
  cacheTag(NEEDS_TAG);
  cacheLife("max");

  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await sql()`
      SELECT n.*, l.claimed_cents, l.received_cents
      FROM needs n
      JOIN need_ledger l ON l.need_id = n.id
      WHERE n.published
      ORDER BY n.closed, n.position, n.created_at
    `;
    return rows.map(toNeedWithLedger);
  } catch (error) {
    console.error("Giving: could not read the needs.", error);
    return [];
  }
}

/**
 * One project's accounts, rebuilt from its needs.
 *
 * This is the query that let src/content/kitchen.ts stop being the source of
 * truth for Pastor Simon's reconciliation. The letter was a TypeScript array;
 * the database held a hand-seeded copy of the same lines with the estimates
 * flattened into prose, and the two were free to drift the moment either was
 * corrected. Now there is one set of rows, Simon edits them in /app like every
 * other item, and this reads the letter back out of them.
 *
 * `closed` does the sorting, because it already means the right thing: finished
 * work above, work the money never reached below. Unpublished rows are included
 * on purpose — the six lines the kitchen gift was spent on are unpublished
 * precisely so the site stops asking for cement somebody bought in 2023, and
 * they are the better part of the account.
 *
 * Not cached. Every caller is behind a session or a disclosure check, so there
 * is no anonymous traffic to protect, and a figure Simon has just corrected
 * showing up on the next page load beats a tag to remember to expire.
 */
export async function getProjectBudget(area: string): Promise<ProjectBudget> {
  const empty: ProjectBudget = {
    spent: [],
    outstanding: [],
    spentCents: 0,
    stillNeededCents: 0,
    estimatedCents: 0,
  };

  if (!isDatabaseConfigured()) return empty;

  try {
    const rows = await sql()`
      SELECT id, title, cost_cents, estimated_cents, note, closed
      FROM needs
      WHERE area = ${area}
      ORDER BY closed, position, created_at
    `;

    const budget: ProjectBudget = { ...empty, spent: [], outstanding: [] };

    for (const row of rows) {
      const cost = int(row.cost_cents);
      const estimated =
        row.estimated_cents === null || row.estimated_cents === undefined
          ? cost
          : int(row.estimated_cents);

      const line = {
        id: str(row.id),
        item: str(row.title),
        estimatedCents: estimated,
        /*
          Zero is how a line the letter marks "Used" — spent, with no figure
          against it — is written down, and it has to read back as "we do not
          know" rather than as "it cost nothing". A closed row at zero is the
          only way to say that with a column that cannot be null.
        */
        actualCents: row.closed ? (cost > 0 ? cost : null) : null,
        note: str(row.note),
      };

      if (row.closed) {
        budget.spent.push(line);
        budget.spentCents += cost;
        budget.estimatedCents += estimated;
      } else {
        budget.outstanding.push(line);
        budget.stillNeededCents += cost;
      }
    }

    return budget;
  } catch (error) {
    console.error(`Giving: could not read the accounts for "${area}".`, error);
    return empty;
  }
}

/**
 * What finishing a project would cost — the one figure off its accounts that is
 * public, and the only one the front page and the project pages need.
 *
 * Published rows only, unlike `getProjectBudget`: this is an ask, and the site
 * must not print a total that includes a draft nobody has decided to ask for.
 * Cached and tagged with the rest of the ledger, because it is on the front page
 * and every visitor pays for it.
 */
export async function getStillNeededCents(area: string): Promise<number> {
  "use cache";
  cacheTag(NEEDS_TAG);
  cacheLife("max");

  if (!isDatabaseConfigured()) return 0;

  try {
    const rows = await sql()`
      SELECT COALESCE(SUM(cost_cents), 0)::int AS cents
      FROM needs
      WHERE area = ${area} AND published AND NOT closed
    `;
    return int(rows[0]?.cents);
  } catch (error) {
    console.error(`Giving: could not total what "${area}" still needs.`, error);
    return 0;
  }
}

export async function getNeedBySlug(slug: string): Promise<NeedWithLedger | null> {
  "use cache";
  cacheTag(NEEDS_TAG, needTag(slug));
  cacheLife("max");

  if (!isDatabaseConfigured()) return null;

  try {
    const rows = await sql()`
      SELECT n.*, l.claimed_cents, l.received_cents
      FROM needs n
      JOIN need_ledger l ON l.need_id = n.id
      WHERE n.slug = ${slug} AND n.published
    `;
    return rows[0] ? toNeedWithLedger(rows[0]) : null;
  } catch (error) {
    console.error(`Giving: could not read the need "${slug}".`, error);
    return null;
  }
}

/**
 * Every part of every project, in running order.
 *
 * Not filtered by anything, and there is nothing to filter by — a part has no
 * published flag of its own. It becomes visible where its items are visible,
 * so a part holding only drafts is a heading nobody on the public site ever
 * sees, without a second switch to forget to throw.
 *
 * Cached under the same tag as the needs, because the two are read together
 * everywhere and a part that moves in the running order changes what /give
 * offers just as surely as a new item does.
 */
export async function getParts(): Promise<NeedPart[]> {
  "use cache";
  cacheTag(NEEDS_TAG);
  cacheLife("max");

  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await sql()`
      SELECT * FROM need_parts ORDER BY area, sequence, created_at
    `;
    return rows.map(toPart);
  } catch (error) {
    console.error("Giving: could not read the parts.", error);
    return [];
  }
}

/** The progress reported back on a need — newest first. */
export async function getNeedUpdates(slug: string): Promise<NeedUpdate[]> {
  "use cache";
  cacheTag(NEEDS_TAG, needTag(slug));
  cacheLife("max");

  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await sql()`
      SELECT u.*, users.name AS author_name
      FROM need_updates u
      JOIN needs n ON n.id = u.need_id
      LEFT JOIN users ON users.id = u.created_by
      WHERE n.slug = ${slug}
      ORDER BY u.created_at DESC
    `;
    return rows.map(toUpdate);
  } catch (error) {
    console.error(`Giving: could not read updates for "${slug}".`, error);
    return [];
  }
}

/** The one-line version, for the front page and the Give page. */
export async function getGivingSummary() {
  "use cache";
  cacheTag(NEEDS_TAG);
  cacheLife("max");

  const needs = await getPublishedNeeds();
  const open = needs.filter((need) => !need.closed);

  return {
    openCount: open.filter((need) => need.ledger.openCents > 0).length,
    totalOpenCents: open.reduce((sum, need) => sum + need.ledger.openCents, 0),
    totalReceivedCents: needs.reduce(
      (sum, need) => sum + need.ledger.receivedCents,
      0,
    ),
    fundedCount: needs.filter((need) => need.ledger.fullyClaimed).length,
    needCount: needs.length,
  };
}

/* ------------------------------------------------------------ admin reads */

/** Every need including the unpublished ones. Never cached — /app is live. */
export async function listNeeds(): Promise<NeedWithLedger[]> {
  const rows = await sql()`
    SELECT n.*, l.claimed_cents, l.received_cents
    FROM needs n
    JOIN need_ledger l ON l.need_id = n.id
    ORDER BY n.closed, n.position, n.created_at
  `;
  return rows.map(toNeedWithLedger);
}

/** The same parts, read live, because /app must never show a stale ordering. */
export async function listParts(): Promise<NeedPart[]> {
  const rows = await sql()`
    SELECT * FROM need_parts ORDER BY area, sequence, created_at
  `;
  return rows.map(toPart);
}

export async function getNeedById(id: string): Promise<NeedWithLedger | null> {
  const rows = await sql()`
    SELECT n.*, l.claimed_cents, l.received_cents
    FROM needs n
    JOIN need_ledger l ON l.need_id = n.id
    WHERE n.id = ${id}
  `;
  return rows[0] ? toNeedWithLedger(rows[0]) : null;
}

export async function listPledgesForNeed(needId: string): Promise<Pledge[]> {
  const rows = await sql()`
    SELECT * FROM pledge_detail
    WHERE need_id = ${needId}
    ORDER BY created_at DESC
  `;
  return rows.map(toPledge);
}

/** Everything waiting on Simon: a new claim, or a promise whose money has not landed. */
export async function listOpenPledges(): Promise<Pledge[]> {
  const rows = await sql()`
    SELECT * FROM pledge_detail
    WHERE status IN ('pending', 'promised')
    ORDER BY status, created_at
  `;
  return rows.map(toPledge);
}

/**
 * Gifts given towards something other than a listed item.
 *
 * These have no need page to live on, so /app is the only place they are ever
 * seen — all of them, in every status, rather than only the ones still waiting.
 * A general gift that has been banked and forgotten about is exactly the kind of
 * money a ledger is supposed to stop losing.
 */
export async function listGeneralPledges(): Promise<Pledge[]> {
  const rows = await sql()`
    SELECT * FROM pledge_detail
    WHERE need_id IS NULL
    ORDER BY created_at DESC
  `;
  return rows.map(toPledge);
}

export async function listUpdatesForNeed(needId: string): Promise<NeedUpdate[]> {
  const rows = await sql()`
    SELECT u.*, users.name AS author_name
    FROM need_updates u
    LEFT JOIN users ON users.id = u.created_by
    WHERE u.need_id = ${needId}
    ORDER BY u.created_at DESC
  `;
  return rows.map(toUpdate);
}

/* ---------------------------------------------------------- partner reads */

/** One partner's own giving. The partner id comes from their signed cookie. */
export async function listPledgesForPartner(partnerId: string): Promise<Pledge[]> {
  const rows = await sql()`
    SELECT * FROM pledge_detail
    WHERE partner_id = ${partnerId}
    ORDER BY created_at DESC
  `;
  return rows.map(toPledge);
}

/**
 * The needs this partner has a stake in, with their own share alongside the
 * public totals. Note what is absent: no other partner's id, name or amount
 * appears in this result, which is what makes the dashboard safe to render.
 */
export async function listNeedsForPartner(
  partnerId: string,
): Promise<PartnerNeed[]> {
  /*
    `mine` is joined on the partner id, so every row summed here is already
    theirs — the FILTERs narrow by status only. The public totals come from the
    view alongside, which is how the dashboard can say "you gave $400 of this
    $850" without the query ever selecting another partner's row.
  */
  const rows = await sql()`
    SELECT n.*, l.claimed_cents, l.received_cents,
      COALESCE(SUM(mine.amount_cents) FILTER (WHERE mine.status <> 'declined'), 0)::int
        AS yours_cents,
      COALESCE(SUM(mine.amount_cents) FILTER (WHERE mine.status = 'received'), 0)::int
        AS yours_received_cents
    FROM needs n
    JOIN need_ledger l ON l.need_id = n.id
    JOIN pledges mine ON mine.need_id = n.id AND mine.partner_id = ${partnerId}
    GROUP BY n.id, l.claimed_cents, l.received_cents
    ORDER BY n.closed, n.position, n.created_at
  `;

  return rows.map((row) => ({
    ...toNeedWithLedger(row),
    yoursCents: int(row.yours_cents),
    yoursReceivedCents: int(row.yours_received_cents),
  }));
}

/**
 * Designated giving that has no listed item behind it, summed per area.
 *
 * A gift the giver described in their own words used to be a dead end on their
 * dashboard: a line of text and an amount, with no project to look at and no
 * photographs to see. Where the words named an arm of the ministry, this is what
 * puts it back under that project — the ledger keeps the row exactly as it was
 * written, and the dashboard files it where the money went.
 *
 * Rows whose area is null are deliberately absent. They still appear in "every
 * claim" below, in the giver's own words, because that list is the record and
 * the record is complete; what they cannot do is claim a project heading nobody
 * has established they gave to.
 */
export async function listAreaGiftsForPartner(
  partnerId: string,
): Promise<PartnerAreaGift[]> {
  const rows = await sql()`
    SELECT area,
      COALESCE(SUM(amount_cents) FILTER (WHERE status <> 'declined'), 0)::int
        AS yours_cents,
      COALESCE(SUM(amount_cents) FILTER (WHERE status = 'received'), 0)::int
        AS yours_received_cents,
      COUNT(*) FILTER (WHERE status <> 'declined')::int AS gift_count
    FROM pledges
    WHERE partner_id = ${partnerId}
      AND need_id IS NULL
      AND area IS NOT NULL
      AND status <> 'declined'
    GROUP BY area
  `;

  return rows.map((row) => ({
    area: str(row.area) as NeedArea,
    yoursCents: int(row.yours_cents),
    yoursReceivedCents: int(row.yours_received_cents),
    giftCount: int(row.gift_count),
  }));
}

/**
 * Progress on the work this partner paid for — the reason to come back.
 *
 * Two ways in, and the second one matters more than it looks. A church that
 * claimed the water tank sees updates on the water tank; that is the first
 * branch and it is the obvious one. A church that gave $8,000 towards "the
 * kitchen build" claimed no single item, and under the first branch alone would
 * sign in to an empty page — having paid for the building in the photographs.
 * The area is what connects them to it.
 */
export async function listUpdatesForPartner(
  partnerId: string,
  limit = 30,
): Promise<(NeedUpdate & { needTitle: string; needSlug: string })[]> {
  const rows = await sql()`
    SELECT u.*, n.title AS need_title, n.slug AS need_slug,
           users.name AS author_name
    FROM need_updates u
    JOIN needs n ON n.id = u.need_id
    LEFT JOIN users ON users.id = u.created_by
    WHERE EXISTS (
      SELECT 1 FROM pledges p
      WHERE p.partner_id = ${partnerId}
        AND p.status <> 'declined'
        AND (p.need_id = n.id OR (p.need_id IS NULL AND p.area = n.area))
    )
    ORDER BY u.created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    ...toUpdate(row),
    needTitle: str(row.need_title),
    needSlug: str(row.need_slug),
  }));
}

/* ---------------------------------------------------------------- writing */

/** "Water tank & pipes" -> "water-tank-pipes". */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** A slug nothing else is using, by adding -2, -3 … if it has to. */
async function uniqueSlug(base: string, exceptId?: string) {
  const root = slugify(base) || "need";

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const rows = await sql()`
      SELECT 1 FROM needs
      WHERE slug = ${candidate} AND id <> ${exceptId ?? ""}
    `;
    if (rows.length === 0) return candidate;
  }

  return `${root}-${randomUUID().slice(0, 8)}`;
}

export type NeedInput = {
  title: string;
  summary: string;
  detail: string;
  /**
   * Which project. Ignored whenever `partId` is set — a part already belongs to
   * a project, and an item that claimed a different one would sit in a list it
   * is not part of. The actions resolve this before calling; see `readNeedForm`.
   */
  area: string;
  partId: string | null;
  costCents: number;
  /** What it was expected to cost, if that differs. Null is the ordinary answer. */
  estimatedCents: number | null;
  /** One line on why the two differ. Read only by a project's accounts. */
  note: string;
  /** An `IconName`, or empty to fall back to the project's own icon. */
  icon: string;
  published: boolean;
  closed: boolean;
  position: number;
};

export async function createNeed(input: NeedInput) {
  const id = randomUUID();
  const slug = await uniqueSlug(input.title);

  await sql()`
    INSERT INTO needs (id, slug, title, summary, detail, area, part_id, cost_cents,
                       estimated_cents, note, icon, published, closed, position)
    VALUES (${id}, ${slug}, ${input.title}, ${input.summary}, ${input.detail},
            ${input.area}, ${input.partId}, ${input.costCents},
            ${input.estimatedCents}, ${input.note}, ${input.icon},
            ${input.published}, ${input.closed}, ${input.position})
  `;

  return { id, slug };
}

export async function updateNeed(id: string, input: NeedInput) {
  const existing = await getNeedById(id);
  if (!existing) throw new Error("That need no longer exists.");

  /*
    A need's cost cannot drop below what has already been claimed against it.
    Letting it would leave a page reading "$1,200 of $1,000" and, worse, would
    quietly tell three churches their money went somewhere it did not.
  */
  const claimed = existing.ledger.receivedCents + existing.ledger.promisedCents;
  if (input.costCents < claimed) {
    throw new Error(
      "The cost cannot be less than what has already been claimed against it. Withdraw a claim first.",
    );
  }

  // The slug is the need's public address. It only moves if the title does.
  const slug =
    existing.title === input.title
      ? existing.slug
      : await uniqueSlug(input.title, id);

  await sql()`
    UPDATE needs SET
      slug = ${slug}, title = ${input.title}, summary = ${input.summary},
      detail = ${input.detail}, area = ${input.area}, part_id = ${input.partId},
      cost_cents = ${input.costCents},
      estimated_cents = ${input.estimatedCents}, note = ${input.note},
      icon = ${input.icon},
      published = ${input.published}, closed = ${input.closed}, position = ${input.position}
    WHERE id = ${id}
  `;

  return { id, slug, previousSlug: existing.slug };
}

/* ------------------------------------------------------- parts of a project */

export type PartInput = {
  area: string;
  title: string;
  summary: string;
  sequence: number;
};

export async function getPartById(id: string): Promise<NeedPart | null> {
  const rows = await sql()`SELECT * FROM need_parts WHERE id = ${id}`;
  return rows[0] ? toPart(rows[0]) : null;
}

export async function createPart(input: PartInput) {
  const id = randomUUID();

  await sql()`
    INSERT INTO need_parts (id, area, title, summary, sequence)
    VALUES (${id}, ${input.area}, ${input.title}, ${input.summary}, ${input.sequence})
  `;

  return id;
}

/**
 * Moving a part — including, sometimes, to a different project.
 *
 * When the project changes, its items go with it. They have to: the area on an
 * item is what every other query groups by, and a "walls up" part filed under
 * the academy whose cement is still filed under the kitchen would appear in one
 * list with no items and another with items and no heading. One statement, so
 * the two cannot end up half-moved.
 */
export async function updatePart(id: string, input: PartInput) {
  await sql()`
    UPDATE need_parts SET
      area = ${input.area}, title = ${input.title},
      summary = ${input.summary}, sequence = ${input.sequence}
    WHERE id = ${id}
  `;

  await sql()`UPDATE needs SET area = ${input.area} WHERE part_id = ${id}`;
}

/**
 * Deleting a part, whatever is claimed against its items.
 *
 * Unlike deleting a need, this is always allowed, because it destroys nothing:
 * the column is ON DELETE SET NULL, so the items come loose and go on sitting
 * under the project with their ledgers intact. Returns how many were let go, so
 * /app can say what just happened rather than leaving Simon to notice.
 */
export async function deletePart(id: string) {
  const rows = await sql()`SELECT id FROM needs WHERE part_id = ${id}`;
  await sql()`DELETE FROM need_parts WHERE id = ${id}`;
  return rows.length;
}

export async function deleteNeed(id: string) {
  /*
    Only ever while nothing is claimed against it. Once a church has put money
    towards something, the record of that is not ours to throw away — close the
    need instead, which keeps the page and its ledger and simply stops asking.
  */
  const rows = await sql()`
    DELETE FROM needs n
    WHERE n.id = ${id}
      AND NOT EXISTS (
        SELECT 1 FROM pledges p WHERE p.need_id = n.id AND p.status <> 'declined'
      )
    RETURNING n.slug
  `;

  if (rows.length === 0) {
    throw new Error(
      "That need has money claimed against it. Close it instead of deleting it.",
    );
  }

  return str(rows[0].slug);
}

export type ClaimResult =
  | { ok: true; pledgeId: string }
  | { ok: false; reason: "gone" | "too-much" };

/**
 * One partner claiming part of one need.
 *
 * The check that the amount still fits is inside the INSERT rather than in a
 * SELECT before it, because a read followed by a write is two moments and the
 * balance can change between them. As one statement, Postgres evaluates the
 * balance and writes the row together: if the need has filled up in the seconds
 * since the page was rendered, no row is inserted and the giver is told the
 * balance moved instead of being silently over-committed.
 *
 * (At READ COMMITTED two claims landing in the same millisecond could still
 * both see the older balance. For a ministry taking a handful of gifts a month
 * that window is not worth a transaction the Neon HTTP driver cannot open, and
 * an over-claim shows up in /app as a need past 100% for Simon to sort out.)
 */
export async function claimNeed(input: {
  needId: string;
  partnerId: string;
  amountCents: number;
  message: string;
}): Promise<ClaimResult> {
  const pledgeId = randomUUID();

  const rows = await sql()`
    INSERT INTO pledges (id, need_id, partner_id, amount_cents, message, status)
    SELECT ${pledgeId}::text, n.id, ${input.partnerId}::text,
           ${input.amountCents}::int, ${input.message}::text, 'pending'
    FROM needs n
    WHERE n.id = ${input.needId}
      AND n.published
      AND NOT n.closed
      AND ${input.amountCents}::int <= n.cost_cents - COALESCE((
            SELECT SUM(p.amount_cents)
            FROM pledges p
            WHERE p.need_id = n.id AND p.status <> 'declined'
          ), 0)
    RETURNING id
  `;

  if (rows.length === 0) {
    // Either the need went away/closed, or somebody got there first. Which of
    // the two decides what the form says next, so ask.
    const need = await sql()`
      SELECT 1 FROM needs WHERE id = ${input.needId} AND published AND NOT closed
    `;
    return { ok: false, reason: need.length > 0 ? "too-much" : "gone" };
  }

  return { ok: true, pledgeId };
}

/**
 * The same claim, written by Simon in /app rather than by a giver on the site.
 *
 * It keeps the balance check and drops the two gates around it, and the
 * difference is worth being explicit about, because dropping a check that
 * protects a public endpoint is not a thing to do quietly.
 *
 *   the balance   kept. Recording $900 against an $850 water tank produces a
 *                 page reading "$900 of $850" whoever typed it, and a partner
 *                 credited with money the item could not hold. Nobody should be
 *                 able to do that, including Simon, including by accident.
 *   published     dropped. That gate is there so a draft need — one Simon is
 *                 halfway through writing, with a placeholder cost — cannot be
 *                 claimed by a stranger who guessed its address. He is not a
 *                 stranger, and a church may well have promised money towards
 *                 something before it went up on the site.
 *   closed        dropped, and this is the one that matters. A closed need is
 *                 finished work; money for finished work is exactly what
 *                 arrives late, and what arrived years before this ledger
 *                 existed. Refusing it would leave the ministry's largest gifts
 *                 as the only ones it could not write down.
 *
 * Callers are already behind `requireUser`. This function is not, and cannot
 * be — it is a query, not an endpoint — so it must never be reached from
 * anything a visitor can post to.
 */
export async function recordNeedPledge(input: {
  needId: string;
  partnerId: string;
  amountCents: number;
  message: string;
}): Promise<ClaimResult> {
  const pledgeId = randomUUID();

  const rows = await sql()`
    INSERT INTO pledges (id, need_id, partner_id, amount_cents, message, status)
    SELECT ${pledgeId}::text, n.id, ${input.partnerId}::text,
           ${input.amountCents}::int, ${input.message}::text, 'pending'
    FROM needs n
    WHERE n.id = ${input.needId}
      AND ${input.amountCents}::int <= n.cost_cents - COALESCE((
            SELECT SUM(p.amount_cents)
            FROM pledges p
            WHERE p.need_id = n.id AND p.status <> 'declined'
          ), 0)
    RETURNING id
  `;

  if (rows.length === 0) {
    const need = await sql()`SELECT 1 FROM needs WHERE id = ${input.needId}`;
    return { ok: false, reason: need.length > 0 ? "too-much" : "gone" };
  }

  return { ok: true, pledgeId };
}

/**
 * A gift towards something the giver described themselves.
 *
 * No balance to check, because there is no cost to check it against: nothing
 * here can be over-claimed, so this is a plain insert where claimNeed has to be
 * a conditional one. It lands in 'pending' like every other claim and is
 * reconciled the same way — the only difference between the two rows in the end
 * is which column carries what the money was for.
 */
export async function recordGeneralPledge(input: {
  partnerId: string;
  amountCents: number;
  designation: string;
  /** Where it can be told from the words — see `areaForDesignation`. */
  area?: NeedArea | null;
  message: string;
}) {
  const pledgeId = randomUUID();

  await sql()`
    INSERT INTO pledges (id, need_id, partner_id, amount_cents, designation, area, message, status)
    VALUES (${pledgeId}, NULL, ${input.partnerId}, ${input.amountCents},
            ${input.designation}, ${input.area ?? null}, ${input.message}, 'pending')
  `;

  return pledgeId;
}

/** Returns the slug of the need this claim was against, or "" if it was not against one. */
export async function setPledgeStatus(pledgeId: string, status: PledgeStatus) {
  const rows = await sql()`
    UPDATE pledges SET
      status = ${status},
      decided_at = now(),
      received_at = CASE WHEN ${status} = 'received' THEN now() ELSE NULL END
    WHERE id = ${pledgeId}
    RETURNING need_id
  `;

  if (rows.length === 0) throw new Error("That claim no longer exists.");
  if (!rows[0].need_id) return "";

  const slug = await sql()`SELECT slug FROM needs WHERE id = ${rows[0].need_id}`;
  return str(slug[0]?.slug);
}

export async function createNeedUpdate(input: {
  needId: string;
  body: string;
  photo: string;
  photoAlt: string;
  userId: string;
}) {
  const id = randomUUID();

  await sql()`
    INSERT INTO need_updates (id, need_id, body, photo, photo_alt, created_by)
    VALUES (${id}, ${input.needId}, ${input.body}, ${input.photo},
            ${input.photoAlt}, ${input.userId})
  `;

  return id;
}

/**
 * Hangs a photo on an update that already exists.
 *
 * Separate from createNeedUpdate because the photo is named after the update's
 * id, which does not exist until the row does. The order matters: a row with no
 * photo is an update somebody can still read, whereas a file named for a row
 * that was never written is litter nothing will ever clean up.
 */
export async function attachUpdatePhoto(id: string, src: string) {
  await sql()`UPDATE need_updates SET photo = ${src} WHERE id = ${id}`;
}

export async function deleteNeedUpdate(id: string) {
  const rows = await sql()`
    DELETE FROM need_updates WHERE id = ${id} RETURNING photo, need_id
  `;
  return rows[0] ? { photo: str(rows[0].photo), needId: str(rows[0].need_id) } : null;
}

export async function slugOfNeed(needId: string) {
  const rows = await sql()`SELECT slug FROM needs WHERE id = ${needId}`;
  return str(rows[0]?.slug);
}
