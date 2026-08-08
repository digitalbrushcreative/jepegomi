import { revalidateTag } from "next/cache";
import { settlePayment } from "@/lib/payments";

/**
 * Pesapal telling us a payment changed.
 *
 * This is the channel that matters. The thank-you page asks too, but it only
 * exists while a giver has the tab open — they can close it, lose signal on the
 * way home, or approve an M-Pesa prompt ten minutes later on a phone that has
 * long since forgotten the browser. This endpoint is how those gifts still get
 * recorded, and it is the reason the ledger can be trusted at all.
 *
 * Deliberately outside the (site) route group: it has no business inheriting a
 * layout with a header and a footer, and nothing here is ever seen by a person.
 *
 * Registered as a GET (see lib/pesapal.ts), so the notification arrives as
 * query parameters — nothing to parse, nothing to fail at parsing, and no body
 * that can arrive truncated.
 *
 * Note what is *not* trusted: the notification says only "order X changed". It
 * carries no amount and no status, and none would be believed if it did —
 * `settlePayment` goes and asks Pesapal directly. Anyone on the internet can
 * call this URL with any order id; the worst they achieve is making us ask
 * Pesapal a question we already know the answer to.
 */
type Notification = {
  trackingId: string;
  merchantReference: string;
  notificationType: string;
};

async function handle({
  trackingId,
  merchantReference,
  notificationType,
}: Notification) {
  /*
    Pesapal reads this JSON to decide whether the notification was delivered,
    and retries when it does not get a 200 with `status: 200` in the body. So
    the acknowledgement is built once, up here, and every path below returns it
    — including the failures.

    Answering 500 on our own errors is the point: a database that was down for
    a moment should make Pesapal try again, and it will. Answering 200 to a
    notification we could not process would throw the gift away silently, which
    is the single most expensive bug this file could have.
  */
  const acknowledge = (status: number) =>
    Response.json(
      {
        orderNotificationType: notificationType,
        orderTrackingId: trackingId,
        orderMerchantReference: merchantReference,
        status,
      },
      { status: status === 200 ? 200 : 500 },
    );

  if (!trackingId) return acknowledge(500);

  try {
    const settlement = await settlePayment(trackingId);

    /*
      revalidateTag, not updateTag: the latter is Server-Actions-only. "max"
      gives stale-while-revalidate, which is right here — nobody is standing in
      front of this endpoint waiting to see their own write, and the pages
      carrying these balances would rather serve instantly and refresh behind.
    */
    for (const tag of settlement.tags) revalidateTag(tag, "max");

    /*
      An order we have never heard of is still acknowledged. It is not an error
      on Pesapal's side, and answering 500 would have them retry a notification
      that can never succeed, for ever.
    */
    return acknowledge(200);
  } catch (error) {
    console.error("Pesapal IPN: could not settle.", trackingId, error);
    return acknowledge(500);
  }
}

function fromQuery(request: Request): Notification {
  const params = new URL(request.url).searchParams;
  return {
    trackingId: params.get("OrderTrackingId") ?? "",
    merchantReference: params.get("OrderMerchantReference") ?? "",
    notificationType: params.get("OrderNotificationType") ?? "IPNCHANGE",
  };
}

export async function GET(request: Request) {
  return handle(fromQuery(request));
}

/**
 * Registration asks for GET (see lib/pesapal.ts), so this should never be
 * called. It is here because a notification arriving by a method we answer 405
 * to is a gift that silently never lands, and somebody switching the
 * registration to POST in the Pesapal dashboard is far too expensive a way to
 * discover that.
 *
 * A POST carries its fields in a JSON body rather than the query string, so it
 * cannot simply be forwarded to the GET handler — that would look for
 * parameters that are not there and reject every notification as unknown. The
 * query string is still consulted as a fallback, because it costs one line and
 * covers Pesapal sending both.
 */
export async function POST(request: Request) {
  const fallback = fromQuery(request);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Not JSON, or empty. The query string may still carry it.
  }

  const pick = (key: string, spare: string) =>
    body[key] === undefined || body[key] === null ? spare : String(body[key]);

  return handle({
    trackingId: pick("OrderTrackingId", fallback.trackingId),
    merchantReference: pick("OrderMerchantReference", fallback.merchantReference),
    notificationType: pick("OrderNotificationType", fallback.notificationType),
  });
}
