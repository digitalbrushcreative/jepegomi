import { randomUUID } from "node:crypto";
import { toIso } from "@/lib/dates";
import { sql } from "@/lib/db";
import type { PartnerReader } from "@/lib/giving";

/**
 * The other people who may read a partner's giving.
 *
 * ## The problem this solves
 *
 * A partner is an email address. That is not a shortcut — it is what makes the
 * code door work at all, because the claim somebody makes at /partners is "the
 * gifts filed under this address are mine" and proving control of the address is
 * exactly that claim, proved. See lib/partner-codes.ts.
 *
 * For a church it is also, quite often, the wrong number of people. The gift
 * went out under office@, and the treasurer reconciling it, the missions pastor
 * who championed it and whoever writes the newsletter each have a real reason to
 * see what it built — and none of them can, because the code lands in an inbox
 * they may not open. The answer to that has so far been Simon forwarding a
 * screenshot, which is worse in every direction.
 *
 * ## Why every row is typed in by hand
 *
 * Nothing here is inferred, and the temptation to infer it is the reason this
 * comment is long. The obvious rule — same domain as the partner's address —
 * would hand one church's giving to everybody else on its mail server, including
 * whoever inherits an address after somebody leaves. There is no fact in a gift
 * that says jane@grace.org belongs with office@grace.org. There is only somebody
 * who knows the church saying so, and that is Simon, in /app.
 *
 * So this file has no heuristics in it. It has a list, and two ways to change
 * the list.
 *
 * ## What it grants, and what it does not
 *
 * Exactly the partner's own door and nothing more. A reader asks for a code at
 * /partners like anybody else, it goes to *their* address, and it opens the
 * partner's dashboard read-only — the same page, the same disclosure tier, the
 * same figures. It is not a login, it does not make them a partner, no gift is
 * ever filed against them, and it confers nothing in /app.
 *
 * ## One address, one partner
 *
 * `email` is unique across the whole table, not per partner. An address that
 * could open two dashboards would need the door to ask which, and a chooser on
 * the way in is a chooser that tells a stranger who typed an address in that it
 * belongs to two churches. Adding the same address twice is refused out loud
 * instead — see `addReader`, which says which partner already has it.
 */

type Row = Record<string, unknown>;

const str = (value: unknown) => String(value ?? "");

function toReader(row: Row): PartnerReader {
  return {
    id: str(row.id),
    partnerId: str(row.partner_id),
    email: str(row.email),
    name: str(row.name),
    note: str(row.note),
    createdAt: toIso(row.created_at),
  };
}

/* ------------------------------------------------------------- the door */

/**
 * The partner one address may read on behalf of, or null.
 *
 * On the sign-in path, so it says nothing and returns nothing. Whether an
 * address is on this list is the same private fact as whether it gives — see
 * the note at the top of (site)/partners/actions.ts — and the caller answers
 * both the same way.
 */
export async function readerByEmail(email: string): Promise<PartnerReader | null> {
  const rows = await sql()`
    SELECT id, partner_id, email, name, note, created_at
    FROM partner_readers WHERE email = ${email.trim().toLowerCase()}
  `;
  return rows[0] ? toReader(rows[0]) : null;
}

/** One reader by id. Used after a removal, to close their live code. */
export async function getReader(id: string): Promise<PartnerReader | null> {
  const rows = await sql()`
    SELECT id, partner_id, email, name, note, created_at
    FROM partner_readers WHERE id = ${id}
  `;
  return rows[0] ? toReader(rows[0]) : null;
}

/* ------------------------------------------------------------ from /app */

export async function listReaders(partnerId: string): Promise<PartnerReader[]> {
  const rows = await sql()`
    SELECT id, partner_id, email, name, note, created_at
    FROM partner_readers WHERE partner_id = ${partnerId}
    ORDER BY created_at
  `;
  return rows.map(toReader);
}

/**
 * Every reader on the site, filed under the partner they read.
 *
 * One query for the whole Partners page rather than one per card. The table is
 * a handful of rows per church at the very most, so reading all of it costs less
 * than the round trips it saves.
 */
export async function readersByPartner(): Promise<Map<string, PartnerReader[]>> {
  const rows = await sql()`
    SELECT id, partner_id, email, name, note, created_at
    FROM partner_readers ORDER BY created_at
  `;

  const byPartner = new Map<string, PartnerReader[]>();
  for (const row of rows) {
    const reader = toReader(row);
    const existing = byPartner.get(reader.partnerId);
    if (existing) existing.push(reader);
    else byPartner.set(reader.partnerId, [reader]);
  }
  return byPartner;
}

/**
 * The reasons an address cannot be added, in the words Simon should read.
 *
 * Refusing rather than resolving, the same way `createPartner` refuses a
 * duplicate rather than quietly merging into one. Both of these have a right
 * answer that a rule could pick, and in both cases the rule would be picking on
 * somebody's behalf between two partners' giving — which is the one decision
 * that should never happen quietly.
 */
export type AddReaderResult =
  | { ok: true; reader: PartnerReader }
  | { ok: false; error: string };

export async function addReader(input: {
  partnerId: string;
  email: string;
  name: string;
  note: string;
}): Promise<AddReaderResult> {
  const email = input.email.trim().toLowerCase();

  /*
    An address that gives in its own right is not added as somebody else's
    reader. It already has a dashboard — its own — and one address cannot open
    two, so adding it here would either displace their giving or be quietly
    ignored at the door. Both are worse than saying so now.
  */
  const partners = await sql()`
    SELECT id, name FROM partners WHERE email = ${email}
  `;
  if (partners[0]) {
    return {
      ok: false,
      error:
        str(partners[0].id) === input.partnerId
          ? "That is this partner's own address — they can already sign in with it."
          : `${str(partners[0].name)} gives under that address, so it opens their own giving. Use a different one.`,
    };
  }

  const id = randomUUID();
  const rows = await sql()`
    INSERT INTO partner_readers (id, partner_id, email, name, note)
    VALUES (${id}, ${input.partnerId}, ${email}, ${input.name.trim()}, ${input.note.trim()})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, partner_id, email, name, note, created_at
  `;

  if (rows[0]) return { ok: true, reader: toReader(rows[0]) };

  /*
    Something already holds the address. Which partner it belongs to decides
    whether this is a mistake worth explaining or simply already done.
  */
  const existing = await readerByEmail(email);
  if (!existing) {
    return { ok: false, error: "Could not add that address. Try again." };
  }
  if (existing.partnerId === input.partnerId) {
    return { ok: false, error: "That address is already on this partner." };
  }

  const owner = await sql()`
    SELECT name FROM partners WHERE id = ${existing.partnerId}
  `;
  return {
    ok: false,
    error: `That address already reads ${str(owner[0]?.name) || "another partner"}'s giving. Take it off there first — one address reads one partner.`,
  };
}

/** Removes a reader and hands back who it was, so their live code can be closed. */
export async function removeReader(id: string): Promise<PartnerReader | null> {
  const rows = await sql()`
    DELETE FROM partner_readers WHERE id = ${id}
    RETURNING id, partner_id, email, name, note, created_at
  `;
  return rows[0] ? toReader(rows[0]) : null;
}
