"use client";

import { useActionState } from "react";
import { type ContactState, sendContactAction } from "@/app/(site)/contact/actions";
import { CONTACT_SUBJECTS } from "@/app/(site)/contact/subjects";
import {
  Done,
  Field,
  FormError,
  SpamTraps,
  Submit,
  inputClass,
} from "@/components/form";

/**
 * The contact form.
 *
 * Until now the contact page offered a `mailto:` link and nothing else, which
 * quietly asks the visitor to have a mail client set up, to compose from
 * nothing, and to know what to say. Most people on a phone, and nearly everyone
 * on a shared or school computer, simply close the tab. The form asks four
 * things and writes the subject line for them.
 *
 * The `mailto:` stays on the page beside it. Some people would still rather use
 * their own mail, and the address is worth publishing anyway.
 */
export function ContactForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    sendContactAction,
    undefined,
  );

  if (state?.done) {
    return (
      <Done heading="Thank you — your message is on its way.">
        <p>
          It has gone to Pastor Simon and Joyce in Nairobi, and one of them will
          reply to you personally — usually within a day or two.
        </p>
        <p>
          We have sent you a copy of what you wrote. If it does not appear in a
          few minutes, have a look in your spam folder and mark it as safe, so
          our reply reaches you.
        </p>
      </Done>
    );
  }

  return (
    <form action={formAction} className="relative space-y-6">
      <SpamTraps />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name">
          <input name="name" required autoComplete="name" className={inputClass} />
        </Field>

        <Field label="Your email">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="What is it about?">
        <select name="subject" defaultValue={CONTACT_SUBJECTS[0]} className={inputClass}>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Your message">
        <textarea name="message" rows={6} required className={inputClass} />
      </Field>

      <FormError>{state?.error}</FormError>

      <Submit pending={pending} pendingLabel="Sending…">
        Send message
      </Submit>

      <p className="text-center text-xs leading-relaxed text-smoke">
        We reply from {email}. Nothing you write here is published, sold or added
        to a mailing list.
      </p>
    </form>
  );
}
