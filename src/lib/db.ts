import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

/**
 * The content store, and the giving ledger.
 *
 * One Postgres database holds it all. The content half is a JSONB blob per
 * page, keyed by the document key in src/cms/schema.ts, alongside the people
 * who can sign in and edit it. The giving half — needs, the churches and people
 * who claim them, what each has claimed, and the progress reported back — is
 * ordinary relational tables, because a ledger has to be summed and a JSON blob
 * cannot be.
 *
 * The site is designed to run *without* this. If DATABASE_URL is unset — or the
 * database is unreachable — every page falls back to the defaults that live in
 * the schema registry, which are the words the site shipped with, and the
 * giving pages say plainly that there is nothing to show. A database outage
 * degrades the CMS, never the public site.
 */

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export type Row = Record<string, unknown>;

/**
 * Both drivers are addressed the same way — a tagged template that returns
 * rows — so nothing above this file knows or cares which one it got. (The
 * drivers' own signatures are unions covering every way they can be called,
 * which TypeScript can't index into; saying it once here beats casting at
 * every call site.)
 */
type SqlQuery = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Row[]>;

/**
 * Which driver, and why — the same shape of decision photo-writer.ts makes.
 *
 *   Neon (production)  HTTP, one round trip, no connection to keep alive. A
 *                      serverless function that lives for 50ms cannot afford a
 *                      TCP pool, and Neon's driver is built for exactly that.
 *   pg (local dev)     A normal TCP connection to the Postgres on your machine.
 *                      Neon's HTTP driver can only talk to Neon, so developing
 *                      against localhost needs the ordinary client.
 *
 * The upshot: `createdb jepegomi` is enough to run the CMS locally. No cloud
 * account is needed until you deploy.
 */
function createClient(url: string): SqlQuery {
  if (/\.neon\.tech/.test(url)) {
    return neon(url) as unknown as SqlQuery;
  }

  const pool = new Pool({ connectionString: url });

  return async (strings, ...values) => {
    // Postgres wants $1, $2…; a tagged template hands us the gaps between them.
    const text = strings.reduce(
      (query, part, index) =>
        query + part + (index < values.length ? `$${index + 1}` : ""),
      "",
    );
    const result = await pool.query(text, values);
    return result.rows;
  };
}

let client: SqlQuery | null = null;

export function sql(): SqlQuery {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  client ??= createClient(url);
  return client;
}

/**
 * Creates the tables if they aren't there yet.
 *
 * Called from the /app setup path only, never from a public page render, so a
 * visitor's request never runs DDL. It's memoised per process: the statements
 * are IF NOT EXISTS, but there's no reason to send them twice.
 */
let schemaReady: Promise<void> | null = null;

export function ensureSchema() {
  schemaReady ??= (async () => {
    const db = sql();

    await db`
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        name          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await db`
      CREATE TABLE IF NOT EXISTS content (
        key        TEXT PRIMARY KEY,
        data       JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
      )
    `;

    /*
      A need is one thing the ministry is short of, with one price on it: a
      water tank, the cabro floor, a term of a teacher's pay. Costs are whole
      cents (see lib/money.ts). `position` is the running order Simon chooses;
      `published` keeps a half-written need off the site until he means it;
      `closed` retires one whose work is finished without deleting the record of
      who paid for it.
    */
    await db`
      CREATE TABLE IF NOT EXISTS needs (
        id         TEXT PRIMARY KEY,
        slug       TEXT UNIQUE NOT NULL,
        title      TEXT NOT NULL,
        summary    TEXT NOT NULL DEFAULT '',
        detail     TEXT NOT NULL DEFAULT '',
        area       TEXT NOT NULL DEFAULT 'other',
        cost_cents INTEGER NOT NULL CHECK (cost_cents > 0),
        published  BOOLEAN NOT NULL DEFAULT false,
        closed     BOOLEAN NOT NULL DEFAULT false,
        position   INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    /*
      A partner is a church or a person who has given. They arrive by claiming
      something on the public site, which is why almost every column can be
      thin: at that moment all we have is a name and an email. `verified_at` is
      Simon saying "yes, this is really them"; `password_hash` is null until he
      also issues a login, because plenty of partners will never want one.
    */
    await db`
      CREATE TABLE IF NOT EXISTS partners (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        kind          TEXT NOT NULL DEFAULT 'church',
        location      TEXT NOT NULL DEFAULT '',
        email         TEXT UNIQUE NOT NULL,
        contact_name  TEXT NOT NULL DEFAULT '',
        password_hash TEXT,
        verified_at   TIMESTAMPTZ,
        note          TEXT NOT NULL DEFAULT '',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    /*
      One partner claiming one amount against one need — the row that makes the
      whole thing work. A need is not funded by a donor; it is funded by however
      many of these it takes to reach its cost, which is exactly the point.

      ON DELETE CASCADE from needs: deleting a need is only ever offered while
      nothing has been claimed against it, so the cascade is a safety net rather
      than a policy. Partners are NOT cascaded — removing a partner leaves the
      money in the ledger, because the money was still received.
    */
    await db`
      CREATE TABLE IF NOT EXISTS pledges (
        id           TEXT PRIMARY KEY,
        need_id      TEXT NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
        partner_id   TEXT REFERENCES partners(id) ON DELETE SET NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        status       TEXT NOT NULL DEFAULT 'pending',
        message      TEXT NOT NULL DEFAULT '',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        decided_at   TIMESTAMPTZ,
        received_at  TIMESTAMPTZ
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS pledges_need_idx ON pledges (need_id)
    `;
    await db`
      CREATE INDEX IF NOT EXISTS pledges_partner_idx ON pledges (partner_id)
    `;

    /*
      What happened next. This is the half of transparent giving that is not a
      number: a church that paid for the water tank should be able to see the
      water tank. Photos are files like every other photo on this site — the
      column holds the public path, and lib/need-photos.ts puts the file there.
    */
    await db`
      CREATE TABLE IF NOT EXISTS need_updates (
        id         TEXT PRIMARY KEY,
        need_id    TEXT NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
        body       TEXT NOT NULL,
        photo      TEXT NOT NULL DEFAULT '',
        photo_alt  TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS need_updates_need_idx ON need_updates (need_id)
    `;

    /*
      What "claimed" means, written once, in the one place every reader of the
      ledger has to go through.

      This could have been two SUM columns copied into each of the half-dozen
      queries in lib/needs.ts, and that is exactly the arrangement where the
      public page and the partner dashboard end up disagreeing about how much
      of a water tank is left — one of them gets a clause added and the other
      does not. A view cannot drift from itself.
    */
    await db`
      CREATE OR REPLACE VIEW need_ledger AS
      SELECT
        n.id AS need_id,
        COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status <> 'declined'), 0)::int
          AS claimed_cents,
        COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'received'), 0)::int
          AS received_cents
      FROM needs n
      LEFT JOIN pledges p ON p.need_id = n.id
      GROUP BY n.id
    `;

    /*
      A claim with the names attached. Only /app and a partner's own dashboard
      ever select from this — the public pages read need_ledger, which carries
      totals and no names at all, so there is no query behind a public page that
      *could* leak who gave what.
    */
    await db`
      CREATE OR REPLACE VIEW pledge_detail AS
      SELECT
        p.*,
        n.slug  AS need_slug,
        n.title AS need_title,
        partners.name  AS partner_name,
        partners.email AS partner_email
      FROM pledges p
      JOIN needs n ON n.id = p.need_id
      LEFT JOIN partners ON partners.id = p.partner_id
    `;
  })();

  return schemaReady;
}
