"use server";

import { isEmail, looksAutomated, text } from "@/lib/forms";
import {
  contactAcknowledgement,
  contactNotification,
  isMailConfigured,
  publicInbox,
  queue,
  send,
  type ContactEnquiry,
} from "@/lib/mail";
import { isContactSubject } from "./subjects";

/**
 * The contact form.
 *
 * It writes nothing to the database on purpose. An enquiry is a conversation,
 * and a conversation belongs in a mailbox where it can be replied to, forwarded
 * and searched — not in a table in /app that somebody has to remember to open.
 * That also means the form keeps working when the database does not, which for
 * the one page whose whole job is "let people reach us" is the right trade.
 */

export type ContactState = { error?: string; done?: true } | undefined;

export async function sendContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const enquiry: ContactEnquiry = {
    name: text(formData, "name", 120),
    email: text(formData, "email", 200),
    subject: text(formData, "subject", 120),
    message: text(formData, "message", 4000),
  };

  if (!enquiry.name) {
    return { error: "Tell us your name, so we know who we are writing back to." };
  }
  if (!isEmail(enquiry.email)) {
    return { error: "Enter an email address we can reply to." };
  }
  if (enquiry.message.length < 10) {
    return { error: "Tell us a little more, so we can give you a useful reply." };
  }

  /*
    Answered exactly as a real submission is. A bot told it was caught is a bot
    that comes back without the honeypot; a bot told "thank you" goes away.
  */
  if (looksAutomated(formData)) return { done: true };

  if (!isContactSubject(enquiry.subject)) enquiry.subject = "Something else";

  /*
    The one place on the site that awaits a send rather than queueing it.

    Everything else this codebase mails is a copy of something already written
    down — a claim in the ledger, an account that now exists. A contact message
    is not: this email *is* the message. If it does not leave, it is gone, and
    telling somebody "thank you, we'll be in touch" over the top of that is the
    worst thing this page could do. So the notification is awaited and a failure
    is handed back with the address to write to directly.
  */
  if (!isMailConfigured()) {
    return {
      error: `The form is not able to send just now. Please write to ${publicInbox()} instead — it reaches the same people.`,
    };
  }

  const sent = await send(contactNotification(enquiry));
  if (!sent.ok) {
    return {
      error: `We could not get that through. Please write to ${publicInbox()} instead — it reaches the same people.`,
    };
  }

  /*
    Their copy, on the other hand, can go out after the response. It is a
    courtesy, and it must not make the sender wait or make the form fail.
  */
  queue(contactAcknowledgement(enquiry));

  return { done: true };
}
