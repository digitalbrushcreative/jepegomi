/**
 * Money, in whole cents.
 *
 * Every figure in the giving ledger is an integer number of cents, never a
 * float. A need costing $1,138 that three churches split between them has to
 * add back up to $1,138 exactly, and floating-point dollars do not: they land a
 * hundredth out and leave a page that says "$0.00 still open" beside a button
 * that will not close. A giving page whose columns do not sum is worse than no
 * giving page at all.
 *
 * Postgres holds these as INTEGER, which tops out at $21 million — far past
 * anything this ministry will raise, and comfortably inside the range both
 * drivers hand back as a JavaScript number rather than a string. (SUM() widens
 * to BIGINT and *is* returned as a string, which is why every total in
 * src/lib/needs.ts is cast back down with ::int.)
 */

/** "$850", or "$12.50" when there are cents to show. */
export function usd(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Reads what somebody typed into an amount box — "400", "$400", "1,000.50".
 *
 * Returns null for anything that is not a positive amount of money, so the form
 * can say so in words rather than quietly storing a NaN and breaking every
 * total on the page that shows it.
 */
export function parseUsd(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const cents = Math.round(Number(cleaned) * 100);
  if (cents <= 0 || !Number.isSafeInteger(cents)) return null;
  return cents;
}

/** Whole percent, clamped — a bar cannot be 103% full. */
export function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / whole) * 100)));
}
