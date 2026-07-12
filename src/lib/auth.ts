import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ensureSchema, isDatabaseConfigured, sql } from "./db";
import { hashPassword, verifyPassword } from "./password";

const COOKIE = "jepegomi_app";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = { id: string; name: string; email: string };

/**
 * The CMS needs two things: a secret to sign session cookies with, and a
 * database to keep people and content in. Without both, /app explains what is
 * missing instead of pretending to work.
 */
export function isConfigured() {
  return Boolean(process.env.APP_SESSION_SECRET) && isDatabaseConfigured();
}

function signingKey() {
  const key = process.env.APP_SESSION_SECRET;
  if (!key) throw new Error("APP_SESSION_SECRET is not set.");
  return key;
}

function sign(payload: string) {
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function startSession(userId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;

  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
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
  if (await hasAnyUser()) {
    throw new Error("An account already exists.");
  }

  const user = await createUser(input);
  await startSession(user.id);
  return user;
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

  await startSession(row.id);
  return true;
}

export async function signOut() {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * The signed-in person, or null. Verifies the cookie's signature and expiry
 * before it will touch the database, so a forged cookie costs us nothing.
 */
export async function currentUser(): Promise<SessionUser | null> {
  if (!isConfigured()) return null;

  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const [userId, expiresAt, signature] = raw.split(".");
  if (!userId || !expiresAt || !signature) return null;
  if (Number(expiresAt) < Date.now()) return null;
  if (!safeEqual(signature, sign(`${userId}.${expiresAt}`))) return null;

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
