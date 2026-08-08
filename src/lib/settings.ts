import { sql } from "@/lib/db";

/**
 * The small drawer of things the site works out once and then has to remember.
 *
 * Not configuration — configuration is environment variables, set by a person
 * who is allowed to. This is the other kind: a value handed back by somebody
 * else's API that we would otherwise have to ask for again on every cold start.
 * At present that is one thing, the Pesapal IPN id.
 *
 * Deliberately not the `content` table. That one is the CMS, every row of it
 * editable at /app, and a registration id sitting in a text box somebody can
 * edit is a payment notification quietly going nowhere.
 */

export async function getSetting(key: string): Promise<string | null> {
  const rows = await sql()`SELECT value FROM settings WHERE key = ${key}`;
  const value = rows[0]?.value;
  return value === undefined || value === null ? null : String(value);
}

export async function setSetting(key: string, value: string) {
  await sql()`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}
