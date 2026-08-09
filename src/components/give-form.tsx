"use client";

import { Fragment, useActionState, useRef, useState } from "react";
import { type GiveState, giveAction } from "@/app/(site)/give/actions";
import {
  Done,
  Field,
  FormError,
  SpamTraps,
  Submit,
  inputClass,
} from "@/components/form";
import { Icon } from "@/components/icons";
import { GIVING_SUGGESTIONS, PARTNER_KINDS } from "@/lib/giving";
import { parseUsd, usd } from "@/lib/money";

/**
 * The form that records a gift.
 *
 * It appears twice, and the difference between the two is one prop. On a need's
 * own page the item is already chosen, so it asks only how much. On /give it
 * asks that question first — pick one of the costed items, or say what you would
 * like to support in your own words — because a giving page that offers only a
 * list turns away everyone whose gift does not happen to match a row in it, and
 * one that offers only a box wastes the list entirely.
 *
 * The list is itemised down to the actual expense and grouped the way the work
 * is: project, then the step of it being paid for now, then the costs inside
 * that step. That is the difference between asking somebody to fund "the
 * kitchen build" and letting them buy the cement — and it is why the page hands
 * over only the parts that are ready to be worked on. What comes later is on
 * /needs, in order, rather than in a form asking for it today.
 *
 * The other thing it has to get right is that a giver does not have to take a
 * whole item. A need with $450 open and a single "Give $450" button quietly
 * turns away every church that could have given $100 — so the amount is a plain
 * box with the balance beside it, and the suggested amounts are suggestions
 * sitting next to it rather than the only doors in the wall.
 *
 * What submitting does depends on `canPay`, and every line of copy in here that
 * touches money has to bend with it. With Pesapal configured there are two
 * buttons: pay now, which records the gift and sends the giver to Pesapal, or
 * send it another way, which records the promise and leaves Simon to reply with
 * the account details. With Pesapal unset there is only the second, and the form
 * is exactly what it was before there was a gateway.
 *
 * The rule for the wording: never tell somebody nothing is being taken when the
 * next tap takes something. Copy that is true in one configuration and false in
 * the other is written as a branch, not as a compromise sentence that is vague
 * enough to survive both.
 */

export type GiveChoice = {
  slug: string;
  title: string;
  /** The project it belongs to — "The kitchen build". */
  areaLabel: string;
  /**
   * The step of the work it is part of — "Walls up" — or empty for an item that
   * belongs to the project as a whole. The list is drawn under these headings,
   * so the page must hand the choices over already in order; see the note on
   * the picker below.
   */
  partTitle?: string;
  /** One line about the part, shown once under its heading. */
  partSummary?: string;
  openCents: number;
};

/** The form's word for "not one of the listed items". Matched in giveAction. */
const OTHER = "other";

function Thanks({
  state,
  email,
}: {
  state: NonNullable<NonNullable<GiveState>["done"]>;
  email: string;
}) {
  return (
    <Done heading={`Thank you — ${state.amount} is recorded towards ${state.towards}.`}>
      <p>
        {state.listed
          ? "That amount now shows as promised against the item, so nobody else will be asked for it. The balance stays open for somebody else to pick up."
          : "Nothing on the site changes for this one — it is not against a costed item — but it is on the ledger, and Pastor Simon has it in front of him."}
      </p>
      <p>
        {state.sent
          ? "We have emailed"
          : "We could not send the email automatically, so Pastor Simon will write to"}{" "}
        <strong className="text-charcoal">{state.email}</strong>{" "}
        {state.sent
          ? "with everything you need to send it. If it is not there in a few minutes, look in your spam folder."
          : "himself with the account details — usually within a day or two."}{" "}
        Anything else, write to{" "}
        <a
          href={`mailto:${email}`}
          className="font-medium text-plum underline underline-offset-4"
        >
          {email}
        </a>
        .
      </p>
      <p>
        Once the gift arrives it is marked received here, and you will be able to
        follow what it paid for — including photographs — as the work goes on.
      </p>
    </Done>
  );
}

/**
 * One selectable item in the picker: a costed need, or the free-text option.
 *
 * The radio itself is the field that gets submitted — it carries the slug while
 * the label shows the title — so there is exactly one input named "towards" on
 * the form and no chance of the browser sending the wrong one of two.
 */
function Choice({
  value,
  checked,
  onChoose,
  title,
  note,
  figure,
}: {
  value: string;
  checked: boolean;
  onChoose: () => void;
  title: string;
  note: string;
  figure?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3.5 border-b border-sand-deep p-4 transition-colors last:border-b-0 ${
        checked ? "bg-green/8" : "hover:bg-sand/60"
      }`}
    >
      <input
        type="radio"
        name="towards"
        value={value}
        checked={checked}
        onChange={onChoose}
        required
        className="mt-1 h-4 w-4 shrink-0 accent-green"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-medium">{title}</span>
          {figure && (
            <span className="tabular text-sm font-bold text-green">{figure}</span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-smoke">{note}</span>
      </span>
    </label>
  );
}

/**
 * The heading a run of choices sits under: the project, and the step of the
 * work inside it.
 *
 * Sticky, because the list is now long enough to scroll past its own headings —
 * and a radio button reading "Cement and sand, $420" with the project scrolled
 * off the top is a giver about to put money towards they-are-not-quite-sure-what.
 */
function GroupHeading({
  project,
  part,
  summary,
}: {
  project: string;
  part?: string;
  summary?: string;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-sand-deep bg-sand/95 px-4 py-2.5 backdrop-blur-sm">
      <p className="eyebrow text-plum">{project}</p>
      {part && (
        <p className="mt-1 text-sm font-semibold text-charcoal">{part}</p>
      )}
      {summary && (
        <p className="mt-0.5 text-xs leading-relaxed text-smoke">{summary}</p>
      )}
    </div>
  );
}


export function GiveForm({
  choices,
  fixed = false,
  contactEmail,
  canPay = false,
}: {
  /** The costed items still open. On a need's own page this is that one need. */
  choices: GiveChoice[];
  /** True when the item is already decided, so the picker is not shown at all. */
  fixed?: boolean;
  contactEmail: string;
  /**
   * Whether Pesapal is set up, and so whether paying on the site is offered at
   * all. Passed down from the page rather than read here, because this is a
   * client component and the keys are a server's business.
   *
   * When false the form is exactly what it was before there was a gateway: one
   * button, recording a promise. That is the fallback that matters — an expired
   * Pesapal credential should cost the ministry a payment page, not a giving
   * page.
   */
  canPay?: boolean;
}) {
  const [state, formAction, pending] = useActionState<GiveState, FormData>(
    giveAction,
    undefined,
  );

  /*
    Nothing is pre-selected on /give. A radio already sitting on the first item
    is a form that answers its own question, and the first item is not more
    deserving than the ninth — it is just the one Simon happened to add first.
  */
  const [towards, setTowards] = useState(
    fixed && choices[0] ? choices[0].slug : choices.length === 0 ? OTHER : "",
  );
/*
  Two of the boxes below keep their text in the DOM and a copy in React, rather
  than being rendered from React the usual way.

  They cannot simply be uncontrolled: the suggestion chips write into them,
  choosing a different item clears the amount, and the paying button reads the
  amount back so it can say "Give $250 now". All of that needs the value in
  React.

  But a `value={…}` box renders from React state, and React state on a fresh
  page is empty — so anything typed before the client bundle arrives and
  hydrates is wiped the instant it does, silently. On this page that is a giver
  who typed 250, looked away, and looked back at an empty box; if they do not
  notice, the form then tells them to enter an amount they are certain they
  entered. The same fault had already eaten the email on the CMS sign-in form.

  So: `defaultValue` means hydration leaves whatever is in the box alone,
  `onChange` keeps the copy current, and the two setters below write the box and
  the copy together when the change comes from code rather than a keystroke.
*/
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmountValue] = useState("");
  const setAmount = (next: string) => {
    if (amountRef.current) amountRef.current.value = next;
    setAmountValue(next);
  };

  const designationRef = useRef<HTMLInputElement>(null);
  const [designation, setDesignationValue] = useState("");
  const setDesignation = (next: string) => {
    // May be unmounted — this field only exists while "Something else" is
    // chosen — so the copy is what survives either way.
    if (designationRef.current) designationRef.current.value = next;
    setDesignationValue(next);
  };

  if (state?.done) return <Thanks state={state.done} email={contactEmail} />;

  const chosen = choices.find((choice) => choice.slug === towards);
  const openCents = chosen?.openCents ?? 0;

  /*
    The amount on the paying button, so it reads "Give $250 now" rather than
    "Give now" — the last thing somebody sees before they leave for a payment
    page should be the figure they are about to be charged. Parsed with the same
    function the action validates with, so a half-typed "25." simply falls back
    to the plain label rather than putting "$NaN" on a button.
  */
  const typedCents = parseUsd(amount);
  const amountLabel = typedCents === null ? "" : usd(typedCents);

  /*
    Against an item: a quarter, a half, all of it. Rounded to whole dollars
    because a suggestion of "$112.50" reads as a bill rather than an offer — and
    because the exact remainder is always available as the last chip anyway.
    Against nothing in particular there is no balance to divide, so these are
    just the amounts people give.
  */
  const suggestions = chosen
    ? [
        Math.round(openCents / 4 / 100) * 100,
        Math.round(openCents / 2 / 100) * 100,
        openCents,
      ].filter(
        (cents, index, all) =>
          cents > 0 && cents <= openCents && all.indexOf(cents) === index,
      )
    : [5_000, 10_000, 25_000, 50_000];

  return (
    <form action={formAction} className="relative space-y-7">
      <SpamTraps />

      {/*
        Three states, and only the last of them is a picker: the item is already
        decided (a need's own page), there is nothing listed to pick from (an
        empty or unreachable ledger — the form still has to work), or there is a
        list. A picker offering one option is not a choice, so it is not drawn.
      */}
      {fixed && choices[0] ? (
        <input type="hidden" name="towards" value={choices[0].slug} />
      ) : choices.length === 0 ? (
        <input type="hidden" name="towards" value={OTHER} />
      ) : (
        <fieldset>
          <legend className="eyebrow text-smoke">
            What would you like your gift to go to?
          </legend>
          <p className="mt-2 text-sm leading-relaxed text-smoke">
            Every line is one real cost, in the order the work has to happen.
            Take one of them, take part of one, or say what you would like to
            support in your own words.
          </p>

          {/*
            Scrolls once the list is long enough that it would otherwise push
            the amount box — the thing the picker exists to lead to — off the
            bottom of the screen.
          */}
          <div
            className={`mt-3 overflow-hidden rounded-xl border border-black/12 bg-white ${
              choices.length > 6 ? "max-h-[26rem] overflow-y-auto" : ""
            }`}
          >
            {choices.map((choice, index) => {
              /*
                A heading whenever the run changes, which is why the order the
                page hands these over in matters: the choices arrive already
                grouped, project by project and part by part, and this simply
                notices the seam. Comparing against the previous choice rather
                than building nested arrays keeps one flat list of radios named
                "towards" — exactly what the picker had before — so there is
                still no way for the browser to submit two of them.
              */
              const previous = choices[index - 1];
              const newProject = previous?.areaLabel !== choice.areaLabel;
              const newPart = newProject || previous?.partTitle !== choice.partTitle;

              /*
                A Fragment rather than a wrapper element, so every radio stays
                a direct child of the scrolling box — `last:border-b-0` on the
                rows below depends on it, and so does the box not growing a
                stack of nested divs for the sake of two headings.
              */
              return (
                <Fragment key={choice.slug}>
                  {newPart && (
                    <GroupHeading
                      project={choice.areaLabel}
                      part={choice.partTitle}
                      summary={choice.partSummary}
                    />
                  )}
                  <Choice
                    value={choice.slug}
                    checked={towards === choice.slug}
                    onChoose={() => {
                      setTowards(choice.slug);
                      setAmount("");
                    }}
                    title={choice.title}
                    note="still open"
                    figure={usd(choice.openCents)}
                  />
                </Fragment>
              );
            })}

            <Choice
              value={OTHER}
              checked={towards === OTHER}
              onChoose={() => {
                setTowards(OTHER);
                setAmount("");
              }}
              title="Something else"
              note={
                choices.length === 0
                  ? "Tell us what you would like to support and we will put it there."
                  : "Not on the list — tell us what you would like to support instead."
              }
            />
          </div>
        </fieldset>
      )}

      {towards === OTHER && (
        <Field
          label="What would you like it to go towards?"
          hint="In your own words. It goes on the ledger exactly as you write it, and Pastor Simon will confirm it back to you."
        >
          <input
            name="designation"
            required
            maxLength={120}
            ref={designationRef}
            defaultValue={designation}
            onChange={(event) => setDesignationValue(event.target.value)}
            placeholder="School fees for one child"
            className={inputClass}
          />

          <span className="mt-3 flex flex-wrap gap-2">
            {GIVING_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setDesignation(suggestion)}
                className="cursor-pointer rounded-full border-2 border-black/12 px-4 py-1.5 text-sm font-bold text-smoke transition-colors hover:border-plum hover:text-plum"
              >
                {suggestion}
              </button>
            ))}
          </span>
        </Field>
      )}

      {/*
        The hint has to answer two different questions depending on what the
        buttons below it do, and getting it wrong is worse than saying nothing.
        With Pesapal on, "nothing is taken now" is simply false — the next tap
        goes to a payment page — and a giver who reads it and then finds
        themselves being charged has been misled at the exact moment they were
        deciding to trust us.
      */}
      <Field
        label="How much would you like to give?"
        hint={
          chosen
            ? `${usd(openCents)} of this is still open. Any part of it helps — the rest stays there for somebody else.`
            : canPay
              ? "Whatever you can. You choose below whether to pay it now or send it another way."
              : "Whatever you can. Nothing is taken now — this tells us what to expect, and what to write back to you about."
        }
      >
        <div className="mt-2 flex items-center gap-2 rounded-md border border-black/15 bg-white px-4 py-3 focus-within:border-plum focus-within:ring-2 focus-within:ring-plum/20">
          <span className="font-display text-lg font-semibold text-smoke">$</span>
          <input
            name="amount"
            inputMode="decimal"
            required
            autoComplete="off"
            placeholder="250"
            ref={amountRef}
            defaultValue={amount}
            onChange={(event) => setAmountValue(event.target.value)}
            className="tabular w-full bg-transparent text-lg outline-none"
          />
        </div>

        <span className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => setAmount(String(cents / 100))}
              className="cursor-pointer rounded-full border-2 border-black/12 px-4 py-1.5 text-sm font-bold text-smoke transition-colors hover:border-green hover:text-green"
            >
              {chosen && cents === openCents ? `All of it — ${usd(cents)}` : usd(cents)}
            </button>
          ))}
        </span>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Who is giving?">
          <input
            name="name"
            required
            placeholder="Your name, or your church"
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
            placeholder="City, country"
            className={inputClass}
          />
        </Field>

        <Field label="Who we should write to">
          <input name="contactName" placeholder="Your name" className={inputClass} />
        </Field>
      </div>

      <Field
        label="Email"
        hint={
          canPay
            ? "Where your receipt goes, and where the updates go."
            : "Where Pastor Simon sends the account details, and where the updates go."
        }
      >
        <input name="email" type="email" required className={inputClass} />
      </Field>

      <Field label="Anything you would like to say">
        <textarea name="message" rows={3} className={inputClass} />
      </Field>

      <FormError>{state?.error}</FormError>

      {/*
        Two doors, and the order of them is the whole design.

        Paying now is first and is the button that looks like a button, because
        it is what most people want and it is the only one that finishes the job
        in one sitting. Sending it another way is second and deliberately plain
        — not hidden, because a church wiring $5,000 from Ohio should not be
        made to pay a card fee on it, and that giver is worth more to the
        ministry than the convenience of a single code path.

        Both are submit buttons on the same form, so both carry the same
        validated amount. Only the one actually pressed contributes its name and
        value, which is how the action tells them apart. Pressing Enter in a
        text field picks the first submit button — the paying one — which is the
        right default.
      */}
      {canPay ? (
        <div className="space-y-4">
          <Submit
            pending={pending}
            pendingLabel="Taking you to Pesapal…"
            tone="green"
            name="intent"
            value="pay"
            icon={<Icon name="give" className="h-[1.15em] w-[1.15em]" />}
          >
            {amountLabel ? `Give ${amountLabel} now` : "Give now"}
          </Submit>

          <p className="text-center text-xs leading-relaxed text-smoke">
            By M-Pesa or card, through Pesapal. Your card details are entered on
            Pesapal&apos;s own page and never touch this site.
          </p>

          <p className="text-center text-sm">
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer font-medium text-plum underline underline-offset-4 disabled:opacity-60"
            >
              I&apos;d rather send it another way
            </button>
          </p>

          <p className="text-center text-xs leading-relaxed text-smoke">
            Records what you intend to give and nothing else — Pastor Simon
            replies with the account details himself. Best for bank transfers
            and larger gifts from overseas.
          </p>
        </div>
      ) : (
        <>
          <Submit
            pending={pending}
            pendingLabel="Recording…"
            tone="green"
            icon={<Icon name="give" className="h-[1.15em] w-[1.15em]" />}
          >
            {chosen ? "Claim this amount" : "Record this gift"}
          </Submit>

          <p className="text-center text-xs leading-relaxed text-smoke">
            No payment is taken here and no card details are asked for. This
            records what you intend to give; Pastor Simon replies with the
            account details himself.
          </p>
        </>
      )}
    </form>
  );
}
