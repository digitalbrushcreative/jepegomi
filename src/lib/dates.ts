/**
 * Dates are carried around as ISO strings and turned into words here.
 *
 * They are strings rather than Date objects because most of them come out of a
 * `use cache` scope, and a value that crosses that boundary has to survive
 * being serialised and read back. A string always does; a Date depends on
 * which driver produced it — `pg` hands back a Date and Neon's HTTP driver
 * hands back a string, and code that worked locally and not in production
 * because of that is exactly the kind of bug nobody finds until a donor is
 * looking at the page.
 */

export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

/** "14 Mar 2026" — long enough to be unambiguous, short enough for a caption. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
