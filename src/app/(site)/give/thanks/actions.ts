"use server";

import { updateTag } from "next/cache";
import { describeGift, settlePayment } from "@/lib/payments";

/**
 * Asking, from the giver's own browser, what became of their payment.
 *
 * This exists because the IPN is not guaranteed to have arrived yet. Pesapal
 * notifies our server and redirects the giver's browser as two independent
 * events, and an M-Pesa prompt in particular can still be sitting unanswered on
 * a phone when the browser comes back. So the thank-you page asks too, and goes
 * on asking for a short while, rather than telling somebody who has just paid
 * that nothing happened.
 *
 * It is a Server Action rather than the page doing this during its own render
 * for one concrete reason: settling a payment moves the ledger, and the cache
 * tags for the pages showing that ledger can only be updated from an action.
 * A page that reconciled while rendering would leave every other visitor
 * looking at the balance from before the gift.
 *
 * The tracking id comes from the URL and is therefore attacker-supplied, which
 * costs nothing here: it is a v4 UUID minted by Pesapal, `settlePayment` only
 * acts on payments already in our own table, and what a caller gets back for
 * guessing one correctly is the receipt for a gift they would have had to make.
 */

export type Outcome = {
  state: "paid" | "failed" | "pending" | "unknown";
  /** The ledger's figure — "$250". Absent when we do not know the payment. */
  amount?: string;
  towards?: string;
  needUrl?: string;
  /** What was actually taken — "KES 32,375". Paid gifts only. */
  charged?: string;
  method?: string;
  confirmationCode?: string;
};

export async function confirmPayment(trackingId: string): Promise<Outcome> {
  if (!trackingId) return { state: "unknown" };

  let settlement;
  try {
    settlement = await settlePayment(trackingId);
  } catch (error) {
    /*
      Pesapal unreachable, or the database. Reported as "pending" rather than
      "failed" because that is the truth: we do not know, and the honest screen
      for not knowing is the one that says we are still checking. Calling it
      failed would tell somebody whose money has left their account that it has
      not.
    */
    console.error("Giving: could not settle a payment.", error);
    return { state: "pending" };
  }

  for (const tag of settlement.tags) updateTag(tag);

  const gift = settlement.payment
    ? await describeGift(settlement.payment.pledgeId)
    : null;

  return {
    state: settlement.outcome,
    amount: gift?.amount,
    towards: gift?.towards,
    needUrl: gift?.needUrl,
    charged: settlement.charged,
    method: settlement.method,
    confirmationCode: settlement.confirmationCode,
  };
}
