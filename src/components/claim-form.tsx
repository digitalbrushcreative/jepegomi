"use client";

import { useActionState, useState } from "react";
import { type ClaimState, claimNeedAction } from "@/app/needs/actions";
import { Icon } from "@/components/icons";
import { PARTNER_KINDS } from "@/lib/giving";
import { usd } from "@/lib/money";

/**
 * The form that claims part of a need.
 *
 * The one thing it has to get right is that a giver does not have to take the
 * whole thing. A need with $450 open and a single "Give $450" button quietly
 * turns away every church that could have given $100 — so the amount is a plain
 * box with the balance beside it, and the suggested amounts are suggestions
 * sitting next to it rather than the only doors in the wall.
 */

const inputClass =
  "mt-2 w-full rounded-md border border-black/15 bg-white px-4 py-3 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/20";

function Field({
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
      <span className="eyebrow text-smoke">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-xs leading-relaxed text-smoke">{hint}</span>}
    </label>
  );
}

function Done({ state, email }: { state: NonNullable<ClaimState>["done"]; email: string }) {
  if (!state) return null;

  return (
    <div className="rounded-xl border-l-4 border-green bg-green/8 px-6 py-6">
      <p className="font-display text-xl font-semibold">
        Thank you — {state.amount} is held against {state.needTitle}.
      </p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-smoke">
        <p>
          That amount now shows as promised on this page, so nobody else will be
          asked for it. The balance stays open for somebody else to pick up.
        </p>
        <p>
          We do not publish bank or M-Pesa details on the site. Pastor Simon will
          reply to <strong className="text-charcoal">{state.email}</strong> with
          the right account for wherever you are giving from — usually within a
          day or two. If you would rather start that yourself, write to{" "}
          <a
            href={`mailto:${email}`}
            className="font-medium text-plum underline underline-offset-4"
          >
            {email}
          </a>
          .
        </p>
        <p>
          Once the gift arrives it is marked received here, and you will be able
          to follow what it paid for — including photographs — as the work goes on.
        </p>
      </div>
    </div>
  );
}

export function ClaimForm({
  slug,
  openCents,
  contactEmail,
}: {
  slug: string;
  openCents: number;
  contactEmail: string;
}) {
  const [state, formAction, pending] = useActionState<ClaimState, FormData>(
    claimNeedAction,
    undefined,
  );
  const [amount, setAmount] = useState("");

  if (state?.done) return <Done state={state.done} email={contactEmail} />;

  /*
    A quarter, a half, all of it. Rounded to whole dollars because a suggestion
    of "$112.50" reads as a bill rather than an offer — and because the exact
    remainder is always available as the last chip anyway.
  */
  const suggestions = [
    Math.round(openCents / 4 / 100) * 100,
    Math.round(openCents / 2 / 100) * 100,
    openCents,
  ].filter(
    (cents, index, all) => cents > 0 && cents <= openCents && all.indexOf(cents) === index,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />

      <Field
        label="How much would you like to give?"
        hint={`${usd(openCents)} of this is still open. Any part of it helps — the rest stays there for somebody else.`}
      >
        <div className="mt-2 flex items-center gap-2 rounded-md border border-black/15 bg-white px-4 py-3 focus-within:border-plum focus-within:ring-2 focus-within:ring-plum/20">
          <span className="font-display text-lg font-semibold text-smoke">$</span>
          <input
            name="amount"
            inputMode="decimal"
            required
            autoComplete="off"
            placeholder="250"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="tabular w-full bg-transparent text-lg outline-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => setAmount(String(cents / 100))}
              className="cursor-pointer rounded-full border-2 border-black/12 px-4 py-1.5 text-sm font-bold text-smoke transition-colors hover:border-green hover:text-green"
            >
              {cents === openCents ? `All of it — ${usd(cents)}` : usd(cents)}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Who is giving?">
          <input
            name="name"
            required
            placeholder="Encounter Church"
            className={inputClass}
          />
        </Field>

        <Field label="What kind">
          <select name="kind" defaultValue="church" className={inputClass}>
            {PARTNER_KINDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Where you are">
          <input
            name="location"
            placeholder="Palmyra, Pennsylvania"
            className={inputClass}
          />
        </Field>

        <Field label="Who we should write to">
          <input name="contactName" placeholder="Your name" className={inputClass} />
        </Field>
      </div>

      <Field
        label="Email"
        hint="Where Pastor Simon sends the account details, and where the updates go."
      >
        <input name="email" type="email" required className={inputClass} />
      </Field>

      <Field label="Anything you would like to say">
        <textarea name="message" rows={3} className={inputClass} />
      </Field>

      {state?.error && (
        <p role="alert" className="rounded-md bg-plum/8 px-4 py-3 text-sm text-plum">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-green px-7 py-4 text-[0.95rem] font-bold text-white shadow-warm transition-all hover:-translate-y-0.5 hover:bg-green-light disabled:translate-y-0 disabled:opacity-60"
      >
        <Icon name="give" className="h-[1.15em] w-[1.15em]" />
        {pending ? "Recording…" : "Claim this amount"}
      </button>

      <p className="text-center text-xs leading-relaxed text-smoke">
        No payment is taken here and no card details are asked for. This holds
        the amount against the item; Pastor Simon replies with the account
        details himself.
      </p>
    </form>
  );
}
