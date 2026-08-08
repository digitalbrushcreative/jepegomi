import { getSetting, setSetting } from "@/lib/settings";
import { site } from "@/lib/site";

/**
 * Pesapal — the one file that knows how to talk to it.
 *
 * Pesapal is the ministry's card and M-Pesa gateway. It is a Kenyan company,
 * which is the point: it settles into a Kenyan bank account in the ministry's
 * own registered name, so what a giver sees at the payment page is "Jesus
 * People Gospel Ministries" and not an individual's name. That is the same
 * reason lib/site.ts refuses to publish an account number — a fundraising site
 * whose money appears to be going to a person invites exactly one kind of
 * question, and it is not a kind worth inviting.
 *
 * The flow, which is four calls and worth stating once because the order of
 * them is not guessable:
 *
 *   1. RequestToken       consumer key + secret in, a JWT out. It is valid for
 *                         five minutes, so it is fetched per burst of work and
 *                         cached in memory, never stored.
 *   2. RegisterIPN        once per environment per domain, and the id it
 *                         returns is what every order is then tagged with. Kept
 *                         in `settings` (see lib/settings.ts) so this costs one
 *                         call in the lifetime of a deployment, not one a gift.
 *   3. SubmitOrderRequest the gift goes out, a redirect_url comes back, and the
 *                         giver's browser is sent to it.
 *   4. GetTransactionStatus
 *                         the only answer that counts. Neither the browser
 *                         coming back nor the IPN firing is *evidence* that
 *                         money moved — both are just a nudge saying "ask". So
 *                         both of them ask, and this is what they ask.
 *
 * Nothing in here writes to the ledger. lib/payments.ts does that, and does it
 * from the answer this file returns, so there is one place that decides what a
 * paid gift means and one place that knows how Pesapal phrases it.
 */

/* ------------------------------------------------------------------ config */

/*
  Sandbox and live are different hosts *and* different credentials — the demo
  account at cybqa is not the merchant account. So the environment is set
  explicitly rather than inferred from NODE_ENV, which would silently point a
  staging deployment at the real one and take real money in a test.
*/
const HOSTS = {
  sandbox: "https://cybqa.pesapal.com/pesapalv3",
  live: "https://pay.pesapal.com/v3",
} as const;

/**
 * Currencies whose smallest circulating unit is the unit itself. M-Pesa does
 * not move fifty cents of a shilling, and an order for KES 32,375.50 is an
 * order some payment methods will refuse outright — so these are rounded to
 * whole numbers and the rest to two places.
 */
const WHOLE_UNIT = new Set(["KES", "UGX", "TZS", "RWF", "MWK", "ZMW"]);

function config() {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!key || !secret) return null;

  const environment = process.env.PESAPAL_ENV === "sandbox" ? "sandbox" : "live";
  const currency = (process.env.PESAPAL_CURRENCY || "KES").toUpperCase();

  /*
    Dollars need no rate. Anything else does, and a missing one is treated as
    "Pesapal is not set up" rather than defaulting to 1 — a rate of 1 would
    charge a $250 gift as KES 250, which is about two dollars, and would do it
    quietly. Better the button never appears than that it appears and undercharges.
  */
  const rate = currency === "USD" ? 1 : Number(process.env.PESAPAL_USD_RATE);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  return {
    key,
    secret,
    currency,
    rate,
    host: HOSTS[environment],
    environment,
    /*
      Pesapal has to be able to reach the IPN URL and send the giver back to
      the callback, so both are absolute and neither can be localhost. In
      development that means a tunnel — set PESAPAL_CALLBACK_BASE to whatever
      it gives you. In production the site's own address is right.
    */
    base: (process.env.PESAPAL_CALLBACK_BASE || site.url).replace(/\/+$/, ""),
  };
}

/** Whether gifts can be paid on the site at all. The give form asks this. */
export function isPesapalConfigured() {
  return config() !== null;
}

/**
 * What Pesapal will actually be asked to take, for a gift the ledger holds in
 * US cents.
 *
 * The rate is returned alongside the figure, not just applied to it, because it
 * is written into the payment row. A gift reconciled six months later against a
 * bank statement is reconciled at the rate it was charged at, and a rate that
 * lives only in an environment variable is a rate nobody can look up after
 * somebody has edited it.
 */
export function chargeFor(amountCents: number) {
  const settings = config();
  if (!settings) throw new Error("Pesapal is not configured.");

  const raw = (amountCents / 100) * settings.rate;
  const amount = WHOLE_UNIT.has(settings.currency)
    ? Math.round(raw)
    : Math.round(raw * 100) / 100;

  return { amount, currency: settings.currency, rate: settings.rate };
}

/* ------------------------------------------------------------- the plumbing */

type PesapalError = { error?: { code?: string; message?: string } | null };

/**
 * Every call goes through here, so every call fails the same way.
 *
 * Pesapal answers HTTP 200 with an `error` object in the body when a request is
 * rejected, so checking `response.ok` alone would sail straight past a declined
 * order. Both are checked, and the message thrown is the one Pesapal wrote —
 * it is the only thing that makes a rejected order debuggable.
 */
async function call<T extends PesapalError>(
  path: string,
  init: { method: "GET" | "POST"; token?: string; body?: unknown },
): Promise<T> {
  const settings = config();
  if (!settings) throw new Error("Pesapal is not configured.");

  const response = await fetch(`${settings.host}${path}`, {
    method: init.method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    // A gift is never a cached read, and one served from a cache would be a
    // second giver told about the first giver's order.
    cache: "no-store",
  });

  const text = await response.text();

  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Pesapal ${path} returned ${response.status} that was not JSON: ${text.slice(0, 200)}`,
    );
  }

  if (!response.ok) {
    throw new Error(`Pesapal ${path} returned ${response.status}.`);
  }
  if (data.error) {
    const { code, message } = data.error;
    throw new Error(`Pesapal ${path} rejected the request: ${message ?? code ?? "no reason given"}`);
  }

  return data;
}

/*
  The token lives five minutes. Holding it for four and a half means a burst of
  work — submit an order, then read its status — costs one authentication
  rather than three, and the half-minute of margin covers a slow request that
  started while the token was still good.

  In memory only, and per process: a serverless instance that is recycled simply
  fetches another. A token in the database would be a credential at rest for no
  benefit at all.
*/
let cached: { token: string; expires: number } | null = null;

async function token(): Promise<string> {
  const settings = config();
  if (!settings) throw new Error("Pesapal is not configured.");

  if (cached && cached.expires > Date.now()) return cached.token;

  const data = await call<{ token?: string } & PesapalError>(
    "/api/Auth/RequestToken",
    {
      method: "POST",
      body: { consumer_key: settings.key, consumer_secret: settings.secret },
    },
  );

  if (!data.token) throw new Error("Pesapal did not return a token.");

  cached = { token: data.token, expires: Date.now() + 4.5 * 60 * 1000 };
  return data.token;
}

/* ------------------------------------------------------------------- IPN */

export const IPN_PATH = "/api/pesapal/ipn";

/**
 * The id every order is tagged with, registering the URL the first time it is
 * needed.
 *
 * Keyed by environment and URL together. Switching from sandbox to live, or
 * moving the site to another domain, therefore registers afresh rather than
 * tagging live orders with a sandbox registration — which fails in the most
 * expensive way available, by taking the money and never telling us.
 */
async function notificationId(): Promise<string> {
  const settings = config();
  if (!settings) throw new Error("Pesapal is not configured.");

  const url = `${settings.base}${IPN_PATH}`;
  const key = `pesapal:ipn:${settings.environment}:${url}`;

  const known = await getSetting(key);
  if (known) return known;

  const data = await call<{ ipn_id?: string } & PesapalError>(
    "/api/URLSetup/RegisterIPN",
    {
      method: "POST",
      token: await token(),
      // GET, so the notification arrives as query parameters and the route
      // handler has nothing to parse and nothing to fail at parsing.
      body: { url, ipn_notification_type: "GET" },
    },
  );

  if (!data.ipn_id) throw new Error("Pesapal did not return an IPN id.");

  await setSetting(key, data.ipn_id);
  return data.ipn_id;
}

/* ----------------------------------------------------------------- orders */

export type OrderInput = {
  /** Our own reference. Comes back on the IPN and in the status response. */
  reference: string;
  amountCents: number;
  /** Shown on the Pesapal page. Truncated to the 100 characters it allows. */
  description: string;
  giver: { name: string; email: string };
};

export type Order = {
  trackingId: string;
  redirectUrl: string;
  charged: ReturnType<typeof chargeFor>;
};

/**
 * Opens a payment, and returns where to send the giver.
 *
 * The name is split rather than sent whole because Pesapal's billing address
 * has no single-name field, and a church called "Grace Baptist, Leeds" is one
 * name and not a first and a last. Everything after the first word becomes the
 * surname, which is wrong for a person with two given names and harmless in
 * every case — it is a label on a receipt, not an identity check.
 */
export async function submitOrder(input: OrderInput): Promise<Order> {
  const settings = config();
  if (!settings) throw new Error("Pesapal is not configured.");

  const charged = chargeFor(input.amountCents);
  const [first, ...rest] = input.giver.name.trim().split(/\s+/);

  const data = await call<
    { order_tracking_id?: string; redirect_url?: string } & PesapalError
  >("/api/Transactions/SubmitOrderRequest", {
    method: "POST",
    token: await token(),
    body: {
      id: input.reference,
      currency: charged.currency,
      amount: charged.amount,
      description: input.description.slice(0, 100),
      callback_url: `${settings.base}/give/thanks`,
      cancellation_url: `${settings.base}/give`,
      notification_id: await notificationId(),
      billing_address: {
        email_address: input.giver.email,
        first_name: first || "Friend",
        last_name: rest.join(" "),
      },
    },
  });

  if (!data.order_tracking_id || !data.redirect_url) {
    throw new Error("Pesapal accepted the order but returned nowhere to send the giver.");
  }

  return {
    trackingId: data.order_tracking_id,
    redirectUrl: data.redirect_url,
    charged,
  };
}

export type TransactionStatus = {
  /** Pesapal's own: 0 invalid, 1 completed, 2 failed, 3 reversed. */
  code: number;
  settled: boolean;
  /** COMPLETED, FAILED, INVALID, REVERSED — or "" if it did not say. */
  description: string;
  /** "MPESA", "Visa" — for the receipt, and for Simon's reconciliation. */
  method: string;
  /** The provider's own code. What a giver quotes when they query a gift. */
  confirmationCode: string;
  reference: string;
  amount: number;
  currency: string;
  message: string;
};

/**
 * What actually happened, from Pesapal rather than from whoever asked.
 *
 * Only status_code 1 is treated as money. In particular 3 — reversed — is not:
 * a payment that has been refunded has to leave the ledger, not sit in it
 * marked received, or the site shows the ministry money it does not have.
 */
export async function transactionStatus(
  trackingId: string,
): Promise<TransactionStatus> {
  const data = await call<
    {
      status_code?: number;
      payment_status_description?: string;
      payment_method?: string;
      confirmation_code?: string;
      merchant_reference?: string;
      amount?: number;
      currency?: string;
      message?: string;
    } & PesapalError
  >(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    { method: "GET", token: await token() },
  );

  const code = Number(data.status_code ?? 0);

  return {
    code,
    settled: code === 1,
    description: (data.payment_status_description ?? "").toUpperCase(),
    method: data.payment_method ?? "",
    confirmationCode: data.confirmation_code ?? "",
    reference: data.merchant_reference ?? "",
    amount: Number(data.amount ?? 0),
    currency: data.currency ?? "",
    message: data.message ?? "",
  };
}
