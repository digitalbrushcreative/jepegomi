"use client";

import { useActionState } from "react";
import {
  type EnrolmentState,
  sendEnrolmentEnquiryAction,
} from "@/app/(site)/academy/actions";
import {
  Done,
  Field,
  FormError,
  SpamTraps,
  Submit,
  inputClass,
} from "@/components/form";

/**
 * Asking about a place at the academy.
 *
 * Two required boxes and five optional ones, and the required two are about the
 * parent rather than the child. A form that insists on a date of birth and a
 * class before it will send anything turns away exactly the parent this school
 * is for — the one who is asking whether there is room at all.
 */
export function EnrolmentEnquiryForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<EnrolmentState, FormData>(
    sendEnrolmentEnquiryAction,
    undefined,
  );

  if (state?.done) {
    return (
      <Done heading="Thank you — your enquiry is with the school.">
        <p>
          Someone will be in touch to talk it through and arrange a time for you
          to visit. The best thing is to come and see it: the classrooms, the
          teachers, and the children at lunch.
        </p>
        <p>
          We have sent you a copy. If it does not appear in a few minutes, look
          in your spam folder and mark it as safe, so our reply reaches you too.
        </p>
      </Done>
    );
  }

  return (
    <form action={formAction} className="relative space-y-6">
      <SpamTraps />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name">
          <input
            name="parentName"
            required
            autoComplete="name"
            placeholder="Parent or guardian"
            className={inputClass}
          />
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

        <Field label="Phone or WhatsApp" hint="Optional, but often the quickest way.">
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>

        <Field label="Child's name">
          <input name="childName" className={inputClass} />
        </Field>

        <Field label="Age or class">
          <input name="childAge" placeholder="6, or Grade 1" className={inputClass} />
        </Field>

        <Field label="Hoping to start">
          <input name="startingWhen" placeholder="January, or as soon as possible" className={inputClass} />
        </Field>
      </div>

      <Field
        label="Anything you would like to ask"
        hint="Fees, the feeding programme, uniform, transport — whatever you need to know."
      >
        <textarea name="message" rows={4} className={inputClass} />
      </Field>

      <FormError>{state?.error}</FormError>

      <Submit pending={pending} pendingLabel="Sending…">
        Ask about a place
      </Submit>

      {/*
        This used to promise that nothing was stored, and it is here rather than
        anywhere else because the promise had to change the day the school
        started keeping the enquiries. What replaced it says what is actually
        true — kept privately, so the school knows who it still owes a reply,
        and shown to nobody else — because a reassurance that has quietly
        stopped being accurate is worse than no reassurance at all.
      */}
      <p className="text-center text-xs leading-relaxed text-smoke">
        This goes to the school, and nowhere else. What you write is kept
        privately so we can be sure you get a reply — never published and never
        passed on. You can also write to {email}, and ask us there to delete it.
      </p>
    </form>
  );
}
