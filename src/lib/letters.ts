import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { toIso } from "./dates";
import { ensureSchema, sql } from "./db";
import { isEmail } from "./forms";
import {
  type Letter,
  type LetterRecipient,
  isMailConfigured,
  send,
  writtenLetter,
} from "./mail";

/**
 * Letters written in /app and sent out in the site's own template.
 *
 * The gap this fills is narrow and real. Everything the site sends is triggered
 * by something happening — a form posted, a code asked for — and Simon had no
 * way to say anything the site had not already decided to say. So an update to
 * the churches who paid for the kitchen went out from a personal Gmail account:
 * no masthead, no ministry address in the footer, nothing to tell a reader it
 * was the same organisation whose receipt they had filed a month earlier.
 *
 * Three decisions shape what is here.
 *
 * **One message per person.** Never one message with the whole list on it.
 * That is not politeness — a partner church should not learn from a To: header
 * which other churches give here, and a school parent should not learn the
 * addresses of the other families who enquired.
 *
 * **The audience is resolved once and kept.** A letter records the addresses it
 * actually went to, not the name of a query. Rebuilding "the partners" a
 * fortnight later includes people who were not there and quietly asserts they
 * were told.
 *
 * **Sending is capped.** See `MOST_RECIPIENTS`. This is a ministry mailing its
 * own partners and parents, not a marketing platform, and the cap is what keeps
 * it that way — for the provider's rate limits, for the sending reputation
 * every other message on this site depends on, and for the fifteen seconds a
 * serverless invocation has to actually do the work in.
 */

/*
  What the /give and /contact forms have collected is in the low tens, so this
  is set well above the list as it stands — and it is not an arbitrary round
  number. The messages go out inside `after()`, which runs on the route's clock:
  sixty seconds on /app/email (see `maxDuration` there), at roughly a third of a
  second per provider round trip. Two hundred fits inside that with room for the
  slow ones.

  Above this the right answer stops being this file at all. A list that long is
  a campaign, and a campaign wants a mailing provider with a subscription list
  and an unsubscribe link — not a server action with a for-loop in it.
*/
export const MOST_RECIPIENTS = 200;

/* ---------------------------------------------------------------- audiences */

export type AudienceId =
  | "partners"
  | "partners-verified"
  | "partners-with-login"
  | "enrolment"
  | "custom";

export type Audience = {
  id: AudienceId;
  label: string;
  /** What Simon reads in /app before choosing it. */
  description: string;
  /**
   * The line printed in the footer of the message itself, saying why it landed
   * in that inbox. Every list this sends to is a list somebody joined by doing
   * something, and saying which thing is the difference between a letter and
   * spam — to the reader, and to the filters reading it first.
   */
  reason: string;
};

export const AUDIENCES: Audience[] = [
  {
    id: "partners",
    label: "Everyone who has given",
    description:
      "Every partner and giver on record, whether or not they have been vouched for.",
    reason:
      "You are getting this because you have given to Jesus People Gospel Ministries, or asked us how to.",
  },
  {
    id: "partners-verified",
    label: "Verified partners only",
    description: "The ones you have confirmed are who they say they are.",
    reason:
      "You are getting this because you are a partner of Jesus People Gospel Ministries.",
  },
  {
    id: "partners-with-login",
    label: "Partners with a dashboard login",
    description: "The churches who can sign in and see their own giving.",
    reason:
      "You are getting this because you hold a partner login for Jesus People Gospel Ministries.",
  },
  {
    id: "enrolment",
    label: "Parents who enquired about the academy",
    description: "Everyone who has used the enrolment form on the academy page.",
    reason:
      "You are getting this because you asked Jepegomi Academy about a place for your child.",
  },
  {
    id: "custom",
    label: "Addresses I type in",
    description: "One-off — paste the addresses below, one per line.",
    reason: "You are getting this from Jesus People Gospel Ministries.",
  },
];

export function audience(id: string): Audience | null {
  return AUDIENCES.find((entry) => entry.id === id) ?? null;
}

/**
 * The addresses behind an audience, deduplicated.
 *
 * One person can be in a list twice — the same address on two enrolment
 * enquiries a year apart is the same family asking again — and sending them the
 * same letter twice is the surest way to be marked as spam by the one reader
 * most likely to care about it.
 */
export async function recipientsFor(
  id: AudienceId,
  typedIn: string,
): Promise<LetterRecipient[]> {
  if (id === "custom") return dedupe(parseAddresses(typedIn));

  await ensureSchema();

  if (id === "enrolment") {
    /*
      DISTINCT ON keeps the most recent enquiry's spelling of the parent's name,
      which is the one most likely to be right.
    */
    const rows = await sql()`
      SELECT DISTINCT ON (lower(email)) email, parent_name AS name
      FROM enrolment_enquiries
      WHERE email <> ''
      ORDER BY lower(email), created_at DESC
    `;
    return dedupe(rows.map(toRecipient));
  }

  /*
    Three whole queries rather than one with the filter passed in as a
    parameter. A tagged template cannot take a fragment, and `WHERE $1 OR
    verified_at IS NOT NULL` leans on the driver to type an untyped parameter as
    a boolean — which works until the day it does not, silently, on the query
    that decides who gets mailed.

    `name` here is the person if we have been given one and the church
    otherwise: "Dear Grace Chapel," is a circular from a bank and "Dear Pastor
    Njoroge," is a letter, but the contact name is blank on plenty of rows.
  */
  const db = sql();

  const rows =
    id === "partners-verified"
      ? await db`
          SELECT email, COALESCE(NULLIF(contact_name, ''), name) AS name
          FROM partners
          WHERE email <> '' AND verified_at IS NOT NULL
          ORDER BY name
        `
      : id === "partners-with-login"
        ? await db`
            SELECT email, COALESCE(NULLIF(contact_name, ''), name) AS name
            FROM partners
            WHERE email <> '' AND password_hash IS NOT NULL
            ORDER BY name
          `
        : await db`
            SELECT email, COALESCE(NULLIF(contact_name, ''), name) AS name
            FROM partners
            WHERE email <> ''
            ORDER BY name
          `;

  return dedupe(rows.map(toRecipient));
}

function toRecipient(row: Record<string, unknown>): LetterRecipient {
  return {
    name: String(row.name ?? "").trim(),
    email: String(row.email ?? "").trim(),
  };
}

/** Pasted addresses: one per line, or comma-separated, with or without a name. */
export function parseAddresses(value: string): LetterRecipient[] {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      /* "Ruth Wanjiku <ruth@example.com>" as well as the bare address. */
      const match = entry.match(/^(.*?)\s*<([^>]+)>$/);
      return match
        ? { name: match[1].trim(), email: match[2].trim() }
        : { name: "", email: entry };
    });
}

function dedupe(recipients: LetterRecipient[]): LetterRecipient[] {
  const seen = new Map<string, LetterRecipient>();

  for (const recipient of recipients) {
    const email = recipient.email.trim();
    if (!isEmail(email)) continue;

    const key = email.toLowerCase();
    if (!seen.has(key)) seen.set(key, { name: recipient.name.trim(), email });
  }

  return [...seen.values()];
}

/* ------------------------------------------------------------ what was sent */

export type SentLetter = Letter & {
  id: string;
  audience: string;
  recipients: LetterRecipient[];
  status: "sending" | "sent" | "failed";
  sentCount: number;
  failedCount: number;
  error: string;
  sentByName: string;
  createdAt: string;
  finishedAt: string | null;
};

export async function listLetters(limit = 30): Promise<SentLetter[]> {
  await ensureSchema();

  const rows = await sql()`
    SELECT l.*, u.name AS sent_by_name
    FROM letters l
    LEFT JOIN users u ON u.id = l.sent_by
    ORDER BY l.created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: String(row.id),
    subject: String(row.subject ?? ""),
    eyebrow: String(row.eyebrow ?? ""),
    heading: String(row.heading ?? ""),
    body: String(row.body ?? ""),
    buttonLabel: String(row.button_label ?? ""),
    buttonUrl: String(row.button_url ?? ""),
    signedBy: String(row.signed_by ?? ""),
    greet: Boolean(row.greet),
    audience: String(row.audience ?? ""),
    /*
      Neon's HTTP driver hands JSONB back parsed and `pg` hands it back parsed
      too, but a row written before the column existed comes back null — and a
      history screen is not worth a crash.
    */
    recipients: Array.isArray(row.recipients)
      ? (row.recipients as LetterRecipient[])
      : [],
    status: (String(row.status ?? "sending") as SentLetter["status"]),
    sentCount: Number(row.sent_count ?? 0),
    failedCount: Number(row.failed_count ?? 0),
    error: String(row.error ?? ""),
    sentByName: String(row.sent_by_name ?? ""),
    createdAt: toIso(row.created_at),
    finishedAt: row.finished_at ? toIso(row.finished_at) : null,
  }));
}

/* --------------------------------------------------------------- the sending */

export type DeliveryReport = { queued: number; error?: string };

/**
 * Write the letter down, then send it.
 *
 * The row is written *before* the first message leaves, and that order is the
 * whole design. If the send half falls over — the provider is down, the
 * invocation is killed — what was written still exists and says so, rather than
 * a letter having gone to nine of forty people with no record that it was ever
 * attempted.
 *
 * The messages themselves go out after the response, through `after()`, so /app
 * comes back the moment the row is safe instead of holding a browser open for a
 * minute of provider round trips. What the screen tells Simon is therefore "this
 * has gone" and not "all forty of these arrived" — the count on the history
 * screen is where the second question is answered, once it can be.
 */
export async function sendLetter(input: {
  letter: Letter;
  audienceId: AudienceId;
  recipients: LetterRecipient[];
  sentBy: string;
}): Promise<DeliveryReport> {
  const list = input.recipients.slice(0, MOST_RECIPIENTS);
  const reason = audience(input.audienceId)?.reason ?? "";

  await ensureSchema();

  const id = randomUUID();
  await sql()`
    INSERT INTO letters (
      id, subject, eyebrow, heading, body, button_label, button_url,
      signed_by, greet, audience, recipients, status, sent_by
    ) VALUES (
      ${id}, ${input.letter.subject}, ${input.letter.eyebrow},
      ${input.letter.heading}, ${input.letter.body}, ${input.letter.buttonLabel},
      ${input.letter.buttonUrl}, ${input.letter.signedBy}, ${input.letter.greet},
      ${input.audienceId}, ${JSON.stringify(list)}, 'sending', ${input.sentBy}
    )
  `;

  /*
    No provider configured — local development, or a deployment with no key. The
    row is finished immediately as failed rather than left saying 'sending'
    forever, and `send()` still prints each message to the terminal, which is
    how this screen is worked on without mailing anybody.
  */
  if (!isMailConfigured()) {
    after(async () => {
      for (const recipient of list) {
        await send(writtenLetter(input.letter, recipient, reason));
      }
      await finish(id, 0, list.length, "No mail provider configured.");
    });

    return { queued: list.length, error: "No mail provider is configured." };
  }

  after(async () => {
    let sent = 0;
    let failed = 0;
    let firstError = "";

    /*
      Sequential, and deliberately not Promise.all. Every provider these run on
      rate-limits by the second on the free tier, and forty simultaneous posts
      is how a letter half-arrives with 429s behind it.
    */
    for (const recipient of list) {
      const result = await send(writtenLetter(input.letter, recipient, reason));

      if (result.ok) {
        sent += 1;
      } else {
        failed += 1;
        firstError ||= result.error;
      }
    }

    await finish(id, sent, failed, firstError);
  });

  return { queued: list.length };
}

async function finish(id: string, sent: number, failed: number, error: string) {
  try {
    await sql()`
      UPDATE letters
      SET status = ${failed > 0 && sent === 0 ? "failed" : "sent"},
          sent_count = ${sent},
          failed_count = ${failed},
          error = ${error.slice(0, 500)},
          finished_at = now()
      WHERE id = ${id}
    `;
  } catch (problem) {
    /*
      The mail has already gone by this point. Losing the tally is a worse
      history screen, not a worse outcome for anybody who was written to, so it
      is logged and nothing is thrown into `after()` — where nothing is
      listening anyway.
    */
    console.error(`Letters: could not record the result of ${id}.`, problem);
  }
}
