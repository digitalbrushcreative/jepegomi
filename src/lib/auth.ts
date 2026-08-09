import { randomUUID } from "node:crypto";
import { ensureSchema, isDatabaseConfigured, sql } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { hasSessionSecret, session } from "./session";

/**
 * Simon & Joyce, and whoever else they let in. This is the /app side of the
 * house — the people who can change the site. Partner churches sign in
 * somewhere else entirely and are kept in their own table; see lib/partners.ts.
 */
const admin = session("admin", "jepegomi_app");

export type SessionUser = { id: string; name: string; email: string };

/**
 * The CMS needs two things: a secret to sign session cookies with, and a
 * database to keep people and content in. Without both, /app explains what is
 * missing instead of pretending to work.
 */
export function isConfigured() {
  return hasSessionSecret() && isDatabaseConfigured();
}

/**
 * Whether anybody has an account yet. When this is false, /app offers to create
 * the first one — that is the entire installation step.
 */
export async function hasAnyUser() {
  await ensureSchema();
  const rows = await sql()`SELECT 1 FROM users LIMIT 1`;
  return rows.length > 0;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  await ensureSchema();

  const id = randomUUID();
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);

  await sql()`
    INSERT INTO users (id, email, name, password_hash)
    VALUES (${id}, ${email}, ${input.name.trim()}, ${passwordHash})
  `;

  return { id, name: input.name.trim(), email } satisfies SessionUser;
}

/**
 * Creates the first account and signs them straight in. Refuses if an account
 * already exists, so this can't be used to mint a second admin — a signed-in
 * user invites the next one instead.
 */
export async function createFirstUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  await ensureSchema();

  const id = randomUUID();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const passwordHash = await hashPassword(input.password);

  /*
    The emptiness of the table is checked *inside* the insert, not before it.
    Read-then-write is the shape of thing that looks fine until two requests
    arrive together — both see no users, both insert, and the installation step
    that was supposed to mint exactly one administrator has minted two. That is
    a small window and an unusually expensive one to lose: this is the only
    endpoint on the site that hands out admin without anybody being signed in.

    Postgres evaluates the WHERE NOT EXISTS against the same snapshot as the
    insert, so the loser of the race inserts nothing and gets no row back.
  */
  const rows = await sql()`
    INSERT INTO users (id, email, name, password_hash)
    SELECT ${id}, ${email}, ${name}, ${passwordHash}
    WHERE NOT EXISTS (SELECT 1 FROM users)
    RETURNING id
  `;

  if (rows.length === 0) {
    throw new Error("An account already exists.");
  }

  await admin.start(id);
  return { id, name, email } satisfies SessionUser;
}

export async function signIn(email: string, password: string) {
  await ensureSchema();

  const rows = await sql()`
    SELECT id, name, email, password_hash
    FROM users
    WHERE email = ${email.trim().toLowerCase()}
  `;

  const row = rows[0] as
    | { id: string; name: string; email: string; password_hash: string }
    | undefined;

  if (!row) return false;
  if (!(await verifyPassword(password, row.password_hash))) return false;

  await admin.start(row.id);
  return true;
}

export async function signOut() {
  await admin.clear();
}

/**
 * The signed-in person, or null. The cookie's signature and expiry are checked
 * before the database is touched, so a forged cookie costs us nothing.
 */
export async function currentUser(): Promise<SessionUser | null> {
  if (!isConfigured()) return null;

  const userId = await admin.read();
  if (!userId) return null;

  try {
    const rows = await sql()`
      SELECT id, name, email FROM users WHERE id = ${userId}
    `;
    return (rows[0] as SessionUser | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}
