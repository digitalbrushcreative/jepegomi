"use client";

import { useActionState } from "react";
import {
  type GivingDetailsState,
  requestGivingDetailsAction,
} from "@/app/(site)/give/details-actions";
import { CaptchaNotice, SpamTraps } from "@/components/form";
import { Icon } from "@/components/icons";

/**
 * One box and one button, sitting on the plum band at the foot of the giving
 * page — so it is styled for a dark ground rather than for a white card, which
 * is why it does not use the shared `Field` and `inputClass`.
 *
 * Asked for nothing but an email address on purpose. Every extra box on a form
 * between somebody deciding to give and being told how is a chance for them to
 * decide later instead; the ministry can ask who they are in the reply.
 */
export function GivingDetailsForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<GivingDetailsState, FormData>(
    requestGivingDetailsAction,
    undefined,
  );

  if (state?.done) {
    return (
      <div className="mx-auto mt-9 max-w-lg rounded-2xl border border-marigold/30 bg-white/10 px-6 py-6 text-left">
        <p className="font-display text-xl font-semibold text-white">
          On its way to {state.done.email}.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          If it is not there in a few minutes, look in your spam folder and mark
          it as safe — that way our reply reaches you too. Anything you would
          rather ask a person, just reply to it.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto mt-9 max-w-lg">
      <SpamTraps action="details" />

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Your email address</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-white placeholder:text-white/40 outline-none transition-colors focus:border-marigold focus:bg-white/15"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full bg-green px-7 py-3.5 text-[0.95rem] font-bold whitespace-nowrap text-white shadow-warm transition-all hover:-translate-y-0.5 hover:bg-green-light disabled:translate-y-0 disabled:opacity-60"
        >
          <Icon name="give" className="h-[1.15em] w-[1.15em]" />
          {pending ? "Sending…" : "Send me the details"}
        </button>
      </div>

      {/* Plum-on-plum would be invisible here, so this is the shared error box
          reworked for a dark ground rather than the shared one imported. */}
      {state?.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-marigold/15 px-4 py-3 text-sm leading-relaxed text-marigold-light"
        >
          {state.error}
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        We send the details and a copy to the ministry, so we know to look out
        for your gift. Your address is not stored, published or added to a
        mailing list. You can also write to{" "}
        <a href={`mailto:${email}`} className="underline underline-offset-4 hover:text-white">
          {email}
        </a>
        .
      </p>

      <CaptchaNotice className="mt-3 text-white/45" />
    </form>
  );
}
