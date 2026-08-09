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

/**
 * The one exchange rate, out of the Site details box somebody typed it into.
 *
 * Falls back to a sane figure rather than to zero or NaN: a blank or mistyped
 * rate must never turn every dollar on the site into "$0" or "$NaN", and being
 * a little out of date is a far smaller wrong than being nonsense. The default
 * matches the schema's, so an untouched site and a cleared box agree.
 */
export const DEFAULT_KES_PER_USD = 129;

export function kesPerUsd(raw: unknown): number {
  const value = Number(String(raw ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_KES_PER_USD;
}

/**
 * Shillings to whole dollars, rounded to the nearest ten.
 *
 * Rounded because 150,000 shillings at 129 to the dollar is $1,162.79, and
 * those seventy-nine cents claim a precision an estimate has no business
 * claiming. The rate moves daily and a supplier's price is a negotiation; a
 * round figure tells the truth about its own accuracy.
 */
export function usdFromKes(priceKes: number, rate: number): number {
  if (!(rate > 0)) return 0;
  return Math.round(priceKes / rate / 10) * 10;
}

/**
 * The same, blunter, for a figure in the tens of thousands. Two million
 * shillings divided by a rate is $15,503.88, and those eighty-eight cents are a
 * lie about how precisely anybody knows this.
 */
export function usdCentsFromKes(priceKes: number, rate: number): number {
  if (!(rate > 0)) return 0;
  return Math.round(priceKes / rate / 100) * 100 * 100;
}

/**
 * The bus, priced.
 *
 * Both figures a page needs — the shillings the dealer quoted and the dollars a
 * reader in Pennsylvania can act on — worked out in one place so the two can
 * never be converted at different rates on different pages.
 */
export function busPrice(priceKesRaw: unknown, kesPerUsdRaw: unknown) {
  const priceKes = Number(String(priceKesRaw ?? "").replace(/[^\d]/g, "")) || 0;
  const rate = kesPerUsd(kesPerUsdRaw);

  return {
    priceKes,
    shillings: `KSh ${priceKes.toLocaleString("en-US")}`,
    usdCents: usdCentsFromKes(priceKes, rate),
  };
}
