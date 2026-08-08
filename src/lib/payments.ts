import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { type GiftDetails, giftNotification, giftReceipt, queue } from "@/lib/mail";
import { usd } from "@/lib/money";
import { chargeFor, submitOrder, transactionStatus } from "@/lib/pesapal";
import { NEEDS_TAG, needTag, setPledgeStatus } from "@/lib/needs";
import { site } from "@/lib/site";

/**
 * Where a payment meets the ledger.
 *
 * lib/pesapal.ts knows how to ask Pesapal things. This file knows what the
 * answers mean: which pledge a payment belongs to, when a promise becomes money
 * that has arrived, and — the part that is easy to forget — when it does not,
 * so that the amount somebody half-paid for goes back on the shelf.
 *
 * The rule that shapes everything here is that **nothing may be settled twice**.
 * Pesapal tells us a payment succeeded through two channels that race each
 * other: the giver's browser coming back to /give/thanks, and an IPN hitting
 * the route handler, in whichever order the network feels like. Both call
 * `settlePayment`. Exactly one of them may send the thank-you email and move
 * the pledge, so the transition is a conditional UPDATE — the row moves to
 * 'paid' only from a status that is not already 'paid', and whoever loses that
 * race is told the work was already done and quietly stops.
 */

/* ------------------------------------------------------------------ shapes */

export type PaymentStatus = "started" | "paid" | "failed" | "abandoned";

export type Payment = {
  id: string;
  pledgeId: string;
  reference: string;
  trackingId: string | null;
  amountCents: number;
  chargedAmount: number;
  chargedCurrency: string;
  status: PaymentStatus;
  method: string;
  confirmationCode: string;
};

const str = (value: unknown) => String(value ?? "");
const int = (value: unknown) => Number(value ?? 0);

function toPayment(row: Record<string, unknown>): Payment {
  return {
    id: str(row.id),
    pledgeId: str(row.pledge_id),
    reference: str(row.reference),
    trackingId: row.tracking_id ? str(row.tracking_id) : null,
    amountCents: int(row.amount_cents),
    chargedAmount: Number(row.charged_amount ?? 0),
    chargedCurrency: str(row.charged_currency),
    status: str(row.status) as PaymentStatus,
    method: str(row.method),
    confirmationCode: str(row.confirmation_code),
  };
}

/**
 * How the charged figure is written wherever a person will read it — "KES
 * 32,375", "USD 250.00". Not lib/money.ts's `usd()`, which formats the ledger's
 * own dollars and would be a lie about what the card was actually debited.
 */
export function charged(amount: number, currency: string) {
  const whole = Number.isInteger(amount);
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ----------------------------------------------------------------- opening */

/**
 * Opens a payment against a pledge that already exists, and returns where to
 * send the giver.
 *
 * The pledge is written first, by the caller, and deliberately: it is what
 * holds the amount against the need's balance while the giver is away at the
 * card page. Two churches sent to Pesapal for the last $450 of the same water
 * tank would otherwise both pay for it.
 *
 * If Pesapal will not open the order, the row is marked failed here rather than
 * left dangling — the caller then withdraws the pledge and tells the giver, and
 * the balance is back within the same request.
 */
export async function startPayment(input: {
  pledgeId: string;
  amountCents: number;
  description: string;
  giver: { name: string; email: string };
}): Promise<{ redirectUrl: string; payment: Payment }> {
  const id = randomUUID();
  /*
    Pesapal requires the merchant reference to be unique across every order the
    account has ever taken, and rejects a repeat outright. A UUID satisfies that
    without leaking how many gifts the ministry has had, which a counter would.
  */
  const reference = `JPG-${id.slice(0, 8).toUpperCase()}`;
  const quote = chargeFor(input.amountCents);

  await sql()`
    INSERT INTO payments (id, pledge_id, reference, amount_cents,
                          charged_amount, charged_currency, rate)
    VALUES (${id}, ${input.pledgeId}, ${reference}, ${input.amountCents},
            ${quote.amount}, ${quote.currency}, ${quote.rate})
  `;

  let order;
  try {
    order = await submitOrder({
      reference,
      amountCents: input.amountCents,
      description: input.description,
      giver: input.giver,
    });
  } catch (error) {
    await sql()`
      UPDATE payments
      SET status = 'failed', note = ${String(error).slice(0, 500)}
      WHERE id = ${id}
    `;
    throw error;
  }

  const rows = await sql()`
    UPDATE payments SET tracking_id = ${order.trackingId}
    WHERE id = ${id}
    RETURNING *
  `;

  return { redirectUrl: order.redirectUrl, payment: toPayment(rows[0]) };
}

export async function findPaymentByTracking(
  trackingId: string,
): Promise<Payment | null> {
  const rows = await sql()`
    SELECT * FROM payments WHERE tracking_id = ${trackingId}
  `;
  return rows[0] ? toPayment(rows[0]) : null;
}

/* --------------------------------------------------------------- settling */

export type Settlement = {
  outcome: "paid" | "failed" | "pending" | "unknown";
  /** Cache tags the caller should invalidate. Empty unless the ledger moved. */
  tags: string[];
  payment: Payment | null;
  /** True when somebody else had already settled it — no email was sent. */
  alreadySettled: boolean;
  /** Present when paid: what the giver should be told they paid. */
  charged?: string;
  method?: string;
  confirmationCode?: string;
};

/**
 * Everything the two gift emails need, for a pledge that has just been paid —
 * and, with most of it thrown away, what the thank-you screen says.
 *
 * Exported for that second caller, which takes the amount and what it was
 * towards and nothing else. The giver's own address is in here because an email
 * needs it; it does not follow that a page should be handed it.
 */
export async function describeGift(pledgeId: string): Promise<GiftDetails | null> {
  const rows = await sql()`
    SELECT p.amount_cents, p.designation, p.message,
           n.slug AS need_slug, n.title AS need_title, n.cost_cents,
           l.claimed_cents,
           pt.name, pt.email, pt.kind, pt.location, pt.contact_name
    FROM pledges p
    LEFT JOIN needs n        ON n.id = p.need_id
    LEFT JOIN need_ledger l  ON l.need_id = p.need_id
    LEFT JOIN partners pt    ON pt.id = p.partner_id
    WHERE p.id = ${pledgeId}
  `;

  const row = rows[0];
  if (!row) return null;

  const slug = row.need_slug ? str(row.need_slug) : "";

  return {
    amount: usd(int(row.amount_cents)),
    towards: slug ? str(row.need_title) : str(row.designation) || "the ministry",
    needUrl: slug ? `${site.url}/needs/${slug}` : undefined,
    /*
      Read after the pledge has been counted, so this is the balance as it now
      stands rather than as it stood a moment ago. `claimed_cents` already
      includes this gift — the view counts every pledge that is not withdrawn.
    */
    remaining: slug
      ? usd(Math.max(0, int(row.cost_cents) - int(row.claimed_cents)))
      : undefined,
    partnerName: str(row.name),
    partnerEmail: str(row.email),
    partnerKind: str(row.kind),
    location: str(row.location),
    contactName: str(row.contact_name),
    message: str(row.message),
  };
}

/**
 * Asks Pesapal what happened to a payment, and makes the ledger agree with it.
 *
 * Safe to call as often as anybody likes, from either channel, in any order.
 *
 * Note which status codes move money and which do not. Only 1 (COMPLETED) is
 * treated as paid. 2 (FAILED) and 3 (REVERSED) withdraw the pledge, putting the
 * amount back on the need for somebody else. 0 (INVALID) is left alone on
 * purpose: it is what Pesapal says about an order nobody has finished paying
 * yet, and an M-Pesa prompt sitting unanswered on a phone in Nairobi is not a
 * failure — it is a gift that has not happened yet. Those are swept up later by
 * `releaseAbandonedPayments`.
 */
export async function settlePayment(trackingId: string): Promise<Settlement> {
  const payment = await findPaymentByTracking(trackingId);
  if (!payment) return { outcome: "unknown", tags: [], payment: null, alreadySettled: false };

  if (payment.status === "paid") {
    return {
      outcome: "paid",
      tags: [],
      payment,
      alreadySettled: true,
      charged: charged(payment.chargedAmount, payment.chargedCurrency),
      method: payment.method,
      confirmationCode: payment.confirmationCode,
    };
  }

  const status = await transactionStatus(trackingId);

  if (!status.settled) {
    if (status.code !== 2 && status.code !== 3) {
      return { outcome: "pending", tags: [], payment, alreadySettled: false };
    }

    /*
      Withdrawing the pledge is what returns the amount to the need's balance —
      the ledger view counts every pledge that is not 'declined'. Guarded on the
      pledge still being 'pending' so a retry that has already succeeded through
      a second payment row is never un-received by the first one's failure.
    */
    await sql()`
      UPDATE payments
      SET status = 'failed', note = ${status.description || status.message},
          method = ${status.method}
      WHERE id = ${payment.id} AND status <> 'paid'
    `;
    await sql()`
      UPDATE pledges SET status = 'declined', decided_at = now()
      WHERE id = ${payment.pledgeId} AND status = 'pending'
    `;

    const slug = await slugOfPledge(payment.pledgeId);
    return {
      outcome: "failed",
      tags: slug ? [NEEDS_TAG, needTag(slug)] : [NEEDS_TAG],
      payment,
      alreadySettled: false,
    };
  }

  /*
    The one line that decides who won the race. `status <> 'paid'` means the
    second caller updates nothing, gets no row back, and takes the branch that
    sends no email — so a giver is thanked once however many times Pesapal and
    their own browser tell us the same good news.
  */
  const claimed = await sql()`
    UPDATE payments SET
      status = 'paid',
      method = ${status.method},
      confirmation_code = ${status.confirmationCode},
      settled_at = now()
    WHERE id = ${payment.id} AND status <> 'paid'
    RETURNING *
  `;

  if (claimed.length === 0) {
    const settled = await findPaymentByTracking(trackingId);
    return {
      outcome: "paid",
      tags: [],
      payment: settled,
      alreadySettled: true,
      charged: settled ? charged(settled.chargedAmount, settled.chargedCurrency) : undefined,
      method: settled?.method,
      confirmationCode: settled?.confirmationCode,
    };
  }

  const slug = await setPledgeStatus(payment.pledgeId, "received");
  const gift = await describeGift(payment.pledgeId);

  if (gift) {
    const paid = {
      method: status.method || "Pesapal",
      confirmationCode: status.confirmationCode,
      charged: charged(payment.chargedAmount, payment.chargedCurrency),
    };
    /*
      Both queued, unlike the promise path in give/actions.ts which waits on the
      giver's copy. There it waited because the screen had to say truthfully
      whether the account details had been emailed. Here there are no account
      details to send — the money has already arrived — so the thank-you on
      screen is true whether or not the email lands, and nothing is gained by
      making the giver wait for a mail provider.
    */
    queue(giftNotification({ ...gift, paid }));
    queue(giftReceipt({ ...gift, paid }));
  }

  return {
    outcome: "paid",
    tags: slug ? [NEEDS_TAG, needTag(slug)] : [NEEDS_TAG],
    payment: toPayment(claimed[0]),
    alreadySettled: false,
    charged: charged(payment.chargedAmount, payment.chargedCurrency),
    method: status.method,
    confirmationCode: status.confirmationCode,
  };
}

async function slugOfPledge(pledgeId: string): Promise<string> {
  const rows = await sql()`
    SELECT n.slug FROM pledges p
    JOIN needs n ON n.id = p.need_id
    WHERE p.id = ${pledgeId}
  `;
  return rows[0] ? str(rows[0].slug) : "";
}

/* ----------------------------------------------------------- the sweep-up */

/**
 * Puts back what nobody ever paid for.
 *
 * A giver who reaches Pesapal and closes the tab leaves a pledge holding part
 * of a need's balance against a payment that will never arrive. Pesapal sends
 * no notification for that — there is nothing to notify — so the only way the
 * amount ever comes back is if we go and look.
 *
 * Forty-five minutes, which is long enough for the slowest honest case: an
 * M-Pesa prompt on a phone that was in another room, or a giver who went to
 * find their card. A payment that settles after being swept is still honoured —
 * `settlePayment` moves a row to 'paid' from any status that is not already
 * 'paid', and puts the pledge back to received.
 *
 * Called at the top of a new checkout rather than on a schedule, because that
 * is the only moment a stale hold does any harm: it is the giver arriving next
 * who would otherwise be told the item is fuller than it is.
 */
export async function releaseAbandonedPayments(): Promise<number> {
  const stale = await sql()`
    UPDATE payments
    SET status = 'abandoned'
    WHERE status = 'started'
      AND created_at < now() - INTERVAL '45 minutes'
    RETURNING pledge_id
  `;

  if (stale.length === 0) return 0;

  /*
    Withdrawn only where the pledge is still pending and has no *other* payment
    that succeeded — a giver whose first attempt timed out and whose second one
    worked must not have the good one undone by the sweep catching up with the
    bad one.
  */
  for (const row of stale) {
    await sql()`
      UPDATE pledges SET status = 'declined', decided_at = now()
      WHERE id = ${str(row.pledge_id)}
        AND status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM payments
          WHERE pledge_id = ${str(row.pledge_id)} AND status = 'paid'
        )
    `;
  }

  return stale.length;
}

/* ------------------------------------------------------------ reading back */

/**
 * A payment with the ledger around it — who paid, and what for.
 *
 * The `Payment` above is what the settling code needs, which is the row and
 * nothing else. This is what a person reading a list of takings needs, and a
 * person needs the name.
 */
export type PaymentRecord = Payment & {
  giverName: string | null;
  giverEmail: string | null;
  /** The item it went towards, or the giver's own words when there was no item. */
  towards: string;
  needSlug: string | null;
  rate: number;
  note: string;
  createdAt: string;
  settledAt: string | null;
};

function toRecord(row: Record<string, unknown>): PaymentRecord {
  return {
    ...toPayment(row),
    giverName: row.partner_name ? str(row.partner_name) : null,
    giverEmail: row.partner_email ? str(row.partner_email) : null,
    towards: row.need_title
      ? str(row.need_title)
      : str(row.designation) || "the ministry",
    needSlug: row.need_slug ? str(row.need_slug) : null,
    rate: Number(row.rate ?? 1),
    note: str(row.note),
    createdAt: new Date(str(row.created_at)).toISOString(),
    settledAt: row.settled_at ? new Date(str(row.settled_at)).toISOString() : null,
  };
}

/**
 * Every attempt to pay on the site, newest first.
 *
 * Every attempt, not every success: a card that was declined and an M-Pesa
 * prompt nobody answered are both things Simon may be asked about — "I tried to
 * give and it didn't work" is a message that arrives, and this is the screen
 * that answers it. The status column is what separates them.
 *
 * Never cached. This is money, and a figure that is four minutes stale is worse
 * than one that took a moment to fetch.
 */
export async function listPayments(limit = 200): Promise<PaymentRecord[]> {
  const rows = await sql()`
    SELECT pay.*, pd.designation, pd.need_slug, pd.need_title,
           pd.partner_name, pd.partner_email
    FROM payments pay
    LEFT JOIN pledge_detail pd ON pd.id = pay.pledge_id
    ORDER BY pay.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(toRecord);
}

/**
 * The takings, totalled.
 *
 * Two currencies on purpose: `receivedCents` is the ledger's own dollars, which
 * is what the needs meters are denominated in, and `chargedByCurrency` is what
 * the merchant account actually took — which is what a Pesapal statement will
 * say, and therefore the only figure it can be reconciled against.
 */
export type PaymentTotals = {
  paidCount: number;
  receivedCents: number;
  chargedByCurrency: Record<string, number>;
  /** Attempts that came to nothing: declined, reversed, or never answered. */
  failedCount: number;
  /** Still out there — a giver who is on the Pesapal page right now. */
  inFlightCount: number;
};

export function totalPayments(payments: PaymentRecord[]): PaymentTotals {
  const totals: PaymentTotals = {
    paidCount: 0,
    receivedCents: 0,
    chargedByCurrency: {},
    failedCount: 0,
    inFlightCount: 0,
  };

  for (const payment of payments) {
    if (payment.status === "paid") {
      totals.paidCount += 1;
      totals.receivedCents += payment.amountCents;
      totals.chargedByCurrency[payment.chargedCurrency] =
        (totals.chargedByCurrency[payment.chargedCurrency] ?? 0) +
        payment.chargedAmount;
    } else if (payment.status === "started") {
      totals.inFlightCount += 1;
    } else {
      totals.failedCount += 1;
    }
  }

  return totals;
}
