import { after } from "next/server";

/**
 * Sending mail.
 *
 * Two rules shape this file.
 *
 * The first: **nothing the site does may fail because email failed.** A gift
 * claim that is safely in the database, and a contact form the sender has
 * already been thanked for, must not turn into an error page because a mail
 * provider had a bad minute. So every function here swallows its failures into
 * a logged result, and callers use `queue()` — which hands the send to Next's
 * `after()`, so it runs once the response has already gone out.
 *
 * The second: **the provider is one function.** The ministry's mailboxes live
 * on the cPanel host, but mail *sent by a program* should not go out through a
 * shared host's SMTP — the IP is shared with every other site on the box, and
 * its reputation with it. So sending goes through a transactional provider over
 * plain HTTPS (no SMTP ports, which serverless hosts throttle or block), and
 * swapping providers means adding a case below, not touching a single message.
 */

export type MailAddress = string;

export type Message = {
  to: MailAddress[];
  cc?: MailAddress[];
  /** Where a human reply should land — the sender of a contact form, usually. */
  replyTo?: MailAddress;
  subject: string;
  html: string;
  text: string;
  /** Only ever used in logs, to say which message failed. */
  tag: string;
};

/**
 * `ok` means the message was handed to a provider that will deliver it — not
 * that this function ran without throwing. The distinction matters because
 * callers show it to people: the giving form says "we have emailed you" off the
 * back of `ok`. Printing a message to a terminal is not delivering it, so
 * console mode reports `ok: false`.
 */
export type SendResult = { ok: true } | { ok: false; error: string };

/*
  The envelope sender. It must be at a domain whose DNS we control and have
  signed with DKIM — never jepegomi@gmail.com, which we cannot sign for and
  which DMARC at gmail.com will bounce or bin when a third party sends as it.
  Replies are steered with Reply-To instead; see `replyTo` above.
*/
function from() {
  return process.env.MAIL_FROM || "Jepegomi <noreply@jepegomi.org>";
}

type Provider = "resend" | "brevo" | "console";

function provider(): Provider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.BREVO_API_KEY) return "brevo";
  return "console";
}

/** Whether real mail can actually leave. Pages use it to soften what they promise. */
export function isMailConfigured() {
  return provider() !== "console";
}

/**
 * "Ruth Wanjiku <ruth@example.com>", built safely.
 *
 * The name in that string is very often something a stranger typed into a form,
 * and it is about to become an email header. A name containing a comma makes
 * two recipients out of one; a name containing angle brackets makes the address
 * whatever it likes; a name containing a newline starts a header of its own —
 * `Bcc:`, for instance. So the name is stripped of every character that means
 * something in a header before it is allowed near one, and if nothing survives,
 * the bare address is used.
 *
 * This is belt and braces over providers that mostly sanitise their own JSON
 * input. Mostly is not a thing to build a public form on.
 */
export function named(name: string, email: string): MailAddress {
  const clean = name
    .replace(/[\r\n\t\u0000-\u001f<>,;:"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return clean ? `${clean} <${email.trim()}>` : email.trim();
}

/**
 * A subject line. Free text reaches these too — a child's name, a giver's own
 * words for what their gift is for — and a newline in a subject is the same
 * header-injection trick as above.
 */
export function oneLine(value: string, max = 120) {
  return value
    .replace(/[\r\n\t\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/*
  Providers want the name and the address apart, so "Jepegomi <a@b.org>" has to
  come back to pieces. Anything without angle brackets is a bare address.
*/
function split(address: string): { name?: string; email: string } {
  const match = address.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return { email: address.trim() };
  return { name: match[1].replace(/^"|"$/g, "") || undefined, email: match[2].trim() };
}

async function post(url: string, headers: HeadersInit, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    /*
      A hung provider must not hold a serverless invocation open until the
      platform kills it — that is how one slow send turns into a bill.
    */
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text().catch(() => "")}`.trim());
  }
}

async function sendWithResend(message: Message) {
  await post(
    "https://api.resend.com/emails",
    { authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    {
      from: from(),
      to: message.to,
      cc: message.cc?.length ? message.cc : undefined,
      reply_to: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    },
  );
}

async function sendWithBrevo(message: Message) {
  await post(
    "https://api.brevo.com/v3/smtp/email",
    { "api-key": String(process.env.BREVO_API_KEY) },
    {
      sender: split(from()),
      to: message.to.map((address) => split(address)),
      cc: message.cc?.length ? message.cc.map((address) => split(address)) : undefined,
      replyTo: message.replyTo ? split(message.replyTo) : undefined,
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    },
  );
}

/**
 * Send one message, now, and wait for it.
 *
 * Almost nothing should call this: use `queue()` unless the caller genuinely
 * needs to know whether it left before it can answer the user.
 */
export async function send(message: Message): Promise<SendResult> {
  const to = message.to.filter(Boolean);
  if (to.length === 0) return { ok: false, error: "No recipient." };

  const outgoing = { ...message, to };

  /*
    No provider key — local development, and the fallback in production if
    somebody deploys before the key is set. The message is printed rather than
    dropped silently, so `npm run dev` still shows you the subject line and the
    address it would have gone to.

    It returns `ok: false`, which is the whole point of handling it here rather
    than as a case that falls through to the success below. Nothing was
    delivered, so a caller that asks "did that arrive?" has to hear no — without
    this, the giving form's thank-you tells you locally that it has emailed you
    details that only ever reached a terminal.
  */
  if (provider() === "console") {
    console.info(
      `[mail:${outgoing.tag}] not sent — no mail provider configured.\n` +
        `  to:      ${to.join(", ")}\n` +
        (outgoing.cc?.length ? `  cc:      ${outgoing.cc.join(", ")}\n` : "") +
        (outgoing.replyTo ? `  replyTo: ${outgoing.replyTo}\n` : "") +
        `  subject: ${outgoing.subject}\n\n` +
        outgoing.text,
    );
    return { ok: false, error: "No mail provider configured." };
  }

  try {
    if (provider() === "resend") await sendWithResend(outgoing);
    else await sendWithBrevo(outgoing);

    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[mail:${outgoing.tag}] failed to send to ${to.join(", ")}: ${reason}`);
    return { ok: false, error: reason };
  }
}

/**
 * Send after the response has gone out.
 *
 * This is the one to use from a server action. The giver sees "thank you" at
 * the speed of the database write, and the two or three emails that follow
 * happen on the platform's time rather than theirs.
 */
export function queue(...messages: Message[]) {
  after(async () => {
    /*
      Sequential, not Promise.all: a handful of messages is never the slow part,
      and providers rate-limit per second on the free tiers these run on.
    */
    for (const message of messages) await send(message);
  });
}
