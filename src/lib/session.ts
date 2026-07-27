import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Signed cookie sessions, for the two different kinds of people who sign in.
 *
 * Simon & Joyce sign in at /app to run the site. A partner church signs in at
 * /partners to see what it has given. They are different people with different
 * powers, so neither must ever be able to become the other — and the way that
 * is guaranteed is the *scope*, which is folded into the signature but not into
 * the cookie. A partner's cookie value pasted into the admin cookie's name
 * fails its signature outright; it never reaches a database lookup that might
 * one day be relaxed into matching.
 *
 * The whole session is the cookie. There is no sessions table, because there is
 * nothing a sessions table would buy a site this size except another thing to
 * go wrong — and the cookie is signed, so it cannot be forged or extended.
 */

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function hasSessionSecret() {
  return Boolean(process.env.APP_SESSION_SECRET);
}

function signingKey() {
  const key = process.env.APP_SESSION_SECRET;
  if (!key) throw new Error("APP_SESSION_SECRET is not set.");
  return key;
}

function sign(scope: string, payload: string) {
  return createHmac("sha256", signingKey())
    .update(`${scope}:${payload}`)
    .digest("hex");
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type Session = {
  start(id: string): Promise<void>;
  /** The signed-in id, or null. Verified without touching the database, so a
   *  forged or expired cookie costs us nothing but the HMAC. */
  read(): Promise<string | null>;
  clear(): Promise<void>;
};

export function session(scope: string, cookieName: string): Session {
  return {
    async start(id) {
      const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
      const payload = `${id}.${expiresAt}`;

      const store = await cookies();
      store.set(cookieName, `${payload}.${sign(scope, payload)}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: MAX_AGE_SECONDS,
      });
    },

    async read() {
      const raw = (await cookies()).get(cookieName)?.value;
      if (!raw) return null;

      const [id, expiresAt, signature] = raw.split(".");
      if (!id || !expiresAt || !signature) return null;
      if (Number(expiresAt) < Date.now()) return null;
      if (!safeEqual(signature, sign(scope, `${id}.${expiresAt}`))) return null;

      return id;
    },

    async clear() {
      (await cookies()).delete(cookieName);
    },
  };
}
