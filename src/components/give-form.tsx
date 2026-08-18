"use client";

import {
  Fragment,
  type ReactNode,
  useActionState,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { type GiveState, giveAction } from "@/app/(site)/give/actions";
import {
  CaptchaNotice,
  Done,
  Field,
  FormError,
  SpamTraps,
  Submit,
  buttonClass,
  inputClass,
} from "@/components/form";
import { HiddenFigure } from "@/components/hidden-figure";
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
 * Above that list sit the projects themselves, each with what the whole job
 * comes to — the playground, the bus, the streaming kit. Only the kitchen has
 * ever been broken into lines, and a form that offers cement and nothing else
 * turns away everybody who came to give towards a bus. The two kinds of choice
 * behave differently in one respect and it runs all the way through this file:
 * an item has a balance that a gift eats into, a project has a target that it
 * does not. See `openCents` on GiveChoice.
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
 *
 * All of that had grown into one screen asking eleven questions at once, and a
 * picker long enough to scroll on top of it. So it is two halves now: what the
 * gift is for and how much, then who is giving. The split is presentational and
 * nothing else — one form, one action, one POST, every field named exactly what
 * it was named before. The first half is hidden rather than unmounted when the
 * second is showing, which is what keeps that true: the browser submits the
 * whole form either way, so nothing has to be copied into hidden inputs and
 * kept in step with the boxes it was copied from.
 *
 * Which half is showing is a fact about a browser that has finished hydrating.
 * Until then — and for anything rendering this markup without React at all —
 * both halves are drawn, one after the other, exactly the long single page this
 * used to be. That is what `stepped` below is for, and why every step-only
 * control is drawn behind it. It matters most in the seconds before the bundle
 * lands: the whole reason the boxes below use `defaultValue` is that people
 * type into this form before React is ready, and a half of it that is hidden by
 * something React has not run yet is a half nobody can fill in.
 */

export type GiveChoice = {
  /**
   * What the radio submits: a need's slug, or `project:<area>` for a whole
   * project. Built by the page — see `projectValue` in lib/giving.ts — and read
   * back by the action, which is the only place either form is interpreted.
   */
  value: string;
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
  /**
   * What is left of a costed item, and the ceiling on a gift towards it.
   *
   * Absent on a whole project, and that absence is the difference between the
   * two kinds of choice. An item has a balance — take it and it is gone — so
   * the amount is checked against it here and again in the action. A project has
   * a target: nothing is being held, nothing runs out, and no amount is too
   * large.
   */
  openCents?: number;
  /** What the whole job comes to. Set on a project choice, absent on an item. */
  costCents?: number;
};

/** The form's word for "not one of the listed items". Matched in giveAction. */
const OTHER = "other";

/**
 * Whether the client bundle has taken over — and so whether this form is
 * allowed to hide half of itself.
 *
 * It cannot be plain state. State says "false" on the server and "false" again
 * on the hydrating render, then never changes without an effect setting it,
 * which is the one thing React's lint rule is right to object to. And it must
 * not be assumed either — a half hidden by markup that arrives already folded
 * is a half nobody can fill in until React turns up to unfold it.
 *
 * `useSyncExternalStore` with two different snapshots is exactly this question.
 * The server, and the hydrating render that has to match it, get `false` — both
 * halves drawn. The moment hydration is done React re-reads the client snapshot,
 * gets `true`, and the form folds itself in two. Nothing is subscribed to,
 * because nothing ever changes it back.
 */
const nothingChanges = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    nothingChanges,
    () => true,
    () => false,
  );

/**
 * The line that says where in the form somebody is.
 *
 * Deliberately one small line rather than a heading: every step already opens
 * with a question in a label — "What would you like your gift to go to?", "Who
 * is giving?" — and a title above that question would be the second thing on
 * the screen saying the same thing. It is focusable so that moving between the
 * halves can move the focus somewhere that says which half you are now in,
 * rather than dumping a keyboard at the top of a page that silently changed
 * underneath it.
 */
function StepMarker({
  ref,
  index,
  title,
}: {
  ref: React.RefObject<HTMLParagraphElement | null>;
  index: number;
  title: string;
}) {
  return (
    <p
      ref={ref}
      tabIndex={-1}
      className="eyebrow mb-6 block text-plum outline-none"
    >
      Step {index} of 2 <span className="text-smoke">· {title}</span>
    </p>
  );
}

/**
 * What the first half decided, carried into the second.
 *
 * A two-step form's one real cost is that the question you answered is off the
 * screen while you answer the next one — so a giver typing their email should
 * be able to see, without going back, that this is $250 towards the cabro
 * floor and not $250 towards the bus. The way back is beside it and says so.
 */
function ChosenSummary({
  amount,
  towards,
  onChange,
}: {
  amount: string;
  towards: string;
  onChange: () => void;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-green/25 bg-green/8 px-4 py-3.5">
      <span className="min-w-0">
        <span className="font-display tabular text-lg font-semibold text-green">
          {amount}
        </span>{" "}
        <span className="text-sm text-smoke">towards {towards}</span>
      </span>
      <button
        type="button"
        onClick={onChange}
        className="cursor-pointer text-sm font-medium text-plum underline underline-offset-4"
      >
        Change
      </button>
    </div>
  );
}

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
          : "This one is not against a costed item, so no figure on the site changes. It is recorded, and Pastor Simon has it in front of him."}
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
        Once the gift arrives it is marked received here, and we will send you
        updates and photographs of the work it paid for.
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
 *
 * A title and a figure, and nothing else. Every row used to carry a second line
 * as well — "still open" under an item, "the whole job — any part of it helps"
 * under a project — which said the same two things under every row in the list
 * and made a list of eleven choices twice as tall as the choosing warranted.
 * The distinction those lines were drawing is real, but the place for it is not
 * eleven times over: the amount box below says which kind of figure this is the
 * moment a row is picked, and says it about the one row that now matters.
 */
function Choice({
  value,
  checked,
  onChoose,
  title,
  figure,
}: {
  value: string;
  checked: boolean;
  onChoose: () => void;
  title: string;
  /** A node, because the figure may be a blur rather than a price. */
  figure?: ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3.5 border-b border-sand-deep px-4 py-3.5 transition-colors last:border-b-0 ${
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
      {/*
        Still wrapping, and still `items-baseline`: a title long enough to run
        to two lines on a phone — "Cabro stones — the children's eating area
        floor" — drops its figure onto a line of its own rather than squeezing
        the title into a column three words wide.
      */}
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium">{title}</span>
        {figure && (
          <span className="tabular text-sm font-bold text-green">{figure}</span>
        )}
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
  /*
    Opaque, not bg-sand/95. The 5% let the rows scrolling underneath show
    through the heading, which put the project name — the one word telling a
    giver what they are about to fund — as low as 1.2:1 against whatever
    happened to be passing behind it.
  */
  return (
    <div className="sticky top-0 z-10 border-b border-sand-deep bg-sand px-4 py-2.5">
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
  initialTowards,
  contactEmail,
  canPay = false,
  revealed = false,
}: {
  /** The costed items still open. On a need's own page this is that one need. */
  choices: GiveChoice[];
  /**
   * Whether the person filling this in may read the ledger's figures.
   *
   * The form is the one place on the site where a price and a text box sit next
   * to each other, which makes it the easiest place to get a gate wrong in both
   * directions. Hide too much and giving stops working — nobody can decide what
   * to type. Hide too little and this becomes the hole in the wall: every
   * balance on the ledger, listed, on a page anybody can open.
   *
   * The line drawn is *the ledger's figures out, the giver's own arithmetic in*.
   * What an item has left, and the chips built from it, are behind the door. The
   * box, the amount somebody types, the running total on the button and every
   * sentence about their own gift are not — those are theirs, not ours, and a
   * form that would not tell you what you had just typed would be absurd.
   *
   * A prop and not a hook, because this is a client component. It arrives with
   * the amounts already stripped out of `choices` rather than merely unrendered
   * — see components/give-panel.tsx — so a `false` here always comes with an
   * array that has no figures in it, and there is nothing left in the payload
   * for this flag to be wrong about.
   */
  revealed?: boolean;
  /** True when the item is already decided, so the picker is not shown at all. */
  fixed?: boolean;
  /**
   * What the picker starts on, for a giver who arrived from a project page
   * having already chosen — "Give to the playground" should not open a form
   * that asks which playground. Ignored if it names nothing in the list, so a
   * stale or hand-typed link falls back to asking rather than to an error.
   */
  initialTowards?: string;
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
    Nothing is pre-selected on /give unless the giver arrived having already
    chosen. A radio sitting on the first item of its own accord is a form that
    answers its own question, and the first item is not more deserving than the
    ninth — it is just the one Simon happened to add first. A link that names
    one is different: somebody pressed "Give to the playground", and asking them
    again is asking them to repeat themselves.
  */
  const [towards, setTowards] = useState(
    fixed && choices[0]
      ? choices[0].value
      : initialTowards && choices.some((choice) => choice.value === initialTowards)
        ? initialTowards
        : choices.length === 0
          ? OTHER
          : "",
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

  const stepped = useHydrated();
  const [step, setStep] = useState<1 | 2>(1);
  /**
   * What is wrong with the first half, in the same words the action would use
   * for the same fault. It has to be the form's own message rather than the
   * browser's: the amount box has a rule no HTML attribute knows about — an
   * item's balance — and being told "please fill in this field" by Chrome for
   * two of the four faults and something quite different for the other two is
   * how a form starts to feel like two forms.
   */
  const [stepError, setStepError] = useState("");

  const formRef = useRef<HTMLFormElement>(null);
  const giftMarkerRef = useRef<HTMLParagraphElement>(null);
  const detailsMarkerRef = useRef<HTMLParagraphElement>(null);

  if (state?.done) return <Thanks state={state.done} email={contactEmail} />;

  const chosen = choices.find((choice) => choice.value === towards);
  /** The balance on a costed item. Undefined on a whole project, which has none. */
  const openCents = chosen?.openCents;

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

    Against a whole project, or against nothing in particular, these are just
    the amounts people give. A project is not divided the same way on purpose: a
    quarter of a $15,500 bus is $3,875, and a row of chips starting there tells
    somebody with $50 that this appeal is not for them.
  */
  const suggestions =
    openCents !== undefined
      ? [
          Math.round(openCents / 4 / 100) * 100,
          Math.round(openCents / 2 / 100) * 100,
          openCents,
        ].filter(
          (cents, index, all) =>
            cents > 0 && cents <= openCents && all.indexOf(cents) === index,
        )
      : [5_000, 10_000, 25_000, 50_000];

  /*
    Both halves are in the DOM the whole time; these decide which one the
    browser draws. Until React has hydrated, both are true and the form is the
    single long page it always was.
  */
  const showingGift = !stepped || step === 1;
  const showingDetails = !stepped || step === 2;

  const show = (
    next: 1 | 2,
    marker: React.RefObject<HTMLParagraphElement | null>,
  ) => {
    setStep(next);
    setStepError("");

    /*
      Focus follows the half being shown, or a keyboard is left pointing at a
      button that just went `display: none` — which puts it back at the top of
      the document with no idea anything moved.

      The scroll only happens when the top of the form is not already in front
      of somebody: on /give the picker is tall enough that "Continue" can be
      most of a screen below where the form starts, and the half that replaces
      it is short. Scrolling when the form is still where the eye left it would
      be moving the page under somebody for no reason.

      The clearance is the site header, which is fixed and four rem tall — so
      "at the top of the window" and "where somebody can see it" are two
      different places, and the `scroll-mt-24` on the form below is what settles
      the difference.
    */
    requestAnimationFrame(() => {
      marker.current?.focus();

      const form = formRef.current;
      if (form && form.getBoundingClientRect().top < 96) {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  /**
   * The first half, checked before it is put away.
   *
   * Every message here is the one `giveAction` gives for the same fault, on
   * purpose — this is a courtesy in front of the server's answer, not a second
   * opinion about what is allowed. The server checks all of it again anyway,
   * against a balance that may well have moved while somebody was typing.
   */
  const forward = () => {
    /*
      Read from the boxes rather than from the copies in state. Anything typed
      before the client bundle arrived never fired an onChange, so the copy can
      be empty while the box in front of the giver plainly says 250 — and
      refusing to go on because of that would be the form arguing with what is
      on the screen. Read once, and put the copies right while we are here,
      because the summary and the buttons in the second half are drawn from
      them.
    */
    const typed = amountRef.current?.value ?? amount;
    const said = (designationRef.current?.value ?? designation).trim();
    setAmountValue(typed);
    setDesignationValue(said);

    if (!towards) {
      setStepError(
        "Choose something from the list, or tell us what to put it towards.",
      );
      return;
    }

    if (towards === OTHER && !said) {
      setStepError("Say what you would like the gift to go towards.");
      designationRef.current?.focus();
      return;
    }

    const cents = parseUsd(typed);
    if (cents === null) {
      setStepError("Enter the amount you would like to give, like 250.");
      amountRef.current?.focus();
      return;
    }

    if (openCents !== undefined && cents > openCents) {
      setStepError(
        `Only ${usd(openCents)} of that item is still open. Try that, or less.`,
      );
      amountRef.current?.focus();
      return;
    }

    show(2, detailsMarkerRef);
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="relative scroll-mt-24"
      /*
        Enter, in the first half, means "next" and not "submit".

        It has to be caught: the buttons that submit this form live in the
        second half, and while that half is hidden they are a `required` name
        and a `required` email the browser cannot focus to complain about. The
        submission simply dies, silently, with a line in the console — which is
        the worst way for a form to answer a keypress.

        Inputs and selects only. Enter on a button is a click, and cancelling
        that would break the suggestion chips and this very control.
      */
      onKeyDown={(event) => {
        if (!stepped || step !== 1 || event.key !== "Enter") return;

        const tag = (event.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "SELECT") return;

        event.preventDefault();
        forward();
      }}
    >
      <SpamTraps action="give" />

      <div hidden={!showingGift}>
        {stepped && (
          <StepMarker ref={giftMarkerRef} index={1} title="Your gift" />
        )}

        <div className="space-y-7">
          {/*
            Three states, and only the last of them is a picker: the item is
            already decided (a need's own page), there is nothing listed to pick
            from (an empty or unreachable ledger — the form still has to work),
            or there is a list. A picker offering one option is not a choice, so
            it is not drawn.
          */}
          {fixed && choices[0] ? (
            <input type="hidden" name="towards" value={choices[0].value} />
          ) : choices.length === 0 ? (
            <input type="hidden" name="towards" value={OTHER} />
          ) : (
            <fieldset>
              <legend className="block text-sm font-bold text-smoke">
                What would you like your gift to go to?
              </legend>
              <p className="mt-2 text-sm leading-relaxed text-smoke">
                Choose a whole project, one of the costs inside a project, or
                part of either. If none of these is what you had in mind, say so
                in your own words.
              </p>

              {/*
                Scrolls once the list is long enough that it would otherwise
                push the amount box — the thing the picker exists to lead to —
                off the bottom of the screen.
              */}
              {/*
                No `bg-white` of its own: on /give this list sits inside a white
                card already, and a second white surface with its own border and
                radius inside the first reads as a card stacked on a card. The
                border is doing the only job needed here — marking where the
                scrolling region starts and stops.
              */}
              <div
                className={`mt-3 overflow-hidden rounded-xl border border-black/12 ${
                  choices.length > 6 ? "max-h-[26rem] overflow-y-auto" : ""
                }`}
              >
                {choices.map((choice, index) => {
                  /*
                    A heading whenever the run changes, which is why the order
                    the page hands these over in matters: the choices arrive
                    already grouped, project by project and part by part, and
                    this simply notices the seam. Comparing against the previous
                    choice rather than building nested arrays keeps one flat list
                    of radios named "towards" — exactly what the picker had
                    before — so there is still no way for the browser to submit
                    two of them.
                  */
                  const previous = choices[index - 1];
                  const newProject = previous?.areaLabel !== choice.areaLabel;
                  const newPart =
                    newProject || previous?.partTitle !== choice.partTitle;

                  /*
                    A Fragment rather than a wrapper element, so every radio
                    stays a direct child of the scrolling box — `last:border-b-0`
                    on the rows below depends on it, and so does the box not
                    growing a stack of nested divs for the sake of two headings.
                  */
                  return (
                    <Fragment key={choice.value}>
                      {newPart && (
                        <GroupHeading
                          project={choice.areaLabel}
                          part={choice.partTitle}
                          summary={choice.partSummary}
                        />
                      )}
                      <Choice
                        value={choice.value}
                        checked={towards === choice.value}
                        onChoose={() => {
                          setTowards(choice.value);
                          setAmount("");
                          setStepError("");
                        }}
                        title={choice.title}
                        /*
                          A balance on an item, the price of the job on a
                          project — two different figures wearing the same
                          typeface, and the row no longer says which. What says
                          it is the hint under the amount box, in the sentence
                          that begins "$850 of this is still open" or "The whole
                          of this comes to $9,580": the distinction is drawn
                          once, about the row that was actually picked, at the
                          moment somebody is deciding what to type.
                        */
                        figure={
                          revealed ? (
                            usd(choice.openCents ?? choice.costCents ?? 0)
                          ) : (
                            <HiddenFigure />
                          )
                        }
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
                    setStepError("");
                  }}
                  /*
                    No figure, and no second line either — picking it opens the
                    box that asks the question, which is a better answer than a
                    row explaining in advance what the row would do.
                  */
                  title="Something else"
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
            buttons below it do, and getting it wrong is worse than saying
            nothing. With Pesapal on, "nothing is taken now" is simply false —
            the next tap goes to a payment page — and a giver who reads it and
            then finds themselves being charged has been misled at the exact
            moment they were deciding to trust us.
          */}
          <Field
            label="How much would you like to give?"
            hint={
              /*
                The first two branches recite a ledger figure, so they are only
                reachable when there is one to recite: `openCents` and
                `costCents` are stripped from the choices for anybody signed out,
                which drops the sentence through to the plainer wording below.
                The distinction those two draw — a balance that runs out, against
                a target that does not — is only worth drawing beside the number
                it is about.
              */
              openCents !== undefined
                ? `${usd(openCents)} of this is still open. You can give any part of it.`
                : chosen?.costCents !== undefined
                  ? `The whole of this comes to ${usd(chosen.costCents)}. You can give any part of it.`
                  : chosen
                    ? "Any part of it is a real answer — whatever you can."
                    : canPay
                      ? "Whatever you can. You choose on the next step whether to pay it now or send it another way."
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
                  {cents === openCents ? `All of it — ${usd(cents)}` : usd(cents)}
                </button>
              ))}
            </span>
          </Field>

          {/*
            Plum, not green. Green on this site means money moving, and this
            button moves nobody's money — it turns a page. Keeping it plum
            leaves the giving colour to the one button that actually gives, at
            the bottom of the next half, where a giver should be in no doubt
            about which press is the one that counts.
          */}
          {stepped && (
            <div className="space-y-4">
              <FormError>{stepError}</FormError>

              <button type="button" onClick={forward} className={buttonClass()}>
                {amountLabel ? `Continue with ${amountLabel}` : "Continue"}
              </button>

              <p className="measure mx-auto text-center text-xs leading-relaxed text-smoke">
                Next: who the gift is from. Nothing is recorded until you finish
                there, and you can come back and change this.
              </p>
            </div>
          )}
        </div>
      </div>

      <div hidden={!showingDetails}>
        {stepped && (
          <StepMarker ref={detailsMarkerRef} index={2} title="Your details" />
        )}

        <div className="space-y-7">
          {stepped && (
            <ChosenSummary
              amount={amountLabel}
              /*
                The item's own title, or — for a whole project, or for a gift
                somebody described themselves — the words that will go on the
                ledger. Never the slug: this line exists to be read back, and
                "t-cabro-floor" is not something anybody agreed to.
              */
              towards={chosen ? chosen.title : designation}
              onChange={() => show(1, giftMarkerRef)}
            />
          )}

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

            Paying now is first and is the button that looks like a button,
            because it is what most people want and it is the only one that
            finishes the job in one sitting. Sending it another way is second and
            deliberately plain — not hidden, because a church wiring $5,000 from
            Ohio should not be made to pay a card fee on it, and that giver is
            worth more to the ministry than the convenience of a single code
            path.

            Both are submit buttons on the same form, so both carry the same
            validated amount — including the fields in the half above, which are
            hidden rather than removed and so are posted exactly as they were
            filled in. Only the one actually pressed contributes its name and
            value, which is how the action tells them apart. Pressing Enter in a
            text field picks the first submit button — the paying one — which is
            the right default.
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

              <p className="measure mx-auto text-center text-xs leading-relaxed text-smoke">
                By M-Pesa or card, through Pesapal. Your card details are entered
                on Pesapal&apos;s own page and never touch this site.
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

              <p className="measure mx-auto text-center text-xs leading-relaxed text-smoke">
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
                {openCents !== undefined ? "Claim this amount" : "Record this gift"}
              </Submit>

              <p className="measure mx-auto text-center text-xs leading-relaxed text-smoke">
                No payment is taken here and no card details are asked for. This
                records what you intend to give; Pastor Simon replies with the
                account details himself.
              </p>
            </>
          )}

          <CaptchaNotice className="measure mx-auto text-center text-smoke" />
        </div>
      </div>
    </form>
  );
}
