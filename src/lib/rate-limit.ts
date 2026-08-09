import { headers } from "next/headers";
import { isDatabaseConfigured, sql } from "@/lib/db";

/**
 * How often one caller may do a thing.
 *
 * Every public endpoint on this site is a server action, and a server action is
 * reachable by anybody who can spell its id — the form in front of it is a
 * courtesy to people, not a gate. Two kinds of endpoint here care:
 *
 *   the two sign-ins   /app and /partners both check a password against a hash.
 *                      Without a limit, an attacker with a list of partner
 *                      email addresses gets unlimited guesses at passwords that
 *                      Simon issues by hand and a church writes on a sticky
 *                      note. That is the single most attackable thing the site
 *                      now has, and it got that way the moment partner links
 *                      started going out.
 *   the four forms     contact, enrolment, "send me the details", and giving.
 *                      All of them end in mail leaving the ministry's domain.
 *                      The honeypot in lib/forms.ts stops the drive-by scripts;
 *                      it does nothing at all about somebody who has looked at
 *                      the page once, and the bill for that is the sending
 *                      reputation every other message shares.
 *
 * ## Why the counter is in Postgres
 *
 * The obvious implementation is a Map in module scope, and on this host it is
 * worth almost nothing: the site runs as serverless functions, so there are
 * several processes at any moment and each one starts empty. An attacker gets
 * the limit *per instance*, and gets a fresh allowance every time the platform
 * scales up or recycles. A row in the database is the only counter every
 * instance can see, and the database is already required by both sign-ins.
 *
 * ## Why it fails open
 *
 * If the count cannot be read, the caller is allowed through. That is the same
 * rule the rest of this codebase follows — see the note at the top of lib/db.ts:
 * a database outage degrades the CMS and never the public site. A contact form
 * that refuses everybody because Neon was asleep for four seconds is a worse
 * failure than the burst of spam it would have prevented, and the sign-ins
 * cannot be opened up by failing open anyway: they need the same database to
 * find a password hash at all.
 */

/* ------------------------------------------------------------------ shapes */

export type Rate = {
  /** How many are allowed inside one window. */
  limit: number;
  /** How long the window is. */
  windowSeconds: number;
};

export type RateVerdict = {
  ok: boolean;
  /** Roughly how long until they may try again. Zero when `ok`. */
  retryAfterSeconds: number;
};

const ALLOWED: RateVerdict = { ok: true, retryAfterSeconds: 0 };

/*
  The limits, in one place so they can be read against each other rather than
  found one at a time in six files.

  Sign-ins are deliberately tight and forgiving in different directions. Eight
  attempts per address per quarter of an hour is far more than a person who
  knows their password needs and far less than a guessing run needs, and a
  success clears the counter outright — so the only account anybody can lock out
  by hammering it is one they were already failing to get into, and only for
  fifteen minutes. The per-IP figure sits above it to catch the same attacker
  walking a list of addresses.

  The forms are looser, and giving is the loosest of all on purpose. A false
  positive on the contact form costs one message somebody can send again. On the
  giving form it costs a gift — which is exactly the reasoning that already
  turned the two-second timing trap off there; see `looksAutomated`.
*/
export const RATES = {
  signIn: { limit: 8, windowSeconds: 15 * 60 },
  signInByIp: { limit: 30, windowSeconds: 15 * 60 },
  contactForm: { limit: 5, windowSeconds: 10 * 60 },
  givingForm: { limit: 15, windowSeconds: 60 * 60 },
  /*
    Asking for a sign-in code. Tighter than the sign-ins, and limiting something
    different: nothing is being *guessed* here, so this is not about an attacker
    getting in. It is about the two things the request itself can be used for.

    Somebody who can ask freely can send a giver an email every second — from
    the ministry, about their giving, which is worse than ordinary spam because
    it looks exactly like the ministry doing it, and it is the ministry's own
    sending reputation that pays for it. The per-caller figure alongside is for
    the other shape of the same abuse: one machine walking a list of church
    addresses to see which of them this site will send to.

    Three an hour per address is more than anybody who mislaid a code needs, and
    the wording is the same for an address that gives here and one that does not,
    so hitting the limit tells a stranger nothing either.

    Guessing at a code is not limited here at all, on purpose: those tries are
    counted on the code's own row in lib/partner-codes.ts, where they cannot
    fail open the way this counter deliberately does.
  */
  codeRequest: { limit: 3, windowSeconds: 60 * 60 },
  codeRequestByIp: { limit: 20, windowSeconds: 60 * 60 },
} as const satisfies Record<string, Rate>;

/* ------------------------------------------------------------- the caller */

/**
 * Who is asking, as well as we can tell.
 *
 * Behind Vercel, `x-forwarded-for` is rewritten by the proxy and its first
 * entry is the real client — a header the caller sets themselves is overwritten
 * before it reaches this code. That is *not* true of a plain Node server with
 * nothing in front of it, where the whole header is attacker-supplied, so this
 * is never the only thing standing between an attacker and an account: both
 * sign-ins key on the email address as well, and that one cannot be spoofed
 * away because it is the thing being attacked.
 *
 * Returns "unknown" rather than throwing when there is no header at all, which
 * groups every such caller into one bucket. On a host that always sets it, that
 * bucket stays empty; on one that does not, everybody shares a limit, which is
 * the safe direction to be wrong in.
 */
export async function callerKey(): Promise<string> {
  try {
    const store = await headers();

    const forwarded = store.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }

    return store.get("x-real-ip")?.trim() || "unknown";
  } catch {
    // Called outside a request. Nothing to identify, so everybody is the same.
    return "unknown";
  }
}

/* ------------------------------------------------------------ the counter */

/*
  The one table this file owns, created here rather than in `ensureSchema`.

  That is a deliberate exception to the rule that the schema lives in one place.
  `ensureSchema` is two dozen statements including a DROP and CREATE of
  `pledge_detail`, and it is memoised per process — so calling it from a public
  form post would put all of that on the critical path of a cold start, and
  would briefly drop a view other requests are reading from. This is one
  statement, and the paths that need it are the ones a stranger reaches.

  See the pointer in lib/db.ts, which is where somebody will go looking.
*/
let tableReady: Promise<void> | null = null;

function ensureTable() {
  tableReady ??= (async () => {
    await sql()`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key          TEXT PRIMARY KEY,
        count        INTEGER NOT NULL DEFAULT 0,
        window_start TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  })().catch((error) => {
    // Let the next caller try again rather than caching the failure for the
    // life of the process — a database that was asleep should not disable the
    // limiter until the instance is recycled.
    tableReady = null;
    throw error;
  });

  return tableReady;
}

/*
  Rows are only ever read by key, so they would pile up for ever without this.
  A sweep runs at most once an hour per process and deletes anything whose
  window closed a day ago — cheap, unindexed-scan-on-a-tiny-table cheap, and it
  costs nothing to be late.
*/
let sweptAt = 0;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

async function sweep() {
  if (Date.now() - sweptAt < SWEEP_INTERVAL_MS) return;
  sweptAt = Date.now();

  try {
    await sql()`
      DELETE FROM rate_limits WHERE window_start < now() - INTERVAL '1 day'
    `;
  } catch {
    // Housekeeping. Never worth failing a request over.
  }
}

/**
 * Counts one attempt against `key`, and says whether it was allowed.
 *
 * The whole decision is one statement, which is what makes it correct under
 * concurrency: two requests arriving together both increment, and the second
 * one sees the first one's count. Doing it as a SELECT and then an UPDATE would
 * let a burst of parallel guesses all read the same number and all pass.
 *
 * The window is fixed rather than sliding — an attacker gets `limit` at the end
 * of one window and `limit` at the start of the next, so twice the limit in a
 * brief moment. Sliding windows exist to close that, and the extra bookkeeping
 * buys nothing at these numbers: sixteen password guesses instead of eight is
 * not the difference between safe and unsafe.
 */
export async function consume(key: string, rate: Rate): Promise<RateVerdict> {
  if (!isDatabaseConfigured()) return ALLOWED;

  try {
    await ensureTable();

    const rows = await sql()`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN EXTRACT(EPOCH FROM (now() - rate_limits.window_start))
               >= ${rate.windowSeconds}::int
          THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN EXTRACT(EPOCH FROM (now() - rate_limits.window_start))
               >= ${rate.windowSeconds}::int
          THEN now()
          ELSE rate_limits.window_start
        END
      RETURNING count,
                EXTRACT(EPOCH FROM (now() - window_start))::int AS elapsed
    `;

    /*
      Not awaited, and outside the decision below rather than inside it. Inside
      it, the housekeeping would only ever run for somebody who had just tripped
      a limit — so a site where nobody ever does would keep every counter row it
      had ever written. It throttles itself to once an hour per process.
    */
    void sweep();

    const row = rows[0];
    if (!row) return ALLOWED;

    const count = Number(row.count ?? 0);
    if (count <= rate.limit) return ALLOWED;

    const elapsed = Number(row.elapsed ?? 0);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, rate.windowSeconds - elapsed),
    };
  } catch (error) {
    console.error("Rate limit: could not count an attempt.", error);
    return ALLOWED;
  }
}

/**
 * Forgets everything counted against `key`.
 *
 * Called on a successful sign-in, and that is what keeps the per-address limit
 * from being a way to lock somebody out: the counter only ever accumulates
 * behind failures, and the moment the real partner gets in it is empty again.
 */
export async function forget(key: string) {
  if (!isDatabaseConfigured()) return;

  try {
    await sql()`DELETE FROM rate_limits WHERE key = ${key}`;
  } catch (error) {
    console.error("Rate limit: could not clear a counter.", error);
  }
}

/**
 * "Try again in about 5 minutes." Said in minutes above a minute, because
 * "try again in 847 seconds" is a sentence nobody has ever wanted to read.
 */
export function retryWording(seconds: number): string {
  if (seconds <= 60) return "in a minute";
  return `in about ${Math.ceil(seconds / 60)} minutes`;
}
