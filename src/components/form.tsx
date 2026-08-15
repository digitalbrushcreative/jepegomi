"use client";

import { useEffect, useRef } from "react";
import { CAPTCHA_FIELD, TRAP } from "@/lib/forms";

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
 * The spam traps, as one component so a new form cannot be written without
 * them. Three now: the hidden field and the clock described in lib/forms.ts,
 * and a reCAPTCHA v3 token kept ready in a hidden field. The first two are free
 * and cost a visitor nothing; the third calls Google, which is why it is off
 * entirely unless keys are set, and why it is not called until somebody
 * actually starts filling the form in. See lib/captcha.ts.
 *
 * `action` names the form to Google — "contact", "give" — and the server checks
 * it, so a token farmed from one form cannot be spent on another. It must match
 * the name the action passes to `checkCaptcha`.
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
export function SpamTraps({ action }: { action: string }) {
  const openedAt = useRef<HTMLInputElement>(null);
  const captcha = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openedAt.current) openedAt.current.value = String(Date.now());
  }, []);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const field = captcha.current;
    const form = field?.closest("form");
    if (!siteKey || !field || !form) return;

    /*
      The token is kept ready in the hidden field, rather than fetched when the
      form is submitted.

      Fetching it at submit time is the obvious design and it is the wrong one
      here. It means taking the submission away from React, going to Google, and
      giving the submission back — and `<form action={serverAction}>` does not
      survive that reliably: the re-submitted event and React's own handling of
      it race, and the failure is a form that silently does nothing or, worse on
      the giving page, does it twice. Keeping the field filled in advance means
      the form is submitted exactly once, by React, in the ordinary way, with
      nothing intercepted at all.

      What it costs is a token minted a little before it is spent. That is
      affordable: v3 tokens last two minutes, and the refresh below keeps one
      inside that window for as long as somebody is filling the form in.
    */
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const mint = () => {
      token(siteKey, action)
        .then((value) => {
          if (live) field.value = value;
        })
        .catch(() => {
          /*
            Blocked, offline, or Google having a bad minute. The field stays
            empty and the form is submitted anyway — the server decides what an
            empty one means for this particular form, which is the whole point
            of STRICT and LENIENT in lib/captcha.ts. Nothing here refuses to
            send, because a page that will not submit and cannot say why is the
            worst of the available failures.
          */
          if (live) field.value = "";
        })
        .finally(() => {
          /*
            Ninety seconds against a two-minute life, so a token is always
            comfortably fresh and a form left open on a desk all afternoon is
            still good when somebody comes back to it. `setTimeout` chained
            rather than `setInterval`, so a slow answer from Google cannot
            stack up requests behind it.
          */
          if (live) timer = setTimeout(mint, 90_000);
        });
    };

    /*
      Nothing above happens until somebody touches the form. This site goes out
      of its way not to introduce a reader to a third party they did not ask for
      — the sermon player on /programs/digital is a still until it is pressed,
      for the same reason — and every page carrying a form is otherwise
      prerendered and quiet. A visitor who only reads never meets Google.

      `focusin` rather than a click on the form: it covers the keyboard, it
      covers a tap into any field, and it fires on the giving form's amount
      buttons too, which are focusable. Whichever way somebody starts, the token
      is on its way before they have finished typing their name.
    */
    form.addEventListener("focusin", mint, { once: true });

    return () => {
      live = false;
      clearTimeout(timer);
      form.removeEventListener("focusin", mint);
    };
  }, [action]);

  return (
    <>
      <input ref={openedAt} type="hidden" name="openedAt" defaultValue="" />
      <input ref={captcha} type="hidden" name={CAPTCHA_FIELD} defaultValue="" />
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input name={TRAP} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
}

/*
  One load for the whole page, however many forms are on it. `next/script` is
  not used here on purpose: its job is to schedule a script against page load,
  and the whole point of this one is that it is fetched on a person's first
  keystroke and not before.
*/
let loading: Promise<void> | undefined;

declare global {
  interface Window {
    grecaptcha?: {
      ready(callback: () => void): void;
      execute(siteKey: string, options: { action: string }): Promise<string>;
    };
  }
}

function load(siteKey: string) {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      /*
        Cleared so a later attempt can try again — a rejected promise cached
        forever would mean one flaky load turning the captcha off for the rest
        of the visit, and on the contact form that is the difference between a
        message arriving and a visitor being told to email instead.
      */
      loading = undefined;
      reject(new Error("reCAPTCHA did not load"));
    };
    document.head.appendChild(script);
  });

  return loading;
}

async function token(siteKey: string, action: string) {
  await load(siteKey);

  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error("reCAPTCHA did not start");

  return new Promise<string>((resolve, reject) => {
    grecaptcha.ready(() => {
      grecaptcha.execute(siteKey, { action }).then(resolve, reject);
    });
  });
}

/**
 * Google's terms allow the badge to be hidden — it is, in globals.css, because
 * a floating grey rectangle over the corner of every page is not something this
 * site is going to grow — on the condition that the branding appears in the
 * flow of the form instead. This is that. It renders nothing at all when no
 * site key is set, so a build without the keys does not promise a protection it
 * does not have.
 */
export function CaptchaNotice({ className = "" }: { className?: string }) {
  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) return null;

  return (
    <p className={`text-xs leading-relaxed ${className}`}>
      Protected by reCAPTCHA. Google&apos;s{" "}
      <a
        href="https://policies.google.com/privacy"
        className="underline underline-offset-4"
        target="_blank"
        rel="noopener noreferrer"
      >
        privacy policy
      </a>{" "}
      and{" "}
      <a
        href="https://policies.google.com/terms"
        className="underline underline-offset-4"
        target="_blank"
        rel="noopener noreferrer"
      >
        terms
      </a>{" "}
      apply.
    </p>
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
