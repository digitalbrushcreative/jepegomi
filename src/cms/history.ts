import { sql } from "@/lib/db";
import type { DocumentKey } from "./schema";

/**
 * Who last touched what.
 *
 * The Pages screen prints it against every document and the dashboard lists the
 * most recent handful, so the read lives here rather than in either of them.
 * It is one query for the whole table — a dozen rows, joined to the person who
 * saved them.
 */
export type Edit = { key: DocumentKey; at: Date; by: string | null };

export async function listEdits(): Promise<Map<DocumentKey, Edit>> {
  const byKey = new Map<DocumentKey, Edit>();

  try {
    const rows = (await sql()`
      SELECT c.key, c.updated_at, u.name
      FROM content c
      LEFT JOIN users u ON u.id = c.updated_by
      ORDER BY c.updated_at DESC
    `) as { key: string; updated_at: string; name: string | null }[];

    for (const row of rows) {
      byKey.set(row.key as DocumentKey, {
        key: row.key as DocumentKey,
        at: new Date(row.updated_at),
        by: row.name,
      });
    }
  } catch (error) {
    console.error("CMS: could not read the edit history.", error);
  }

  return byKey;
}

/** The same list, newest first — what the dashboard shows. */
export async function recentEdits(limit = 5): Promise<Edit[]> {
  const edits = [...(await listEdits()).values()];
  edits.sort((a, b) => b.at.getTime() - a.at.getTime());
  return edits.slice(0, limit);
}

/**
 * Days, not timestamps. Somebody checking whether they already fixed a typo
 * wants "yesterday", not a date they have to do arithmetic on — but past a
 * week the date is the more useful of the two.
 */
export function describeEdit(edit: Edit | undefined) {
  if (!edit) return "Never edited";

  const days = Math.floor((Date.now() - edit.at.getTime()) / 86_400_000);
  const when =
    days <= 0
      ? "today"
      : days === 1
        ? "yesterday"
        : days < 7
          ? `${days} days ago`
          : edit.at.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

  return edit.by ? `${edit.by}, ${when}` : `Edited ${when}`;
}
