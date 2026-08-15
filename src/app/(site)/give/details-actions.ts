"use server";

import { LENIENT, checkCaptcha } from "@/lib/captcha";
import { isEmail, looksAutomated, text } from "@/lib/forms";
import { givingDetails, isMailConfigured, publicInbox, queue } from "@/lib/mail";
import { RATES, callerKey, consume, retryWording } from "@/lib/rate-limit";

/**
 * "Send me the details."
 *
 * The giving page has never had an account number on it and still does not —
 * see the note in lib/site.ts for why that is a decision rather than an
 * oversight. What it lacked was a way to *ask*. The only route was a `mailto:`
 * link, which asks a visitor to have a mail client, to compose from a blank
 * page, and to know what to write. On a phone, most people close the tab.
 *
 * So: one box, one button. The details go to the address given, and a copy goes
 * to the ministry so Simon knows somebody is about to give and can follow it up
 * — which is exactly what the `mailto:` gave him, without the friction it put
 * in front of the giver.
 *
 * What is deliberately *not* here is any record of who asked. An email address
 * typed by somebody thinking about giving is not a lead to be stored and
 * chased; it is a request for information, answered once. The copy in Simon's
 * inbox is the whole audit trail.
 *
 * Its own file rather than beside `giveAction`, because that one records a
 * promise in the ledger and this one answers a question. They share a page and
 * nothing else.
 */

export type GivingDetailsState =
  | { error?: string; done?: { email: string } }
  | undefined;

export async function requestGivingDetailsAction(
  _prev: GivingDetailsState,
  formData: FormData,
): Promise<GivingDetailsState> {
  const email = text(formData, "email", 200);

  if (!isEmail(email)) {
    return { error: "Enter an email address we can send the details to." };
  }

  /*
    This form mails an arbitrary address on demand, which is the shape of thing
    a script will happily point at a list. The traps in lib/forms.ts are the
    cheap half of the answer; the other half is that what it sends is the same
    short note every time, with no attachment and no link a stranger would
    follow — there is nothing here worth relaying.
  */
  if (looksAutomated(formData)) return { done: { email } };

  /*
    This is the one form on the site that mails *an address of the caller's
    choosing* — which is the exact shape a script points at a list, and the
    reason the comment above says what it does about there being nothing here
    worth relaying. A limit is the other half of that answer: harmless content
    sent ten thousand times is still ten thousand messages from this domain.
  */
  const limit = await consume(
    `form:giving-details:${await callerKey()}`,
    RATES.contactForm,
  );
  if (!limit.ok) {
    return {
      error: `That is several requests in a short time. Try again ${retryWording(limit.retryAfterSeconds)}, or write to ${publicInbox()}.`,
    };
  }

  /*
    Of the four public forms this is the one with the clearest abuse story — an
    arbitrary address, mailed on demand — so it is the one where a captcha earns
    its place most. Lenient all the same, and for a reason particular to this
    form rather than a general shrug: it sits on the giving page, and somebody
    who has just decided to give and is asking where to send it is exactly the
    person who must not be met with a refusal they cannot act on. Answered like
    the honeypot above, which is to say not answered at all.
  */
  if (!(await checkCaptcha(formData, "details", LENIENT)).ok) {
    return { done: { email } };
  }

  if (!isMailConfigured()) {
    return {
      error: `We cannot send it automatically just now — please write to ${publicInbox()} and we will reply with everything you need.`,
    };
  }

  queue(givingDetails({ email }));

  return { done: { email } };
}
