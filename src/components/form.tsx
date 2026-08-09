"use client";

import { useEffect, useRef } from "react";
import { TRAP } from "@/lib/forms";

/**
 * The parts every form on the site is built from.
 *
 * These started as a copy of the giving form's private helpers. They are shared
 * now because there are four forms — give, contact, enrolment, claim — and a
 * visitor who fills in two of them should not be able to tell that they were
 * written on different days.
 */

export const inputClass =
  "mt-2 w-full rounded-md border border-black/15 bg-white px-4 py-3 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/20";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {/*
        Not `eyebrow`. These labels are whole questions — "How much would you
        like to give?" — and at 11px uppercase with 0.14em tracking a question
        stops being a label and becomes a sentence shouted in caps, which is
        the hardest thing on the page to read at the one point where the reader
        is being asked to do something. Sentence case, same weight.
      */}
      <span className="block text-sm font-bold text-smoke">{label}</span>
      {children}
      {hint && (
        <span className="mt-2 block text-xs leading-relaxed text-smoke">{hint}</span>
      )}
    </label>
  );
}

export function FormError({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <p role="alert" className="rounded-md bg-plum/8 px-4 py-3 text-sm text-plum">
      {children}
    </p>
  );
}

/**
 * The two spam traps, as one component so a new form cannot be written without
 * them. See lib/forms.ts for what they are and why they are enough.
 *
 * `openedAt` has to be the moment the form appeared *in the browser*. The
 * server's clock is no use: these pages are prerendered, so a cached page would
 * arrive already minutes "old" and wave every bot straight through.
 *
 * Which is why it is stamped in an effect rather than in a lazy `useState`
 * initialiser. With Cache Components on, that initialiser runs during the
 * prerender — `Date.now()` at build time is exactly the request-time value Next
 * refuses to let a component read without a Suspense boundary, and the build
 * fails on it.
 *
 * The cost is that the field is empty until hydration, and stays empty for a
 * visitor with no JavaScript at all — for whom these forms still work, because
 * a server action degrades to a plain POST. So an empty `openedAt` has to mean
 * "no timing signal", never "bot". `looksAutomated` reads it that way.
 *
 * The stamp is written straight onto the input rather than held in state. State
 * would mean setting it from an effect, which costs a second render of every
 * form on the page to move a value no one can see — and React's
 * `set-state-in-effect` lint rule objects, correctly. A hidden field that
 * nothing renders from is exactly the case for touching the DOM node.
 */
export function SpamTraps() {
  const openedAt = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openedAt.current) openedAt.current.value = String(Date.now());
  }, []);

  return (
    <>
      <input ref={openedAt} type="hidden" name="openedAt" defaultValue="" />
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input name={TRAP} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
}

/**
 * Green is the giving colour and nothing else's — the rule components/ui.tsx
 * keeps for links and buttons, kept here too. A contact form is not an act of
 * giving, so it gets plum.
 */
export function Submit({
  children,
  pending,
  pendingLabel,
  tone = "plum",
  icon,
  name,
  value,
}: {
  children: string;
  pending: boolean;
  pendingLabel: string;
  tone?: "plum" | "green";
  icon?: React.ReactNode;
  /**
   * Submitted alongside the rest of the form, and only by the button actually
   * pressed — which is how a form with two of these tells the action which one
   * it was. The giving form uses it to separate "pay now" from "record this and
   * send it another way" without needing a second action or a second form.
   */
  name?: string;
  value?: string;
}) {
  const fill =
    tone === "green"
      ? "bg-green hover:bg-green-light"
      : "bg-plum hover:bg-plum-light";

  return (
    <button
      type="submit"
      disabled={pending}
      name={name}
      value={value}
      className={`inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full px-7 py-4 text-[0.95rem] font-bold text-white shadow-warm transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 ${fill}`}
    >
      {icon}
      {pending ? pendingLabel : children}
    </button>
  );
}

/** What a form turns into once it has done its job. */
export function Done({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-green/30 bg-green/8 px-6 py-6">
      <p className="font-display text-xl font-semibold">{heading}</p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-smoke">
        {children}
      </div>
    </div>
  );
}
