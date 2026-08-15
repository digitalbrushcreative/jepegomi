import { randomUUID } from "node:crypto";
import { toIso } from "@/lib/dates";
import { isDatabaseConfigured, sql } from "@/lib/db";
import type { Partner, PartnerReader, PartnerWithTotals } from "@/lib/giving";
import { claimCode, forgetCode, issueCode } from "@/lib/partner-codes";
import { getReader, readerByEmail } from "@/lib/partner-readers";
import { hashPassword, verifyPassword } from "@/lib/password";
import { hasSessionSecret, session } from "@/lib/session";

/**
 * Partners — the churches and people who give.
 *
 * A partner arrives by claiming something on the public site, which is why so
 * little is required to become one: at that moment all anybody has typed is a
 * name, an email and an amount. Everything after that is Simon's to add.
 *
 * There are three separate states here and they are deliberately not one flag:
 *
 *   arrived     a row exists. They gave, or claimed something. Nothing is
 *               confirmed, and they can already sign in — with a code emailed
 *               to the address the gift came from — to see that gift and
 *               nothing else.
 *   verified    Simon has satisfied himself this is really that church. This no
 *               longer decides who may *sign in*; it decides how far into the
 *               books they can read once they have. See lib/disclosure.ts.
 *   has a login verified, *and* Simon has issued them a password.
 *
 * ## Why `verified` stopped being the door
 *
 * It used to be: sign-in needed a hand-set password *and* Simon's tick, so
 * every giver who was not a partner church had no way in at all. That made a
 * ledger nobody could read — a person who sent $40 was recorded and then shown
 * nothing, and the only way to be shown anything was to write and ask, and wait
 * for Simon to type a password into a form. The code door in lib/partner-codes.ts
 * replaces that: anybody whose address is in the ledger can prove it is theirs
 * and read their own giving.
 *
 * The tick stayed, because it was always answering a different question. "Is
 * this really Grace Chapel?" is not "may this person see their own gift", and
 * conflating them is what made the ministry's own accounts reachable by picking
 * "Church" out of a dropdown on the public giving form. Now the tick is the only
 * thing that opens the books, and it is set by a person who checked.
 *
 * The password door is kept for the churches already given one — it is a second
 * way in, not a different level of access.
 *
 * ## Who is on the other side of the door
 *
 * Not always the partner. Simon can add other addresses to a church's giving —
 * a treasurer, a missions pastor — and those people come through the same code
 * door to the same page. See lib/partner-readers.ts for why that list is typed
 * in by hand and never inferred.
 *
 * It matters to this file in exactly two places. `resolveSignIn` decides which
 * partner an address opens, and the session remembers which of the two kinds of
 * person is holding it, so the page can say whose giving is on the screen.
 * Nothing else changes: a reader gets the partner's dashboard, at the partner's
 * disclosure tier, read-only, and no gift is ever filed against them.
 */
const partnerSession = session("partner", "jepegomi_partner");

/**
 * What the partner cookie carries.
 *
 * A partner id on its own for the church itself, and `partnerId:readerId` for
 * somebody reading on their behalf. Two values in one cookie rather than two
 * cookies, so there is one thing to sign, one thing to clear, and no way to hold
 * half a session.
 *
 * Joined with a colon and not a dot, because `session.read` splits the cookie on
 * dots to find the expiry and the signature. Not an address, for the same reason
 * and a better one: an address in a cookie is an address in every log and proxy
 * the response passes, and the id is enough to look it up.
 */
function sessionValue(partnerId: string, readerId?: string) {
  return readerId ? `${partnerId}:${readerId}` : partnerId;
}

type Row = Record<string, unknown>;

const str = (value: unknown) => String(value ?? "");

function toPartner(row: Row): Partner {
  return {
    id: str(row.id),
    name: str(row.name),
    kind: str(row.kind),
    location: str(row.location),
    email: str(row.email),
    contactName: str(row.contact_name),
    verified: Boolean(row.verified_at),
    hasLogin: Boolean(row.has_login),
    note: str(row.note),
    createdAt: toIso(row.created_at),
  };
}

/*
  Every query below selects `password_hash IS NOT NULL` rather than the hash
  itself. Nothing outside this file has a use for the hash, and one that is
  never loaded is one that cannot be logged, serialised into an RSC payload, or
  handed to a component by a later edit that meant no harm. The single place
  that needs it reads it inside signInPartner and lets it go out of scope in the
  same function.
*/

export function isPartnerAreaConfigured() {
  return hasSessionSecret() && isDatabaseConfigured();
}

/* --------------------------------------------------------------- the door */

/**
 * A partner by email, created if this is the first time we have seen them.
 *
 * Claiming twice from the same address is the same church coming back, not a
 * second one, so this joins them to the row they already have — which is what
 * makes a dashboard possible for a church that has given three times over two
 * years. Details are filled in where they are blank and never overwritten:
 * whatever Simon has since corrected in /app outranks whatever somebody typed
 * into a form at midnight.
 */
export async function findOrCreatePartner(input: {
  name: string;
  email: string;
  kind: string;
  location: string;
  contactName: string;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const id = randomUUID();

  const rows = await sql()`
    INSERT INTO partners (id, name, kind, location, email, contact_name)
    VALUES (${id}, ${input.name.trim()}, ${input.kind}, ${input.location.trim()},
            ${email}, ${input.contactName.trim()})
    ON CONFLICT (email) DO UPDATE SET
      location     = CASE WHEN partners.location = ''     THEN EXCLUDED.location     ELSE partners.location END,
      contact_name = CASE WHEN partners.contact_name = '' THEN EXCLUDED.contact_name ELSE partners.contact_name END
    RETURNING id
  `;

  return str(rows[0].id);
}

/**
 * A partner Simon enters himself, in /app.
 *
 * The public form is not the only door, and treating it as the only one was a
 * real gap: nearly every gift this ministry receives arrives by bank transfer or
 * M-Pesa after an exchange of emails, which is exactly the arrangement /give
 * asks for — it publishes no account numbers and invites people to write. A
 * church that gave $8,000 two years before this site existed cannot go back and
 * fill in a form, and a ledger that can only record the gifts that came through
 * its own form is a ledger missing the largest gifts it has.
 *
 * Distinct from `findOrCreatePartner` in one way that matters: this refuses a
 * duplicate rather than quietly merging into it. On the public side a second
 * claim from the same address is the same church coming back and joining them is
 * right. Here, somebody is typing a name in, and silently attaching it to an
 * existing row — under that row's name, which may read quite differently — is
 * how a gift ends up filed against the wrong church.
 */
export async function createPartner(input: {
  name: string;
  email: string;
  kind: string;
  location: string;
  contactName: string;
  note: string;
  verified: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; existing: Partner }> {
  const email = input.email.trim().toLowerCase();
  const id = randomUUID();

  const rows = await sql()`
    INSERT INTO partners (id, name, kind, location, email, contact_name, note, verified_at)
    VALUES (${id}, ${input.name.trim()}, ${input.kind}, ${input.location.trim()},
            ${email}, ${input.contactName.trim()}, ${input.note.trim()},
            CASE WHEN ${input.verified}::boolean THEN now() END)
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;

  if (rows[0]) return { ok: true, id: str(rows[0].id) };

  const existing = await getPartnerByEmail(email);
  if (!existing) {
    // The row that blocked the insert has gone in the moment since. Vanishingly
    // unlikely, and not worth a retry loop — saying so beats a null crash.
    throw new Error("Could not add that partner. Try again.");
  }
  return { ok: false, existing };
}

export async function getPartnerByEmail(email: string): Promise<Partner | null> {
  const rows = await sql()`
    SELECT id, name, kind, location, email, contact_name, verified_at, note,
           created_at, (password_hash IS NOT NULL) AS has_login
    FROM partners WHERE email = ${email.trim().toLowerCase()}
  `;
  return rows[0] ? toPartner(rows[0]) : null;
}

/**
 * The older door: a password Simon issued by hand.
 *
 * Kept for the churches already carrying one, and still gated on `verified_at`
 * — not because verification is what grants access any more, but because that
 * is the only state in which a password is ever set. `setPartnerPassword`
 * refuses an unverified partner and `setPartnerVerified(false)` clears the hash,
 * so a row that fails this condition has no usable password to check anyway.
 * Saying it in the query means an un-ticked partner cannot be let back in by a
 * hash that outlived the tick.
 */
export async function signInPartner(email: string, password: string) {
  const rows = await sql()`
    SELECT id, password_hash
    FROM partners
    WHERE email = ${email.trim().toLowerCase()}
      AND password_hash IS NOT NULL
      AND verified_at IS NOT NULL
  `;

  const row = rows[0] as { id: string; password_hash: string } | undefined;
  if (!row) return false;
  if (!(await verifyPassword(password, row.password_hash))) return false;

  await partnerSession.start(row.id);
  return true;
}

/**
 * A sign-in code for whoever gives from this address, or null if nobody does.
 *
 * Null is not an error and the caller must not say so out loud. "No partner has
 * that address" answers the question "does this church give to Jepegomi?" for
 * anybody with a list of church addresses, and that is precisely the fact this
 * whole area exists to keep private — so the action above this says the same
 * sentence either way. See the note in (site)/partners/actions.ts.
 *
 * Deliberately does *not* create a partner for an address it has never seen.
 * `findOrCreatePartner` is for somebody who has just given something; a row
 * minted at the door would be an empty dashboard for a stranger, and a way to
 * write rows into the ledger by typing addresses into a form.
 */
export async function issueSignInCode(
  email: string,
): Promise<{ partner: Partner; reader: PartnerReader | null; code: string } | null> {
  const resolved = await resolveSignIn(email);
  if (!resolved) return null;

  return {
    ...resolved,
    code: await issueCode(email.trim().toLowerCase(), resolved.partner.id),
  };
}

/**
 * Whose giving an address opens, and in what capacity.
 *
 * The partner table is asked first and its answer is final. An address that
 * gives in its own right reads its own giving, always — that is the one thing at
 * this door nobody administrative should be able to take away or point somewhere
 * else, so it is decided before the list Simon maintains is even consulted.
 *
 * In practice the two can never both match: `addReader` refuses an address that
 * already belongs to a partner. The order here is what makes that a tidiness
 * rule rather than a load-bearing one — if a reader's address later gives on its
 * own through /give, `findOrCreatePartner` mints them a partner row, and from
 * that moment this returns their own giving instead of the church's. They lose
 * a view they had, which is worth knowing about; they do not lose their own.
 */
async function resolveSignIn(
  email: string,
): Promise<{ partner: Partner; reader: PartnerReader | null } | null> {
  const address = email.trim().toLowerCase();

  const partner = await getPartnerByEmail(address);
  if (partner) return { partner, reader: null };

  const reader = await readerByEmail(address);
  if (!reader) return null;

  /*
    The partner is re-read rather than joined in, so a reader pointing at a row
    that has since gone is a closed door and not a crash. The cascade should make
    that impossible; a door is not the place to rely on should.
  */
  const readable = await getPartner(reader.partnerId);
  return readable ? { partner: readable, reader } : null;
}

/**
 * Spends a code and, if it was the right one, starts the session.
 *
 * No `verified_at` condition, unlike the password door below. That is the whole
 * point of this one: the code proves control of the address the gift came from,
 * and a person who gave $40 is owed the record of their $40 without waiting for
 * anybody to tick anything. What they can *read* once inside still depends on
 * the tick — that rule is in lib/disclosure.ts, applied on every render.
 */
export async function signInPartnerWithCode(email: string, code: string) {
  const address = email.trim().toLowerCase();

  /*
    Resolved again here rather than trusted from the code row. Between the code
    being sent and being typed, Simon may have taken this reader off the partner
    — and the answer to "may this address read that giving" has to be the one
    that is true now, not the one that was true when the email went out.
    `claimCode` is given the fresh answer and will miss if the code was issued
    against a different one.
  */
  const resolved = await resolveSignIn(address);
  if (!resolved) return false;

  if (!(await claimCode(address, resolved.partner.id, code))) return false;

  await partnerSession.start(
    sessionValue(resolved.partner.id, resolved.reader?.id),
  );
  return true;
}

export async function signOutPartner() {
  const view = await currentPartnerView();
  await partnerSession.clear();

  /*
    Any code still live is thrown away on the way out. Somebody signing out of a
    borrowed machine has usually just typed a code into it, and leaving the rest
    of its quarter of an hour on the table costs nothing to close.

    Keyed on the address that asked, so a treasurer signing out closes their own
    code and not the one the church office asked for a minute ago.
  */
  if (view) await forgetCode(view.reader?.email ?? view.partner.email);
}

/**
 * The signed-in partner, or null.
 *
 * The row is re-read on every page load rather than trusted from the cookie,
 * which is what keeps `verified` honest: Simon un-ticking a partner has to shut
 * the accounts on their next page load, not in thirty days when the cookie runs
 * out. It is the *disclosure* that closes now rather than the door — see the
 * note at the top of this file — and it closes here, because every screen works
 * out what it may show from the `Partner` this function returns.
 */
export type PartnerView = {
  partner: Partner;
  /** Set when somebody Simon added is reading on the partner's behalf. */
  reader: PartnerReader | null;
};

export async function currentPartnerView(): Promise<PartnerView | null> {
  if (!isPartnerAreaConfigured()) return null;

  const value = await partnerSession.read();
  if (!value) return null;

  const [partnerId, readerId] = value.split(":");
  if (!partnerId) return null;

  try {
    const rows = await sql()`
      SELECT id, name, kind, location, email, contact_name, verified_at, note,
             created_at, (password_hash IS NOT NULL) AS has_login
      FROM partners
      WHERE id = ${partnerId}
    `;
    if (!rows[0]) return null;

    const partner = toPartner(rows[0]);
    if (!readerId) return { partner, reader: null };

    /*
      The reader row is re-read too, and for the sharper version of the reason
      the partner is: this is the permission itself. Simon taking a treasurer off
      a church has to shut their page on the next load, not in thirty days when
      the cookie runs out — and a reader whose row has gone, or has been moved to
      another partner since, is somebody holding a cookie for a door that is no
      longer theirs.
    */
    const reader = await getReader(readerId);
    if (!reader || reader.partnerId !== partner.id) return null;

    return { partner, reader };
  } catch {
    return null;
  }
}

export async function currentPartner(): Promise<Partner | null> {
  return (await currentPartnerView())?.partner ?? null;
}

export async function requirePartner() {
  const partner = await currentPartner();
  if (!partner) throw new Error("Not signed in.");
  return partner;
}

/* -------------------------------------------------------------- from /app */

export async function listPartners(): Promise<PartnerWithTotals[]> {
  const rows = await sql()`
    SELECT
      partners.id, partners.name, partners.kind, partners.location,
      partners.email, partners.contact_name, partners.verified_at,
      partners.note, partners.created_at,
      (partners.password_hash IS NOT NULL) AS has_login,
      COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status <> 'declined'), 0)::int
        AS claimed_cents,
      COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'received'), 0)::int
        AS received_cents,
      COUNT(p.id) FILTER (WHERE p.status <> 'declined')::int AS pledge_count
    FROM partners
    LEFT JOIN pledges p ON p.partner_id = partners.id
    GROUP BY partners.id
    ORDER BY partners.verified_at IS NULL DESC, partners.created_at DESC
  `;

  return rows.map((row) => ({
    ...toPartner(row),
    claimedCents: Number(row.claimed_cents ?? 0),
    receivedCents: Number(row.received_cents ?? 0),
    pledgeCount: Number(row.pledge_count ?? 0),
  }));
}

export async function getPartner(id: string): Promise<Partner | null> {
  const rows = await sql()`
    SELECT id, name, kind, location, email, contact_name, verified_at, note,
           created_at, (password_hash IS NOT NULL) AS has_login
    FROM partners WHERE id = ${id}
  `;
  return rows[0] ? toPartner(rows[0]) : null;
}

export async function setPartnerVerified(id: string, verified: boolean) {
  /*
    Un-verifying also clears the password. A partner Simon no longer vouches for
    should not keep a working key to the dashboard — and leaving the hash in
    place so verifying again silently restores their old password is a door
    nobody remembers is there.
  */
  if (verified) {
    await sql()`UPDATE partners SET verified_at = now() WHERE id = ${id}`;
    return;
  }

  await sql()`
    UPDATE partners SET verified_at = NULL, password_hash = NULL WHERE id = ${id}
  `;
}

export async function setPartnerPassword(id: string, password: string) {
  const rows = await sql()`
    SELECT verified_at FROM partners WHERE id = ${id}
  `;
  if (!rows[0]) throw new Error("That partner no longer exists.");
  if (!rows[0].verified_at) {
    throw new Error("Verify this partner before giving them a login.");
  }

  await sql()`
    UPDATE partners SET password_hash = ${await hashPassword(password)}
    WHERE id = ${id}
  `;
}

export async function revokePartnerLogin(id: string) {
  await sql()`UPDATE partners SET password_hash = NULL WHERE id = ${id}`;
}

export async function updatePartnerDetails(
  id: string,
  input: { name: string; kind: string; location: string; contactName: string; note: string },
) {
  await sql()`
    UPDATE partners SET
      name = ${input.name}, kind = ${input.kind}, location = ${input.location},
      contact_name = ${input.contactName}, note = ${input.note}
    WHERE id = ${id}
  `;
}
