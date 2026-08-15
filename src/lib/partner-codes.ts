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
 *   one live code   The row is keyed on the address that asked, so asking again
 *                   replaces what was there. Codes never accumulate.
 *   five tries      Then the code is burned and they start again from the email.
 *   fifteen minutes After which it is gone whether or not anybody touched it.
 *
 * ## Why the address and not the partner
 *
 * It used to be one row per partner, which was the same thing back when a
 * partner was one address. It is not any more: Simon can add other people to a
 * church's giving — see lib/partner-readers.ts — and two of them asking for a
 * code within a quarter of an hour would each have silently overwritten the
 * other's, leaving one person typing digits that had already been replaced by
 * digits sent to somebody else's inbox.
 *
 * So the row is the request, not the account. Who it opens is a column.
 *
 * ## What is stored
 *
 * Not the code — an HMAC of it under `APP_SESSION_SECRET`, which the partner
 * area already requires. Six digits is a keyspace a laptop exhausts instantly,
 * so a plain hash in a stolen dump would be a plain code; keyed with a secret
 * that is not in the database, the dump is worth nothing on its own. Both the
 * address it was sent to and the partner it opens go into the same digest, so a
 * code is only ever valid for the person it was sent to, reading the giving it
 * was issued against.
 */

const DIGITS = 6;
const LIFETIME_MINUTES = 15;
const MAX_ATTEMPTS = 5;

/** How long a code lasts, in words, for the pages and emails that say so. */
export const CODE_LIFETIME = `${LIFETIME_MINUTES} minutes`;
export const CODE_LENGTH = DIGITS;

function digest(email: string, partnerId: string, code: string) {
  const key = process.env.APP_SESSION_SECRET;
  if (!key) throw new Error("APP_SESSION_SECRET is not set.");

  return createHmac("sha256", key)
    .update(`partner-code:${email}:${partnerId}:${code}`)
    .digest("hex");
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
    /*
      The old shape — one row per partner — cannot be widened into this one,
      because its rows have no address to key on. So it is dropped rather than
      migrated, and nothing is lost worth naming: every row in it is a code that
      expires in a quarter of an hour, and the entire cost is that whoever was
      mid-sign-in at the moment of the deploy asks for another one.

      Guarded on the column rather than run every time, and that guard is the
      point of the two statements. This runs once per process and there are
      several processes; an unconditional DROP would mean a cold instance
      throwing away the code a warm one issued a second ago, for ever. Once the
      column exists nobody drops anything again.
    */
    const migrated = await sql()`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'partner_codes'
        AND column_name = 'email'
    `;

    if (migrated.length === 0) {
      await sql()`DROP TABLE IF EXISTS partner_codes`;
    }

    await sql()`
      CREATE TABLE IF NOT EXISTS partner_codes (
        email      TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
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
 * A fresh code for one address, replacing whatever that address had.
 *
 * `partnerId` is whose giving it will open — the address's own, when a partner
 * asks for it, and the partner they were added to when a reader does. It is
 * written down here rather than worked out again at the door so that a code
 * cannot change what it opens between being sent and being typed.
 *
 * `randomInt` and not `Math.random()`: this is a credential, and the difference
 * between a CSPRNG and a PRNG seeded from the clock is the difference between
 * guessing one in a million and guessing when somebody asked.
 */
export async function issueCode(email: string, partnerId: string): Promise<string> {
  await ensureTable();

  const code = String(randomInt(0, 10 ** DIGITS)).padStart(DIGITS, "0");

  await sql()`
    INSERT INTO partner_codes (email, partner_id, code_hash, expires_at, attempts)
    VALUES (${email}, ${partnerId}, ${digest(email, partnerId, code)},
            now() + ${`${LIFETIME_MINUTES} minutes`}::interval, 0)
    ON CONFLICT (email) DO UPDATE SET
      partner_id = EXCLUDED.partner_id,
      code_hash  = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      attempts   = 0,
      created_at = now()
  `;

  /*
    Housekeeping on the write path rather than on a timer. Rows are keyed on the
    address and deleted the moment one is used, so the only ones that linger
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
export async function claimCode(
  email: string,
  partnerId: string,
  code: string,
): Promise<boolean> {
  const typed = code.replace(/\D/g, "");
  if (typed.length !== DIGITS) return false;

  await ensureTable();

  /*
    `partner_id` is in the condition as well as the digest. The caller has just
    worked out, from the ledger as it stands *now*, whose giving this address
    may read; a code issued against a different answer — a reader Simon has
    since moved, or removed and added elsewhere — is not the code for this
    sign-in, and must miss rather than quietly open the old dashboard.
  */
  const live = await sql()`
    SELECT code_hash FROM partner_codes
    WHERE email = ${email} AND partner_id = ${partnerId}
      AND expires_at > now() AND attempts < ${MAX_ATTEMPTS}
  `;

  const stored = live[0]?.code_hash;
  if (typeof stored !== "string" || !sameDigest(stored, digest(email, partnerId, typed))) {
    /*
      Counted against the code rather than the caller, and the code is burned
      once the count is up. Somebody guessing has to go back to the giver's inbox
      for a new one every five tries, which is a door they do not have.
    */
    await sql()`
      UPDATE partner_codes SET attempts = attempts + 1 WHERE email = ${email}
    `;
    await sql()`
      DELETE FROM partner_codes
      WHERE email = ${email} AND attempts >= ${MAX_ATTEMPTS}
    `;
    return false;
  }

  const claimed = await sql()`
    DELETE FROM partner_codes
    WHERE email = ${email} AND code_hash = ${stored} AND expires_at > now()
    RETURNING email
  `;

  return claimed.length > 0;
}

/**
 * Throws away the live code for one address.
 *
 * Used on the way out of a shared machine, and when Simon takes a reader off a
 * partner — a code sitting in an inbox is fifteen minutes of access that outlives
 * the permission it was granted under, and closing it is one statement.
 */
export async function forgetCode(email: string) {
  try {
    await sql()`DELETE FROM partner_codes WHERE email = ${email}`;
  } catch {
    // Housekeeping. Never worth failing a sign-out over.
  }
}
