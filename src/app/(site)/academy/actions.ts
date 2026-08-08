"use server";

import { recordEnrolmentEnquiry } from "@/lib/enquiries";
import { isEmail, looksAutomated, text } from "@/lib/forms";
import {
  enrolmentAcknowledgement,
  enrolmentNotification,
  isMailConfigured,
  publicInbox,
  queue,
  send,
  type EnrolmentEnquiry,
} from "@/lib/mail";

/**
 * A parent asking about a place at the academy.
 *
 * Two things happen, in this order: the enquiry is written down, and then the
 * school is emailed. The email is what reaches Simon the same afternoon; the
 * row is what still knows, a fortnight later, that nobody replied to it.
 *
 * This did once store nothing at all, on the grounds that a table of children's
 * names is a thing the ministry would have to protect and had no use for. Half
 * of that is still true — see the note on the table in lib/db.ts, which is why
 * it holds only what the form asks and why /app offers a real delete. But "no
 * use for" was wrong: an inbox cannot tell you which enquiries are still
 * waiting, and a parent who is answered twice, or never, is worse served than
 * one whose name sits on a private list for a month.
 *
 * Only the parent's name and email are required. A parent who does not yet know
 * which class their child would go into, or when they could start, must still be
 * able to ask — that is the whole reason they are writing.
 */

export type EnrolmentState = { error?: string; done?: true } | undefined;

export async function sendEnrolmentEnquiryAction(
  _prev: EnrolmentState,
  formData: FormData,
): Promise<EnrolmentState> {
  const enquiry: EnrolmentEnquiry = {
    parentName: text(formData, "parentName", 120),
    email: text(formData, "email", 200),
    phone: text(formData, "phone", 40),
    childName: text(formData, "childName", 120),
    childAge: text(formData, "childAge", 60),
    startingWhen: text(formData, "startingWhen", 60),
    message: text(formData, "message", 3000),
  };

  if (!enquiry.parentName) {
    return { error: "Tell us your name, so we know who we are writing back to." };
  }
  if (!isEmail(enquiry.email)) {
    return { error: "Enter an email address we can reply to." };
  }

  if (looksAutomated(formData)) return { done: true };

  /*
    Written down before anything is sent, and never allowed to fail the action:
    a database that is asleep is not a reason to turn a parent away, and the
    email below still gets the enquiry to the school on its own.
  */
  await recordEnrolmentEnquiry(enquiry);

  /*
    Awaited, for the same reason the contact form's notification is: this email
    is how the enquiry actually reaches anybody. The row above is a record, not
    an alert — nobody sits watching /app — so "thank you, we'll be in touch"
    over the top of a failed send would still be a promise nobody can keep.
  */
  if (!isMailConfigured()) {
    return {
      error: `The form is not able to send just now. Please write to ${publicInbox()} instead, and tell us your child's name and age.`,
    };
  }

  const sent = await send(enrolmentNotification(enquiry));
  if (!sent.ok) {
    return {
      error: `We could not get that through. Please write to ${publicInbox()} instead, and tell us your child's name and age.`,
    };
  }

  queue(enrolmentAcknowledgement(enquiry));

  return { done: true };
}
