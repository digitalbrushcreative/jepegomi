"use client";

import { useActionState } from "react";
import { type CodeSignInState, codeSignInAction } from "./actions";

const inputClass =
  "mt-2 w-full rounded-md border border-black/15 bg-white px-4 py-3 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/20";

const buttonClass =
  "mt-7 w-full cursor-pointer rounded-full bg-green px-7 py-3.5 text-[0.95rem] font-bold text-white shadow-warm transition-all hover:-translate-y-0.5 hover:bg-green-light disabled:translate-y-0 disabled:opacity-60";

/**
 * The sentence shown once a code has been asked for.
 *
 * It used to hedge — "*if* that address has given to Jepegomi, a code is on its
 * way" — because a code only ever went to an address in the ledger, and saying
 * plainly that one had been sent would have turned this form into a way of
 * asking which churches give here.
 *
 * It can be said plainly now, because it is now true for everybody: every
 * address gets a code, and which of the two rooms it opens is settled after
 * somebody has proved they can read the inbox. See lib/door.ts. The hedge is
 * gone and nothing was given up to lose it — which is the good kind of fix,
 * where the privacy stops resting on careful wording and starts resting on
 * there being nothing to tell apart.
 */
const SENT = "A code is on its way to that address now.";

export function PartnerLoginForm() {
  const [state, formAction, pending] = useActionState<CodeSignInState, FormData>(
    codeSignInAction,
    undefined,
  );

  const onCodeStep = state?.step === "code";

  return (
    <form action={formAction}>
      {onCodeStep ? (
        <>
          <p className="rounded-md bg-sand px-4 py-3 text-sm leading-relaxed text-smoke">
            {SENT}
          </p>

          {/*
            Carried forward and still editable, rather than hidden. Somebody
            waiting on a code that is never coming is usually looking at a typo,
            and the fix for a typo has to be visible — correcting it here and
            pressing "send it again" sends to the corrected address.
          */}
          <label className="mt-5 block">
            <span className="eyebrow text-smoke">Email</span>
            <input
              name="email"
              type="email"
              defaultValue={state.email}
              autoComplete="email"
              required
              className={inputClass}
            />
          </label>

          <label className="mt-5 block">
            <span className="eyebrow text-smoke">Your code</span>
            <input
              name="code"
              type="text"
              /*
                `one-time-code` is what tells iOS and Android to offer the digits
                straight off the notification, so most people never open the
                email at all. `inputMode` brings up the number pad; `pattern`
                keeps it there without refusing a code pasted with a space in it,
                which the server strips anyway.
              */
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9\s]*"
              maxLength={9}
              autoFocus
              required
              className={`${inputClass} font-mono text-2xl tracking-[0.4em]`}
            />
          </label>
        </>
      ) : (
        <label className="block">
          <span className="eyebrow text-smoke">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
          />
          <span className="mt-2 block text-sm leading-relaxed text-smoke">
            Any address you can read. If you have given before, use the one the
            gift came from and you will see it all.
          </span>
        </label>
      )}

      {state?.error && (
        <p role="alert" className="mt-4 text-sm leading-relaxed text-plum">
          {state.error}
        </p>
      )}

      {/*
        Which step this is travels on the button rather than in a hidden field,
        and that is load-bearing. Only the *clicked* submit button's name and
        value go into the FormData, so the resend below flips the branch simply
        by being the one that was pressed — whereas a hidden `step` would arrive
        alongside it and win, because `formData.get` returns the first of two.

        Pressing Enter in a text box submits the first submit button in the form,
        which is this one, so the keyboard path lands on the step it looks like.
      */}
      <button
        type="submit"
        name="step"
        value={onCodeStep ? "code" : "email"}
        disabled={pending}
        className={buttonClass}
      >
        {pending ? "Just a moment…" : onCodeStep ? "Sign in" : "Email me a code"}
      </button>

      {onCodeStep && (
        /*
          A button, not a link: it posts the form it is in, so the address
          already accepted is the one re-sent to. A link would drop everything
          and start from an empty box.
        */
        <button
          type="submit"
          name="step"
          value="email"
          disabled={pending}
          /*
            The code box is `required`, and the browser enforces that against
            whichever button submits — so without this, "send it again" is a
            button that does nothing but put a tooltip on an empty box. This
            step is not submitting a code and has no business being judged on
            one.
          */
          formNoValidate
          className="mt-5 w-full cursor-pointer text-sm text-smoke underline underline-offset-4 transition-colors hover:text-plum disabled:opacity-60"
        >
          Send it again, or use a different address
        </button>
      )}
    </form>
  );
}
