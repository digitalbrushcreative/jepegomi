import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import { NEED_AREAS, projectName } from "@/lib/giving";

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
 *
 * One table is deliberately not here: `rate_limits`, which lib/rate-limit.ts
 * creates itself. The paths that need it are public ones — the sign-ins and the
 * four forms — and putting two dozen statements and a view rebuild on the front
 * of a stranger's form post is not a trade worth making for tidiness. The note
 * in that file explains it from the other side.
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
      A project: one named raise, inside one arm of the ministry.

      This is the rung the ledger did not have, and its absence was a ceiling.
      A need carried an `area` — the kitchen, the academy, the church — and the
      area was treated as the project, which works exactly as long as each arm
      of the ministry is raising for one thing at a time. The academy is not.
      It wants a classroom block and a library and a water tank, and under the
      old shape those were one undifferentiated pile of items under "Jepegomi
      Academy", with no way to say that a gift was for the library or to show
      the library finished while the block was still going up.

      So the area goes back to being what it always was — which arm of the
      ministry this belongs to, the thing lib/disclosure.ts and the project
      accounts and a gift's designation are all keyed on — and the project
      becomes a row. An arm of the ministry may now hold as many as it has.

      `area` is not a foreign key: the arms live in code (lib/giving.ts), not in
      a table, because they have pages and copy of their own. It is duplicated
      onto the parts and needs below rather than being read through a join,
      which is the same trade `need_parts` already made — every query that
      groups by area would otherwise have to reach through two tables, and the
      writes that could desynchronise it all go through one function.

      `sequence` orders projects inside an arm. Unlike a part's sequence it
      gates nothing: two projects in the same programme are not steps of one
      job, and a library nobody has started is not waiting on a classroom
      block. It is running order on a page and nothing more.
    */
    await db`
      CREATE TABLE IF NOT EXISTS projects (
        id         TEXT PRIMARY KEY,
        area       TEXT NOT NULL,
        slug       TEXT UNIQUE NOT NULL,
        title      TEXT NOT NULL,
        summary    TEXT NOT NULL DEFAULT '',
        sequence   INTEGER NOT NULL DEFAULT 0,
        published  BOOLEAN NOT NULL DEFAULT false,
        closed     BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS projects_area_idx ON projects (area, sequence)
    `;

    /*
      A part of a project: the middle rung between "the kitchen build" and "two
      tonnes of cement".

      The reason it exists is sequence. A budget is not a flat list of things
      that can be bought in any order — the walls go up before the roof goes on
      and the paint goes on last — and a giving page that offers paint while
      the walls are still open is asking for money that cannot be spent yet.
      Grouping the items into parts and giving each part a number is the whole
      mechanism: a part opens for giving once every part before it is fully
      claimed. Nothing else in the system needs to know about builders.

      `area` is which project it belongs to, matching the ids in lib/giving.ts.
      Not a foreign key, because the projects are arms of the ministry with
      their own pages and their own copy — they live in code, not in a table.

      There is no `published` column on purpose. A part is a heading; it shows
      up where its items do, and an item is what carries the decision about
      whether the public can see it.
    */
    await db`
      CREATE TABLE IF NOT EXISTS need_parts (
        id         TEXT PRIMARY KEY,
        area       TEXT NOT NULL,
        title      TEXT NOT NULL,
        summary    TEXT NOT NULL DEFAULT '',
        sequence   INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS need_parts_area_idx ON need_parts (area, sequence)
    `;

    /*
      Which project a part and an item belong to.

      ON DELETE SET NULL rather than CASCADE, for the reason the part column
      below gives about headings: deleting a project must not take the record of
      what people paid for with it. The rows come loose, keep their area, and go
      on being visible under the arm of the ministry they were always filed in.

      Nullable, and briefly null on every row that existed before this: the
      backfill just below is what closes that, and it has to run after the
      column exists.
    */
    await db`
      ALTER TABLE need_parts ADD COLUMN IF NOT EXISTS project_id TEXT
        REFERENCES projects(id) ON DELETE SET NULL
    `;
    await db`
      ALTER TABLE needs ADD COLUMN IF NOT EXISTS project_id TEXT
        REFERENCES projects(id) ON DELETE SET NULL
    `;
    await db`
      CREATE INDEX IF NOT EXISTS needs_project_idx ON needs (project_id)
    `;

    /*
      Every item that predates projects, given one.

      One project per arm of the ministry that has anything in it, named after
      the arm, carrying everything that was filed there. That is precisely the
      shape the data already had — an area *was* the project — so this renames
      nothing and moves nothing; it writes down a grouping that was previously
      implied by a column.

      Guarded on there being rows with no project, so it runs once and then
      never does anything again. It cannot run twice and make two projects for
      one area: the second pass finds nothing to gather.

      The titles come from NEED_AREAS rather than being spelled out here, so an
      arm renamed in code does not leave a project named after what it used to
      be called. Simon can rename any of them afterwards in /app — from here on
      a project's title is data, and this is only its first value.
    */
    const orphans = await db`
      SELECT DISTINCT area FROM needs WHERE project_id IS NULL
      UNION
      SELECT DISTINCT area FROM need_parts WHERE project_id IS NULL
    `;

    for (const row of orphans as { area: string }[]) {
      const area = NEED_AREAS.find((one) => one.id === row.area);
      const title = area ? projectName(area) : row.area;
      const slug = area ? area.id : row.area;

      /*
        `ON CONFLICT (slug) DO NOTHING` and then a read, rather than a read and
        then an insert. Two deploys warming at once would otherwise both see no
        project and both make one.
      */
      await db`
        INSERT INTO projects (id, area, slug, title, summary, sequence, published)
        VALUES (${randomUUID()}, ${row.area}, ${slug}, ${title}, '', 0, true)
        ON CONFLICT (slug) DO NOTHING
      `;

      const found = await db`SELECT id FROM projects WHERE slug = ${slug}`;
      const projectId = (found[0] as { id: string } | undefined)?.id;
      if (!projectId) continue;

      await db`
        UPDATE needs SET project_id = ${projectId}
        WHERE area = ${row.area} AND project_id IS NULL
      `;
      await db`
        UPDATE need_parts SET project_id = ${projectId}
        WHERE area = ${row.area} AND project_id IS NULL
      `;
    }

    /*
      Which part an item sits in, or null for one that belongs to the project as
      a whole. Null is a perfectly good answer and always will be: plenty of
      needs — a term of a teacher's pay — are not a step in anything.

      ON DELETE SET NULL, not CASCADE. Deleting a part is deleting a heading,
      and a heading is not worth the items underneath it, still less the money
      claimed against them. The items simply come loose and sit under the
      project instead.
    */
    await db`
      ALTER TABLE needs ADD COLUMN IF NOT EXISTS part_id TEXT
        REFERENCES need_parts(id) ON DELETE SET NULL
    `;

    await db`
      CREATE INDEX IF NOT EXISTS needs_part_idx ON needs (part_id)
    `;

    /*
      The other half of a reconciliation: what a thing was expected to cost, and
      the line of explanation that goes with it.

      `cost_cents` has always carried two meanings depending on the row. On an
      open item it is the ask — what finishing this costs. On a closed one it is
      the record — what it actually came to. That was enough while the site only
      ever asked for money, and not enough to hold Pastor Simon's letter to the
      donor, which is *both* columns side by side: cement estimated $900 and cost
      $1,550, roofing estimated $1,554 and came in at $1,120 because he did the
      building himself.

      Those two figures used to live in src/content/kitchen.ts, and the database
      held a hand-seeded copy of the row with the estimate flattened into a
      sentence in `detail`. So the accounts could not be rebuilt from the ledger,
      the two could drift, and correcting a figure Simon had reported meant a
      deploy. These two columns are what let the ledger hold the letter.

      Nullable, and null on nearly every row: most needs were never estimated at
      anything other than what they cost. Null means "no separate estimate", not
      zero, and the accounts fall back to `cost_cents` for those.
    */
    await db`ALTER TABLE needs ADD COLUMN IF NOT EXISTS estimated_cents INTEGER`;
    await db`
      ALTER TABLE needs ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT ''
    `;

    /*
      Zero is allowed, but only on work that is finished.

      The table shipped with `CHECK (cost_cents > 0)`, which is exactly right for
      an item the site is asking for: a published need costing nothing is an
      appeal for nothing. It is wrong for a line of a reconciliation. Simon's
      letter records transport as "Used" — spent, with no figure ever put against
      it — and a ledger that cannot write that down sends the letter back to a
      TypeScript file, which is where it has just come from.

      So the rule becomes the sentence it always meant: an open item must have a
      price, a closed one may have none. `getProjectBudget` reads zero on a
      closed row back as "we do not know", never as "it cost nothing".

      Dropped by name and re-added, the same way `pledges_towards_check` is:
      naming it makes the drop safe, and validating a table this size costs
      nothing.
    */
    /*
      The picture that goes with an item.

      Small, and the last thing keeping the "still to complete" cards on the
      kitchen page reading out of a source file: the three of them are already
      rows in this table, but a water tank and a floor and a light fitting were
      only distinguishable because a TypeScript array said which icon each one
      got. Empty means "use the project's icon", which is what almost everything
      wants.
    */
    await db`ALTER TABLE needs ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT ''`;

    await db`ALTER TABLE needs DROP CONSTRAINT IF EXISTS needs_cost_cents_check`;
    await db`
      ALTER TABLE needs ADD CONSTRAINT needs_cost_cents_check
        CHECK (cost_cents >= 0 AND (cost_cents > 0 OR closed))
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
      The other people who may read a partner's giving.

      A partner is one email address, because a gift carries one. For a church
      that is usually a fiction: the money left under the office address, and
      the treasurer who has to reconcile it, the missions pastor who champions
      it and the person who writes the newsletter all have a reason to look at
      what it built — and none of them can, because the code goes to an inbox
      they may not open.

      Nothing here is inferred. There is no way to tell from a gift that
      jane@grace.org belongs with office@grace.org, and a rule that guessed —
      same domain, say — would hand one church's giving to whoever else is on
      its mail server. So every row is one Simon typed in, and the only thing
      it grants is the same code door the partner already has.

      `email` is unique across the whole table rather than per partner: one
      address reads one partner's giving, so there is never a question of which
      dashboard a code opens. Adding the same address to a second partner is
      refused out loud rather than resolved by a rule nobody would remember.

      ON DELETE CASCADE, unlike pledges. A reader is permission and nothing
      else — with the partner gone there is nothing left to read, and a row
      pointing at a partner who is not there is a permission nobody can see to
      take away.
    */
    await db`
      CREATE TABLE IF NOT EXISTS partner_readers (
        id         TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        email      TEXT UNIQUE NOT NULL,
        name       TEXT NOT NULL DEFAULT '',
        note       TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    /*
      Read on the sign-in path by partner id, to list who else is on a partner,
      and by email on every code request. The email side is served by the unique
      constraint above; this is the other one.
    */
    await db`
      CREATE INDEX IF NOT EXISTS partner_readers_partner_idx
        ON partner_readers (partner_id)
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

    /*
      One letter written in /app and sent out over the ministry's name.

      The row exists because a bulk email is the one thing the tool does that
      cannot be looked at afterwards. A need can be re-read on its page and a
      pledge can be re-read in the ledger; a letter that has left is gone, and
      "did we already tell the partners about the kitchen?" is a question
      somebody asks a fortnight later with no way to answer it. So the words are
      kept as they were typed, along with who pressed send and who it reached.

      `recipients` is the addresses as they were resolved at that moment, not the
      audience re-run today: a partner added next week was not sent this, and a
      list rebuilt from `audience` would quietly claim they were.

      `status` starts at 'sending' and is written once more when the last message
      has been handed over — see lib/letters.ts. A row still saying 'sending' an
      hour later means the process died holding it, which is worth being able to
      see rather than being tidied away into a success.
    */
    await db`
      CREATE TABLE IF NOT EXISTS letters (
        id           TEXT PRIMARY KEY,
        subject      TEXT NOT NULL,
        eyebrow      TEXT NOT NULL DEFAULT '',
        heading      TEXT NOT NULL,
        body         TEXT NOT NULL,
        button_label TEXT NOT NULL DEFAULT '',
        button_url   TEXT NOT NULL DEFAULT '',
        signed_by    TEXT NOT NULL DEFAULT '',
        greet        BOOLEAN NOT NULL DEFAULT true,
        audience     TEXT NOT NULL,
        recipients   JSONB NOT NULL DEFAULT '[]'::jsonb,
        status       TEXT NOT NULL DEFAULT 'sending',
        sent_count   INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        error        TEXT NOT NULL DEFAULT '',
        sent_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at  TIMESTAMPTZ
      )
    `;

    await db`
      CREATE INDEX IF NOT EXISTS letters_created_idx ON letters (created_at DESC)
    `;
  })();

  return schemaReady;
}
