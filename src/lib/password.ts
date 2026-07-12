import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * scrypt, from the standard library — no dependency, and deliberately slow, so
 * a stolen hash is expensive to attack. Stored as "salt:hash"; the salt is
 * random per password, so two people choosing the same password don't collide.
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}
