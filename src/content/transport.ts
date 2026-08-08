/**
 * School transport — the van the academy runs, and the bus it is raising for.
 *
 * The prose for /programs/transport lives in the CMS so Simon can rewrite it.
 * These are the figures, and they are here instead because they are arithmetic:
 * the gap is the target less what is held, and a number typed into a CMS box
 * cannot be relied on to still equal that after somebody edits one of the other
 * two.
 */

/**
 * The bus is priced in shillings because that is the currency it was quoted in
 * — a Kenyan bus from a Kenyan dealer. The dollar figure on the page is
 * converted from this and never the other way round, so a move in the exchange
 * rate moves the dollars and leaves the real price alone.
 *
 * Rate checked August 2026. One constant on purpose: when it drifts far enough
 * to matter, this is the single line to change and every dollar figure on the
 * page follows it.
 */
export const KES_PER_USD = 129;

/** The vehicle the academy owns today, how it was paid for, and what is wrong with it. */
export const van = {
  name: "Jepegomi Academy School van",
  onTheRoad: false,
  /**
   * What was given toward a school vehicle, and what bought this one. Spent —
   * it is the van standing in the yard, not a balance anybody can draw on. It
   * is stated on the page because somebody who gave toward transport is owed
   * the sentence that says where their money went.
   */
  purchaseGiftUsdCents: 5_000_00,
  /**
   * Given by the same congregation behind the kitchen — unnamed on the site,
   * see `donation` in content/kitchen.ts for why — specifically to repair this
   * van and return it to service. Separate money from the bus fund below, for a
   * separate purpose, and shown separately so neither flatters the other.
   */
  repairGiftUsdCents: 1_000_00,
} as const;

export const bus = {
  seats: 26,
  priceKes: 2_000_000,
  /**
   * Nothing is held toward the bus. The $5,000 given for a school vehicle is
   * the van above — it bought it — and showing that money here as well would
   * be counting one gift twice, once as a vehicle and once as a bank balance.
   *
   * When money does start being held for the bus, this is the only line to
   * change: the pages read the gap, the percentage and the figure row off it,
   * and the ask grows a raised figure again on its own.
   */
  heldUsdCents: 0,
} as const;

/**
 * The price in dollars, rounded to the nearest hundred.
 *
 * Deliberately blunt. Dividing 2,000,000 shillings by a rate gives $15,503.88,
 * and those eighty-eight cents are a lie about how precisely anybody knows
 * this: the rate moves daily and the price is a negotiation. A round figure
 * tells the truth about its own accuracy.
 */
export const busCostUsdCents =
  Math.round(bus.priceKes / KES_PER_USD / 100) * 100 * 100;

export const busGapUsdCents = Math.max(0, busCostUsdCents - bus.heldUsdCents);

/** "KSh 2,000,000" */
export const priceInShillings = `KSh ${bus.priceKes.toLocaleString("en-US")}`;
