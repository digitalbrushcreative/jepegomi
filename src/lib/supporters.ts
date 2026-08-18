import { randomUUID } from "node:crypto";
import { toIso } from "@/lib/dates";
import { isDatabaseConfigured, sql } from "@/lib/db";
import { hasSessionSecret, session } from "@/lib/session";

/**
 * A supporter — somebody who has proved an email address and nothing else.
 *
 * ## Why this exists at all
 *
 * The figures on this site used to be public: every costed item with its price
 * on it, every project's budget, what has arrived and what is still short. That
 * was the point of the giving pages and it is still the point of them — but
 * printing the ministry's prices on the open web means printing them for
 * everybody, including a reader with no interest in giving who now knows what
 * this ministry can be bought for. See lib/disclosure.ts for the same argument
 * made a year earlier about the reconciliation letter; this is that argument
 * finishing its journey out to the rest of the numbers.
 *
 * So the figures moved behind a door. Which immediately broke, because the only
 * door the site had was the partner door, and that one opens exclusively to an
 * address already in the ledger (see lib/partner-codes.ts). A first-time visitor
 * asked to "sign in to see what this costs" had no way to sign in and no way to
 * give, because giving starts with reading a price. A gate nobody can pass is a
 * wall.
 *
 * A supporter is the person on the other side of that. They type an address,
 * they prove they can read its inbox, and the site shows them what things cost.
 *
 * ## What this is not
 *
 * It is not security, and pretending otherwise would be the dangerous mistake
 * here. Anybody with an email address can become a supporter in ninety seconds,
 * so nothing genuinely private may sit behind this rung — not a partner's
 * giving, not a project's reconciliation, not the tiers in lib/disclosure.ts.
 * Those are earned by money that arrived, and they stay earned by money that
 * arrived. All this rung does is stop the ministry's prices being *scraped* and
 * *skimmed*: a person who wants them signs their name in the book first.
 *
 * What it buys, in exchange for that friction:
 *
 *   for the reader   The figures, and a session that remembers them for a month
 *                    so the asking happens once.
 *   for the ministry An address, confirmed, belonging to somebody who went to
 *                    the trouble of asking what a thing costs. That is a warmer
 *                    list than any newsletter box on this site has ever had.
 *
 * ## Confirmed, and merely asked for
 *
 * A row is written when somebody *requests* a code, because the code has to be
 * issued against something. That means this table can be written to by typing
 * addresses into a form — rate-limited (see lib/rate-limit.ts) but not
 * prevented, and lib/partners.ts refuses to mint partner rows that way for
 * exactly this reason.
 *
 * The answer is not to refuse the row but to be honest about what it is.
 * `confirmed_at` is set only when a code is actually spent, so an unconfirmed
 * row is a request and a confirmed one is a person. Simon's list in /app shows
 * the difference rather than averaging over it, and nothing is ever revealed on
 * the strength of an unconfirmed row — the session is started by the claim, not
 * by the request.
 *
 * ## Why a row and not the address in the cookie
 *
 * The same reason the partner cookie carries an id: an address in a cookie is an
 * address in every log, proxy and error report the response passes on its way
 * out. The id is enough to look the rest up. See lib/partners.ts.
 */

const supporterSession = session("supporter", "jepegomi_supporter");

/**
 * The third rung, and the weakest — somebody who typed their name into the
 * giving form and has proved nothing at all.
 *
 * ## Why there is a rung below "supporter"
 *
 * A supporter proved they can read an inbox. That is not much, and it is not
 * nothing, and it is more than a giver in the middle of giving can be asked for:
 * the only way to prove an address is to send a code to it, and a form that
 * stops halfway through to send somebody to their email is a form a good number
 * of people never come back to. The gift is worth more than the proof.
 *
 * So the giving form asks who is giving — which it has always asked, just later
 * on — and takes the answer on trust. That opens the figures a giver actually
 * needs, and nothing else.
 *
 * ## What it does not open
 *
 * The site. `figuresRevealed` in lib/reveal.ts does not consult this session and
 * must never be made to: every price on /needs and the project pages stays shut
 * to somebody who has only typed a name. What this opens is one figure, for the
 * item they have selected, inside the form that asked — see `figureForAction` in
 * (site)/give/actions.ts.
 *
 * That narrowness is the entire security argument, because the details behind it
 * are unverifiable and a script can produce as many as it likes. A rung that
 * unlocked the list would be a rung that let anybody read the ledger by filling
 * in a form; a rung that unlocks one row at a time, rate-limited, is a turnstile
 * that costs a scraper more than it costs an honest giver.
 *
 * Its own cookie rather than a flag on the supporter one, for the reason
 * lib/session.ts gives about scopes: two levels of access sharing a cookie is
 * one relaxed condition away from being the same level.
 */
const askingSession = session("asking", "jepegomi_asking");

/**
 * How an address came to be on this list.
 *
 * `code` asked to see the figures at /partners; `giving` typed their details
 * into the giving form. Kept apart rather than flattened into "unconfirmed",
 * because they are not the same person to Simon: somebody who filled in a giving
 * form and stopped is a warmer name than somebody who asked for a code and never
 * opened the email, and a list that could not tell them apart would be a list
 * nobody could act on.
 */
export type SupporterSource = "code" | "giving";

export type Supporter = {
  id: string;
  email: string;
  /** Set the first time a code issued to this address was actually spent. */
  confirmed: boolean;
  source: SupporterSource;
  createdAt: string;
  confirmedAt: string | null;
};

type Row = Record<string, unknown>;

const str = (value: unknown) => String(value ?? "");

function toSupporter(row: Row): Supporter {
  return {
    id: str(row.id),
    email: str(row.email),
    confirmed: Boolean(row.confirmed_at),
    source: str(row.source) === "giving" ? "giving" : "code",
    createdAt: toIso(row.created_at),
    confirmedAt: row.confirmed_at ? toIso(row.confirmed_at) : null,
  };
}

/*
  Created here rather than in `ensureSchema`, for the reason partner_codes gives
  at length: this table is reached by a stranger asking for a code, and that path
  cannot afford two dozen statements including a view rebuild. One guarded
  CREATE beats all of it.
*/
let tableReady: Promise<void> | null = null;

function ensureTable() {
  tableReady ??= (async () => {
    await sql()`
      CREATE TABLE IF NOT EXISTS supporters (
        id           TEXT PRIMARY KEY,
        email        TEXT NOT NULL UNIQUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        confirmed_at TIMESTAMPTZ
      )
    `;

    /*
      Added rather than built in, so a database that already holds this table
      keeps its rows. Everything already in it arrived by asking for a code,
      which is what the default says.
    */
    await sql()`
      ALTER TABLE supporters
      ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'code'
    `;
  })().catch((error) => {
    // Let the next caller retry rather than caching the failure for the life of
    // the process.
    tableReady = null;
    throw error;
  });

  return tableReady;
}

export function isSupporterAreaConfigured() {
  return hasSessionSecret() && isDatabaseConfigured();
}

/* --------------------------------------------------------------- the door */

/**
 * The supporter row for an address, minted if this is the first time we have
 * seen it.
 *
 * Called only after lib/partners.ts has established that the address opens no
 * giving — a partner or a reader is a bigger thing than a supporter and must
 * never be quietly demoted to one. That ordering lives at the single call site
 * so it cannot be got wrong twice.
 */
export async function findOrCreateSupporter(
  email: string,
  source: SupporterSource = "code",
): Promise<Supporter> {
  await ensureTable();
  const address = email.trim().toLowerCase();

  /*
    `source` is written once and never overwritten. It records how we first met
    somebody, and the first meeting is the one worth keeping: an address that
    asked for a code in March and filled in a giving form in June is still an
    address that came looking for the figures, and flipping the label on the
    later visit would quietly rewrite that.
  */
  const rows = await sql()`
    INSERT INTO supporters (id, email, source)
    VALUES (${randomUUID()}, ${address}, ${source})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id, email, source, created_at, confirmed_at
  `;
  return toSupporter(rows[0]);
}

/* ------------------------------------------------------------ the third rung */

/**
 * Remembers that somebody said who they were in the giving form.
 *
 * Deliberately not `signInSupporter`: nothing has been confirmed, so
 * `confirmed_at` stays null and the site stays shut. All this buys is the right
 * to ask what one selected item costs, for as long as the cookie lasts.
 */
export async function startAsking(id: string) {
  await askingSession.start(id);
}

/**
 * The supporter who is part-way through the giving form, or null.
 *
 * Read only by the action that hands back a single figure. Nothing else may call
 * it — and in particular `figuresRevealed` may not, which is said here as well
 * as at the top of this file because it is the one line holding the three tiers
 * apart.
 */
export async function currentAsking(): Promise<Supporter | null> {
  if (!isSupporterAreaConfigured()) return null;

  const id = await askingSession.read();
  if (!id) return null;

  try {
    await ensureTable();
    const rows = await sql()`
      SELECT id, email, source, created_at, confirmed_at
      FROM supporters WHERE id = ${id}
    `;
    return rows[0] ? toSupporter(rows[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Marks an address as belonging to somebody real, and starts their session.
 *
 * The two happen together on purpose. `confirmed_at` means "a code sent here was
 * typed back", which is the same event as "this session may begin" — splitting
 * them would leave room for a list that counts people who never arrived.
 */
export async function signInSupporter(id: string) {
  await sql()`
    UPDATE supporters SET confirmed_at = COALESCE(confirmed_at, now())
    WHERE id = ${id}
  `;
  await supporterSession.start(id);
}

export async function signOutSupporter() {
  await supporterSession.clear();
  /*
    The weaker cookie goes too. Somebody signing out on a shared machine means
    all of it, and leaving the rung that opens figures standing would be a
    sign-out that looked complete and was not.
  */
  await askingSession.clear();
}

/**
 * The signed-in supporter, or null.
 *
 * Re-read from the table on every load rather than trusted from the cookie, the
 * same way a partner is: a row Simon has deleted has to close the figures on the
 * next page load and not in thirty days when the cookie expires.
 */
export async function currentSupporter(): Promise<Supporter | null> {
  if (!isSupporterAreaConfigured()) return null;

  const id = await supporterSession.read();
  if (!id) return null;

  try {
    await ensureTable();
    const rows = await sql()`
      SELECT id, email, source, created_at, confirmed_at FROM supporters WHERE id = ${id}
    `;
    return rows[0] ? toSupporter(rows[0]) : null;
  } catch {
    /*
      A database the site cannot reach means the figures stay hidden, which is
      the same answer a signed-out visitor gets. Nothing is ever revealed by
      failing to read a row — see the matching note in lib/session.ts.
    */
    return null;
  }
}

/* -------------------------------------------------------------- from /app */

/**
 * Everybody who has asked to see the figures, newest first.
 *
 * Unconfirmed rows are returned alongside confirmed ones rather than filtered
 * out here, because the page that shows them says which is which — and a run of
 * unconfirmed rows from one afternoon is the shape of somebody typing other
 * people's addresses into the form, which is worth being able to see.
 */
export async function listSupporters(): Promise<Supporter[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    await ensureTable();
    const rows = await sql()`
      SELECT id, email, source, created_at, confirmed_at FROM supporters
      ORDER BY confirmed_at DESC NULLS LAST, created_at DESC
    `;
    return rows.map(toSupporter);
  } catch {
    return [];
  }
}

export async function removeSupporter(id: string) {
  await sql()`DELETE FROM supporters WHERE id = ${id}`;
}
