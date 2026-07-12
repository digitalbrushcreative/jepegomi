import { cacheLife, cacheTag } from "next/cache";
import { isDatabaseConfigured, sql } from "@/lib/db";
import { type ContentOf, type DocumentKey, documents } from "./schema";

/** One cache tag per document, so saving one page never rebuilds another. */
export function contentTag(key: DocumentKey) {
  return `content:${key}`;
}

/**
 * Read a document's content.
 *
 * Cached with a long life and invalidated by tag rather than by clock: content
 * changes when somebody changes it, so there is no point expiring it on a timer.
 * The save action calls `updateTag(contentTag(key))`, which expires this entry
 * the moment the edit lands.
 *
 * Saved values are layered over the defaults, so a field that has never been
 * edited — or one added to the schema after the last save — still renders. If
 * the database is unset or unreachable, the page renders its defaults and the
 * public site carries on as though the CMS were never installed.
 */
export async function getContent<K extends DocumentKey>(
  key: K,
): Promise<ContentOf<K>> {
  "use cache";
  cacheTag(contentTag(key));
  cacheLife("max");

  const defaults = documents[key].defaults;

  if (!isDatabaseConfigured()) return defaults;

  try {
    const rows = await sql()`SELECT data FROM content WHERE key = ${key}`;
    const saved = rows[0]?.data as Record<string, unknown> | undefined;
    if (!saved) return defaults;

    return { ...defaults, ...saved } as ContentOf<K>;
  } catch (error) {
    console.error(`CMS: could not read "${key}", falling back to defaults.`, error);
    return defaults;
  }
}
