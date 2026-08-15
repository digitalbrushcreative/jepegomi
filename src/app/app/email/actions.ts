"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  type AudienceId,
  MOST_RECIPIENTS,
  audience,
  recipientsFor,
  sendLetter,
} from "@/lib/letters";
import {
  type Letter,
  type LetterRecipient,
  send,
  writtenLetter,
} from "@/lib/mail";
import { site } from "@/lib/site";

/**
 * Writing a letter, looking at it, and sending it.
 *
 * Every one of these begins with `requireUser`, for the reason the enquiries
 * actions give and one more: this is the only endpoint on the site that will
 * send arbitrary words to every address the ministry holds, over the ministry's
 * own signature and DKIM key. An unguarded server action here is not a leak, it
 * is a mail relay with a good reputation attached.
 */

/** What the form sends up. Deliberately the same shape the preview draws. */
export type Draft = {
  audienceId: string;
  /** Only read when the audience is "custom". */
  addresses: string;
  subject: string;
  eyebrow: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  signedBy: string;
  greet: boolean;
};

export type Checked = { letter: Letter; audienceId: AudienceId } | { error: string };

function line(value: string, max: number) {
  return value.replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Everything that has to be true before a letter is allowed near a mailbox.
 *
 * Shared by the preview and the send on purpose. A preview that accepts what
 * the send refuses is a preview of a message that does not exist, and the first
 * anybody hears of it is an error on the screen after they have written four
 * paragraphs.
 */
function check(draft: Draft): Checked {
  const found = audience(draft.audienceId);
  if (!found) return { error: "Choose who this is going to." };

  const subject = line(draft.subject, 150);
  const heading = line(draft.heading, 120);
  const body = draft.body.trim().slice(0, 20_000);

  if (!subject) return { error: "A subject line, please — it is what they see first." };
  if (!heading) return { error: "Give it a heading. It is the first line of the letter." };
  if (!body) return { error: "There is nothing to send yet." };

  const buttonLabel = line(draft.buttonLabel, 40);
  const buttonUrl = line(draft.buttonUrl, 500);

  /*
    Both halves or neither. A label with no link renders a button that goes
    nowhere; a link with no label renders nothing at all, which looks to whoever
    typed it like the link was dropped.
  */
  if (buttonLabel && !buttonUrl) return { error: "The button has no link on it." };
  if (buttonUrl && !buttonLabel) return { error: "The button has no words on it." };
  if (buttonUrl && !/^https?:\/\//i.test(buttonUrl)) {
    return { error: "The button's link has to start with http:// or https://." };
  }

  return {
    audienceId: found.id,
    letter: {
      subject,
      eyebrow: line(draft.eyebrow, 60),
      heading,
      body,
      buttonLabel,
      buttonUrl,
      signedBy: line(draft.signedBy, 80) || site.leaders,
      greet: draft.greet,
    },
  };
}

export type Preview = {
  /** The message as it will arrive, for an iframe. */
  html?: string;
  /** How many people this would go to as it stands. */
  count?: number;
  /** A handful of them, so the count can be checked against real names. */
  sample?: string[];
  /** True once the audience is larger than one send is allowed to be. */
  capped?: boolean;
  error?: string;
};

/**
 * The letter as the reader will get it, addressed to a real name off the list.
 *
 * The greeting is the reason this bothers to look up the audience rather than
 * rendering against a placeholder: "Dear Pastor Njoroge," and "Dear {name},"
 * are not the same thing to look at, and the second one is how a merge field
 * ends up going out unfilled.
 *
 * Who it is going to is worked out *before* the letter is checked, and comes
 * back either way. Choosing the audience is the first thing anybody does and
 * the count is the answer to the question they had when they did it — refusing
 * to say how many people are on a list until the letter is finished is the tool
 * withholding what it already knows.
 */
export async function previewLetterAction(draft: Draft): Promise<Preview> {
  await requireUser();

  const chosen = audience(draft.audienceId);
  if (!chosen) return { error: "Choose who this is going to." };

  let recipients: LetterRecipient[] = [];
  try {
    recipients = await recipientsFor(chosen.id, draft.addresses);
  } catch (error) {
    console.error("Letters: could not work out who this would go to.", error);
    return { error: "Could not read the list of recipients." };
  }

  const who = {
    count: recipients.length,
    sample: recipients.slice(0, 4).map((one) => one.email),
    capped: recipients.length > MOST_RECIPIENTS,
  };

  const checked = check(draft);
  if ("error" in checked) return { ...who, error: checked.error };

  /* Somebody real off the list, so the greeting is the one they will read. */
  const stand: LetterRecipient = recipients[0] ?? {
    name: "Pastor Njoroge",
    email: "someone@example.invalid",
  };

  return {
    ...who,
    html: writtenLetter(checked.letter, stand, chosen.reason).html,
  };
}

export type SendState = { error?: string; sent?: string } | undefined;

/**
 * One copy, to whoever is signed in.
 *
 * This is the step that catches everything a preview cannot: whether the mail
 * provider is actually working, what the subject looks like in an inbox list
 * next to everything else, and whether the logo loads from a real mail client
 * rather than from a same-origin iframe.
 */
export async function sendTestAction(draft: Draft): Promise<SendState> {
  const user = await requireUser();

  const checked = check(draft);
  if ("error" in checked) return { error: checked.error };

  const result = await send(
    writtenLetter(
      checked.letter,
      { name: user.name, email: user.email },
      "This is a test copy, sent to you from the website's own editor.",
    ),
  );

  if (!result.ok) return { error: `Not sent — ${result.error}` };
  return { sent: `Sent to ${user.email}. Have a look at it in your mail.` };
}

/**
 * The real thing.
 *
 * The audience is resolved here rather than trusted from the browser. What the
 * form posts is *which list*, never the list itself — otherwise the addresses a
 * letter goes to are whatever was in a form field, which is the definition of an
 * open relay.
 */
export async function sendLetterAction(draft: Draft): Promise<SendState> {
  const user = await requireUser();

  const checked = check(draft);
  if ("error" in checked) return { error: checked.error };

  let recipients: LetterRecipient[] = [];
  try {
    recipients = await recipientsFor(checked.audienceId, draft.addresses);
  } catch (error) {
    console.error("Letters: could not work out who to send to.", error);
    return { error: "Could not read the list of recipients." };
  }

  if (recipients.length === 0) {
    return { error: "There is nobody on that list to send to." };
  }

  let report;
  try {
    report = await sendLetter({
      letter: checked.letter,
      audienceId: checked.audienceId,
      recipients,
      sentBy: user.id,
    });
  } catch (error) {
    console.error("Letters: could not start a send.", error);
    return { error: "Could not send that. Nothing has gone out." };
  }

  revalidatePath("/app/email");

  const capped =
    recipients.length > MOST_RECIPIENTS
      ? ` The list was longer than ${MOST_RECIPIENTS}, so that is how many it went to.`
      : "";

  if (report.error) return { error: `${report.error} Nothing has actually left.` };

  return {
    sent: `On its way to ${report.queued} ${report.queued === 1 ? "person" : "people"}.${capped}`,
  };
}
