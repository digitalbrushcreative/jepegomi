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
 * cannot be. Alongside both sits one small inbox: the enrolment enquiries
 * parents send from /academy, kept so Simon can see which of them he has
 * answered.
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
      One partner promising one amount — the row that makes the whole thing
      work. A need is not funded by a donor; it is funded by however many of
      these it takes to reach its cost, which is exactly the point.

      Most pledges point at a need. Some do not: somebody who came to /give and
      wrote "school fees for one child" rather than picking off the list is
      giving just as really, and dropping that on the floor because it does not
      match a row in `needs` would be the site refusing money. Those carry a
      null `need_id` and the giver's own words in `designation` — one of the two
      is always present, which is what the check constraint below says.

      ON DELETE CASCADE from needs: deleting a need is only ever offered while
      nothing has been claimed against it, so the cascade is a safety net rather
      than a policy. Partners are NOT cascaded — removing a partner leaves the
      money in the ledger, because the money was still received.
    */
    await db`
      CREATE TABLE IF NOT EXISTS pledges (
        id           TEXT PRIMARY KEY,
        need_id      TEXT REFERENCES needs(id) ON DELETE CASCADE,
        partner_id   TEXT REFERENCES partners(id) ON DELETE SET NULL,
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        designation  TEXT NOT NULL DEFAULT '',
        status       TEXT NOT NULL DEFAULT 'pending',
        message      TEXT NOT NULL DEFAULT '',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        decided_at   TIMESTAMPTZ,
        received_at  TIMESTAMPTZ
      )
    `;

    /*
      Catching up a database created before /give had a form on it. Both of
      these are no-ops on a table the statement above just made, and both have
      to run for one made last month — CREATE TABLE IF NOT EXISTS does nothing
      at all to a table that already exists, including to its columns.
    */
    await db`ALTER TABLE pledges ALTER COLUMN need_id DROP NOT NULL`;
    await db`
      ALTER TABLE pledges ADD COLUMN IF NOT EXISTS designation TEXT NOT NULL DEFAULT ''
    `;

    /*
      Which arm of the ministry a designated gift was for, where it can be told
      from what the giver wrote — see `areaForDesignation` in lib/giving.ts.

      Nullable, and null on most rows, which is why it is a column rather than a
      default: "we could not tell" and "across the ministry" are different
      answers, and only the first one should ever be corrected in /app. A gift
      that carries an area shows the giver the project it went to, with its
      photographs, instead of a line of their own text and nothing else.
    */
    await db`ALTER TABLE pledges ADD COLUMN IF NOT EXISTS area TEXT`;

    /*
      A pledge towards nothing in particular, with nothing written in the box,
      is a row nobody can ever reconcile. Dropped and re-added rather than
      guarded with a catalogue lookup: naming it makes the drop safe, and
      validating a table this size costs nothing.
    */
    await db`ALTER TABLE pledges DROP CONSTRAINT IF EXISTS pledges_towards_check`;
    await db`
      ALTER TABLE pledges ADD CONSTRAINT pledges_towards_check
        CHECK (need_id IS NOT NULL OR designation <> '')
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
      A parent asking about a place at the academy.

      This table is the one place on the site that holds anything about a child,
      and it exists because the alternative turned out to be worse: an enquiry
      that lived only in an inbox was an enquiry nobody could tell had been
      answered. Two people replying to the same parent, or neither of them, is
      not a privacy win.

      So it is kept deliberately thin. Only what the form asks — a first name and
      an age is the most it ever holds about a child — no address, no school
      history, nothing a form did not need in the first place. `status` is there
      so a dealt-with enquiry can be seen to be dealt with, and /app offers a
      real delete, because a record of a child who never enrolled is a record
      with no reason to exist.
    */
    await db`
      CREATE TABLE IF NOT EXISTS enrolment_enquiries (
        id            TEXT PRIMARY KEY,
        parent_name   TEXT NOT NULL,
        email         TEXT NOT NULL,
        phone         TEXT NOT NULL DEFAULT '',
        child_name    TEXT NOT NULL DEFAULT '',
        child_age     TEXT NOT NULL DEFAULT '',
        starting_when TEXT NOT NULL DEFAULT '',
        message       TEXT NOT NULL DEFAULT '',
        status        TEXT NOT NULL DEFAULT 'new',
        note          TEXT NOT NULL DEFAULT '',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        answered_at   TIMESTAMPTZ,
        answered_by   TEXT REFERENCES users(id) ON DELETE SET NULL
      )
    `;

    /*
      A handful of values the site works out for itself and then has to
      remember — at present exactly one: the id Pesapal gives back when an IPN
      URL is registered with it.

      That id could have been an environment variable, and deliberately is not.
      Registering the URL is a call the site can make on its own the first time
      it needs to, and a setup step a human has to perform by hand is a setup
      step that gets performed once, on the wrong environment, by somebody who
      then leaves. The key carries the environment and the URL, so sandbox and
      live hold different rows and moving the site to a new domain re-registers
      rather than quietly notifying the old one.
    */
    await db`
      CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    /*
      One attempt to pay one pledge.

      A separate table rather than columns on `pledges`, because a pledge and a
      payment are not the same thing and the ledger has always known it. A
      pledge is a promise; most of them are still settled by bank transfer and
      have no payment row at all. A payment is one journey through Pesapal,
      which can be abandoned at the card page and started again — so one pledge
      may accumulate several rows here, and only one of them ever reaches
      'paid'.

      Two amounts, on purpose. `amount_cents` is the ledger's own figure, US
      cents, the number every total on the site is summed from. `charged_amount`
      and `charged_currency` are what Pesapal actually took, in shillings unless
      the merchant account has been opened for dollars — with `rate` recording
      what the conversion was at that moment. Storing only the dollars would
      make the site's figures impossible to reconcile against a Pesapal
      statement; storing only the shillings would make the ledger drift every
      time the rate moved. Both, and neither question is hard to answer.

      `reference` is what we send Pesapal as the merchant reference and is the
      id it hands back to us; `tracking_id` is Pesapal's own. Both are unique
      and both are looked up, because the IPN arrives with one and the browser
      comes back with the other.
    */
    await db`
      CREATE TABLE IF NOT EXISTS payments (
        id                TEXT PRIMARY KEY,
        pledge_id         TEXT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
        provider          TEXT NOT NULL DEFAULT 'pesapal',
        reference         TEXT UNIQUE NOT NULL,
        tracking_id       TEXT UNIQUE,
        amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
        charged_amount    NUMERIC(14,2) NOT NULL,
        charged_currency  TEXT NOT NULL,
        rate              NUMERIC(14,6) NOT NULL DEFAULT 1,
        status            TEXT NOT NULL DEFAULT 'started',
        method            TEXT NOT NULL DEFAULT '',
        confirmation_code TEXT NOT NULL DEFAULT '',
        note              TEXT NOT NULL DEFAULT '',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        settled_at        TIMESTAMPTZ
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS payments_pledge_idx ON payments (pledge_id)
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

      LEFT JOIN to needs, not JOIN: a gift given towards something a giver
      described in their own words has no need row, and an inner join would make
      it disappear from the one screen Simon reconciles from. Dropped first
      because CREATE OR REPLACE cannot renumber a view's columns, and `p.*`
      grew one when `designation` was added.
    */
    await db`DROP VIEW IF EXISTS pledge_detail`;
    await db`
      CREATE VIEW pledge_detail AS
      SELECT
        p.*,
        n.slug  AS need_slug,
        n.title AS need_title,
        /*
          Whether the item has a public page behind it. A partner's dashboard
          lists every claim, and a claim against an unpublished item — a draft,
          or a finished budget line kept off the site — must be set in plain text
          rather than linked to a /needs address that answers 404.
        */
        COALESCE(n.published, false) AS need_published,
        partners.name  AS partner_name,
        partners.email AS partner_email
      FROM pledges p
      LEFT JOIN needs n ON n.id = p.need_id
      LEFT JOIN partners ON partners.id = p.partner_id
    `;
  })();

  return schemaReady;
}
