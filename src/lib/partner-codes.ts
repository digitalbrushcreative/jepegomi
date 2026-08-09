import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

/**
 * The six digits a giver types to get into their own dashboard.
 *
 * ## Why a code and not a password
 *
 * The email address *is* the identity in this ledger. `partners.email` is
 * unique, every gift joins to it, and a church that gave three times over two
 * years is one row because all three gifts carried the same address. So the
 * claim somebody makes at the door is "the gifts filed under this address are
 * mine" — and proving control of the address is exactly that claim, proved.
 * A password proves something weaker: that they were told a password once.
 *
 * It also deletes a job. Passwords here are issued by hand, in an email, in
 * plain text, and end up on a sticky note behind somebody's monitor — see
 * `partnerLoginIssued` in lib/mail/messages.ts, which is honest about it. A
 * code that dies in a quarter of an hour has nothing to leak later.
 *
 * ## Why a typed code and not a link
 *
 * A link is one click and no typing, which is better in every way but one:
 * plenty of churches are on hosted mail that follows every link in an incoming
 * message to see where it goes. A single-use link is *used* by the time it
 * reaches the person it was sent to, and the failure looks like the site being
 * broken. Six digits cannot be clicked by a scanner.
 *
 * ## What stops somebody guessing
 *
 * Three things, and the important one is here rather than in lib/rate-limit.ts.
 * That limiter fails *open* when the database cannot be read, which is the right
 * trade for a contact form and the wrong one for a million-guess keyspace. The
 * attempt counter below lives on the code's own row, so it cannot fail open:
 * a request that cannot reach the database cannot look a code up either.
 *
 *   one live code   The row is keyed on the partner, so asking again replaces
 *                   what was there. Codes never accumulate.
 *   five tries      Then the code is burned and they start again from the email.
 *   fifteen minutes After which it is gone whether or not anybody touched it.
 *
 * ## What is stored
 *
 * Not the code — an HMAC of it under `APP_SESSION_SECRET`, which the partner
 * area already requires. Six digits is a keyspace a laptop exhausts instantly,
 * so a plain hash in a stolen dump would be a plain code; keyed with a secret
 * that is not in the database, the dump is worth nothing on its own. The
 * partner's id goes into the same digest, so a code is only ever valid for the
 * person it was sent to.
 */

const DIGITS = 6;
const LIFETIME_MINUTES = 15;
const MAX_ATTEMPTS = 5;

/** How long a code lasts, in words, for the pages and emails that say so. */
export const CODE_LIFETIME = `${LIFETIME_MINUTES} minutes`;
export const CODE_LENGTH = DIGITS;

function digest(partnerId: string, code: string) {
  const key = process.env.APP_SESSION_SECRET;
  if (!key) throw new Error("APP_SESSION_SECRET is not set.");

  return createHmac("sha256", key).update(`partner-code:${partnerId}:${code}`).digest("hex");
}

/**
 * Constant-time compare. Belt and braces over the `code_hash = $2` in the claim
 * below, which Postgres does not promise to do in constant time — the window is
 * theoretical over a network, and the two lines cost nothing.
 */
function sameDigest(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/*
  Its own table, created here rather than in `ensureSchema`.

  Same reasoning as `rate_limits` in lib/rate-limit.ts, and the same exception to
  the rule that the schema lives in one place: `ensureSchema` is two dozen
  statements including a view rebuild, it is only ever called from the /app setup
  path, and this table is reached by a stranger asking for a code at /partners.
  One statement on that path beats all of it.
*/
let tableReady: Promise<void> | null = null;

function ensureTable() {
  tableReady ??= (async () => {
    await sql()`
      CREATE TABLE IF NOT EXISTS partner_codes (
        partner_id TEXT PRIMARY KEY REFERENCES partners(id) ON DELETE CASCADE,
        code_hash  TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts   INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  })().catch((error) => {
    // Let the next caller try again rather than caching the failure for the life
    // of the process.
    tableReady = null;
    throw error;
  });

  return tableReady;
}

/**
 * A fresh code for one partner, replacing whatever they had.
 *
 * `randomInt` and not `Math.random()`: this is a credential, and the difference
 * between a CSPRNG and a PRNG seeded from the clock is the difference between
 * guessing one in a million and guessing when somebody asked.
 */
export async function issueCode(partnerId: string): Promise<string> {
  await ensureTable();

  const code = String(randomInt(0, 10 ** DIGITS)).padStart(DIGITS, "0");

  await sql()`
    INSERT INTO partner_codes (partner_id, code_hash, expires_at, attempts)
    VALUES (${partnerId}, ${digest(partnerId, code)},
            now() + ${`${LIFETIME_MINUTES} minutes`}::interval, 0)
    ON CONFLICT (partner_id) DO UPDATE SET
      code_hash  = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      attempts   = 0,
      created_at = now()
  `;

  /*
    Housekeeping on the write path rather than on a timer. Rows are keyed on the
    partner and deleted the moment one is used, so the only ones that linger
    belong to somebody who asked for a code and never typed it — a handful, at
    most, and this clears them for the price of a statement against a tiny table.
  */
  await sql()`DELETE FROM partner_codes WHERE expires_at < now()`.catch(() => {});

  return code;
}

/**
 * Spends a code, and says whether it was the right one.
 *
 * The claim is a single DELETE … RETURNING, which is what makes it single-use
 * under concurrency: two requests arriving with the same code both try to delete
 * the same row and exactly one of them gets it back. A SELECT-then-DELETE would
 * let both through, and "both" is one legitimate sign-in and one attacker who
 * watched the email go past.
 */
export async function claimCode(partnerId: string, code: string): Promise<boolean> {
  const typed = code.replace(/\D/g, "");
  if (typed.length !== DIGITS) return false;

  await ensureTable();

  const live = await sql()`
    SELECT code_hash FROM partner_codes
    WHERE partner_id = ${partnerId} AND expires_at > now() AND attempts < ${MAX_ATTEMPTS}
  `;

  const stored = live[0]?.code_hash;
  if (typeof stored !== "string" || !sameDigest(stored, digest(partnerId, typed))) {
    /*
      Counted against the code rather than the caller, and the code is burned
      once the count is up. Somebody guessing has to go back to the giver's inbox
      for a new one every five tries, which is a door they do not have.
    */
    await sql()`
      UPDATE partner_codes SET attempts = attempts + 1 WHERE partner_id = ${partnerId}
    `;
    await sql()`
      DELETE FROM partner_codes
      WHERE partner_id = ${partnerId} AND attempts >= ${MAX_ATTEMPTS}
    `;
    return false;
  }

  const claimed = await sql()`
    DELETE FROM partner_codes
    WHERE partner_id = ${partnerId} AND code_hash = ${stored} AND expires_at > now()
    RETURNING partner_id
  `;

  return claimed.length > 0;
}

/** Throws away a partner's live code. Used when they sign out of a shared machine. */
export async function forgetCode(partnerId: string) {
  try {
    await sql()`DELETE FROM partner_codes WHERE partner_id = ${partnerId}`;
  } catch {
    // Housekeeping. Never worth failing a sign-out over.
  }
}
