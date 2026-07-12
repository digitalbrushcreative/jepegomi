import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

/**
 * The content store.
 *
 * One Postgres database holds two tables: the people who can sign in, and the
 * content itself. Content is a JSONB blob per page, keyed by the document key
 * in src/cms/schema.ts.
 *
 * The site is designed to run *without* this. If DATABASE_URL is unset — or the
 * database is unreachable — every page falls back to the defaults that live in
 * the schema registry, which are the words the site shipped with. A database
 * outage degrades the CMS, never the public site.
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
  })();

  return schemaReady;
}
