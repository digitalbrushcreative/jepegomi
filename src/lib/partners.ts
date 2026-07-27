import { randomUUID } from "node:crypto";
import { toIso } from "@/lib/dates";
import { isDatabaseConfigured, sql } from "@/lib/db";
import type { Partner, PartnerWithTotals } from "@/lib/giving";
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
 *   arrived     a row exists. They claimed something. Nothing is confirmed.
 *   verified    Simon has satisfied himself this is really that church.
 *   has a login verified, *and* Simon has issued them a password.
 *
 * Most partners will stop at verified and never want a login, and that has to
 * be an ordinary outcome rather than an account left half-made. A login is
 * something a partner church asks for so it can watch its own giving; it is not
 * a step on the way to being trusted.
 */
const partnerSession = session("partner", "jepegomi_partner");

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

export async function signOutPartner() {
  await partnerSession.clear();
}

/**
 * The signed-in partner, or null. The verified check is repeated here rather
 * than trusted from sign-in time: if Simon un-verifies a partner, whoever is
 * already holding a valid cookie has to stop seeing the dashboard on their next
 * page load, not in thirty days when the cookie runs out.
 */
export async function currentPartner(): Promise<Partner | null> {
  if (!isPartnerAreaConfigured()) return null;

  const partnerId = await partnerSession.read();
  if (!partnerId) return null;

  try {
    const rows = await sql()`
      SELECT id, name, kind, location, email, contact_name, verified_at, note,
             created_at, (password_hash IS NOT NULL) AS has_login
      FROM partners
      WHERE id = ${partnerId} AND verified_at IS NOT NULL
    `;
    return rows[0] ? toPartner(rows[0]) : null;
  } catch {
    return null;
  }
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
