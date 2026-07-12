import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "jepegomi_app";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secrets() {
  const passphrase = process.env.APP_PASSPHRASE;
  const signingKey = process.env.APP_SESSION_SECRET;
  if (!passphrase || !signingKey) return null;
  return { passphrase, signingKey };
}

export function isConfigured() {
  return secrets() !== null;
}

function sign(expiresAt: number, signingKey: string) {
  return createHmac("sha256", signingKey).update(String(expiresAt)).digest("hex");
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function signIn(attempt: string) {
  const config = secrets();
  if (!config) return false;
  if (!safeEqual(attempt, config.passphrase)) return false;

  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const store = await cookies();
  store.set(COOKIE, `${expiresAt}.${sign(expiresAt, config.signingKey)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function signOut() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isSignedIn() {
  const config = secrets();
  if (!config) return false;

  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;

  const [expiresAt, signature] = raw.split(".");
  if (!expiresAt || !signature) return false;
  if (Number(expiresAt) < Date.now()) return false;

  return safeEqual(signature, sign(Number(expiresAt), config.signingKey));
}
