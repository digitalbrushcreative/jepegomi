"use client";

import { useActionState } from "react";
import { NEED_AREAS, type NeedWithLedger } from "@/lib/giving";
import { usd } from "@/lib/money";
import {
  deleteSpendAction,
  recordSpendAction,
  updateSpendAction,
} from "./actions";

/**
 * The forms behind "Where the money went".
 *
 * Four boxes, the same four every time: what it was, what it was expected to
 * come to, what it actually came to, and one line saying why those differ. That
 * is the whole of a receipt as this ministry keeps one, and it is deliberately
 * far less than the Needs form asks for — no slug, no summary, no icon, no
 * publish switch. Somebody entering last term's fuel bill should not have to
 * decide whether it appears on the website.
 */

const inputClass =
  "mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20";

const primaryButton =
  "cursor-pointer rounded bg-green px-7 py-3 font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60";

const quietButton =
  "cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum disabled:opacity-60";

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
      {hint && (
        <span className="mt-2 block text-sm leading-relaxed text-smoke">
          {hint}
        </span>
      )}
    </label>
  );
}

function Notice({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) {
    return (
      <p role="alert" className="mt-4 text-sm leading-relaxed text-plum">
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p role="status" className="mt-4 text-sm text-green">
        Saved. The partners who paid towards this project see it now.
      </p>
    );
  }
  return null;
}

/**
 * The four boxes, shared by the add form and every edit form.
 *
 * `Actual` may be left empty and says so in its own hint, because that is the
 * state most likely to be got wrong: somebody with a receipt they cannot find
 * will otherwise type a guess, and a guessed figure in a set of accounts is
 * worse than an admitted gap. The action stores blank as zero and the accounts
 * print it as "Used". See the note in actions.ts.
 */
function SpendFields({ need }: { need?: NeedWithLedger }) {
  return (
    <>
      <Field
        label="What was bought"
        hint="As you would say it out loud — “cement, 30 bags” or “a term of fuel for the bus”."
      >
        <input
          name="title"
          required
          defaultValue={need?.title}
          placeholder="Cement — 30 bags"
          className={inputClass}
        />
      </Field>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field
          label="Estimated"
          hint="What you expected it to come to. Leave it blank if it came in at the price you planned — most things do."
        >
          <input
            name="estimated"
            inputMode="decimal"
            defaultValue={
              need?.estimatedCents ? String(need.estimatedCents / 100) : ""
            }
            placeholder="900"
            className={`${inputClass} tabular`}
          />
        </Field>

        <Field
          label="Actual"
          hint="What it really came to. Leave it blank if the amount was never written down — it will read as “Used”, which is the truth, rather than as nothing."
        >
          <input
            name="actual"
            inputMode="decimal"
            defaultValue={
              need && need.costCents > 0 ? String(need.costCents / 100) : ""
            }
            placeholder="1550"
            className={`${inputClass} tabular`}
          />
        </Field>
      </div>

      <Field
        label="Why the two differ"
        hint="One line, shown beside it — “price rose, and the drainage had to grow for NEEMA”. Leave it blank when nothing needs saying."
        className="mt-5"
      >
        <input
          name="note"
          defaultValue={need?.note ?? ""}
          placeholder="More needed for drainage work"
          className={inputClass}
        />
      </Field>
    </>
  );
}

export function RecordSpendForm({
  defaultArea,
  nextPosition,
}: {
  defaultArea?: string;
  /** Where it lands in the list — after everything already recorded. */
  nextPosition: number;
}) {
  const [state, formAction, pending] = useActionState(
    recordSpendAction,
    undefined,
  );

  return (
    <form action={formAction} className="p-5">
      <input type="hidden" name="position" value={nextPosition} />

      <Field
        label="Which project"
        hint="Whoever gave towards this project is who reads this line."
      >
        <select
          name="area"
          defaultValue={defaultArea ?? "kitchen"}
          className={inputClass}
        >
          {NEED_AREAS.map((area) => (
            <option key={area.id} value={area.id}>
              {area.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="mt-5">
        <SpendFields />
      </div>

      <Notice error={state?.error} saved={state?.saved} />

      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Recording…" : "Record this"}
      </button>
    </form>
  );
}

export function EditSpendForm({ need }: { need: NeedWithLedger }) {
  const [state, formAction, pending] = useActionState(
    updateSpendAction,
    undefined,
  );

  /*
    Two sibling forms in a wrapper, never one inside the other. A nested <form>
    is not a thing HTML has — the parser throws the inner one away and its
    button silently joins the outer form, so "Remove this line" would have run
    the save action and reported success at having changed nothing. It is also
    the better arrangement to look at: a destructive control belongs under a
    rule, away from the button you press every time.
  */
  return (
    <div className="border-t border-black/8 bg-sand/40 p-5">
      <form action={formAction}>
        <input type="hidden" name="id" value={need.id} />
        <SpendFields need={need} />
        <Notice error={state?.error} saved={state?.saved} />

        <button
          type="submit"
          disabled={pending}
          className={`${primaryButton} mt-6`}
        >
          {pending ? "Saving…" : "Save this line"}
        </button>
      </form>

      <div className="mt-5 border-t border-black/8 pt-5">
        <RemoveSpendButton need={need} />
      </div>
    </div>
  );
}

/**
 * Removing a line — for one entered twice, or filed against the wrong project.
 *
 * Its own component as well as its own form, so its pending state is its own:
 * "Saving…" appearing on the button beside the one somebody pressed is how they
 * come to press Remove a second time.
 *
 * The refusal from `deleteNeed` — a line a church has money against — is shown
 * before it is attempted, as a disabled button saying how much, and again as a
 * sentence if the action refuses anyway. That is not defensive duplication: the
 * kitchen's own six lines all carry Encounter Church's giving, so on this screen
 * the refusal is the ordinary case rather than the edge one, and a button that
 * looks pressable until it fails would be teaching the wrong thing about what
 * these rows are.
 */
function RemoveSpendButton({ need }: { need: NeedWithLedger }) {
  const [state, formAction, pending] = useActionState(
    deleteSpendAction,
    undefined,
  );

  const claimed = need.ledger.receivedCents + need.ledger.promisedCents;

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={need.id} />
      <button
        type="submit"
        disabled={pending || claimed > 0}
        className={quietButton}
      >
        {pending ? "Removing…" : "Remove this line"}
      </button>

      {claimed > 0 && (
        <p className="mt-2 text-sm leading-relaxed text-smoke">
          {usd(claimed)} of giving is recorded against this line, so it cannot be
          removed — the record of what somebody paid for is not ours to throw
          away. Correct the figures above instead.
        </p>
      )}

      {state?.error && (
        <p role="alert" className="mt-2 text-sm leading-relaxed text-plum">
          {state.error}
        </p>
      )}
    </form>
  );
}
