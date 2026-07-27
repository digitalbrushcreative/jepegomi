import { randomUUID } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { toIso } from "@/lib/dates";
import { isDatabaseConfigured, sql } from "@/lib/db";
import type {
  Ledger,
  Need,
  NeedUpdate,
  NeedWithLedger,
  Pledge,
  PledgeStatus,
} from "@/lib/giving";
import { percentOf } from "@/lib/money";

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
    costCents: int(row.cost_cents),
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
    needId: str(row.need_id),
    needSlug: str(row.need_slug),
    needTitle: str(row.need_title),
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
): Promise<(NeedWithLedger & { yoursCents: number; yoursReceivedCents: number })[]> {
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

/** Progress on the needs this partner backed — the reason to come back. */
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
      WHERE p.need_id = n.id
        AND p.partner_id = ${partnerId}
        AND p.status <> 'declined'
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
  area: string;
  costCents: number;
  published: boolean;
  closed: boolean;
  position: number;
};

export async function createNeed(input: NeedInput) {
  const id = randomUUID();
  const slug = await uniqueSlug(input.title);

  await sql()`
    INSERT INTO needs (id, slug, title, summary, detail, area, cost_cents, published, closed, position)
    VALUES (${id}, ${slug}, ${input.title}, ${input.summary}, ${input.detail},
            ${input.area}, ${input.costCents}, ${input.published}, ${input.closed}, ${input.position})
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
      detail = ${input.detail}, area = ${input.area}, cost_cents = ${input.costCents},
      published = ${input.published}, closed = ${input.closed}, position = ${input.position}
    WHERE id = ${id}
  `;

  return { id, slug, previousSlug: existing.slug };
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
