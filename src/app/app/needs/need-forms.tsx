"use client";

import { useActionState, useTransition } from "react";
import { usd } from "@/lib/money";
import {
  NEED_AREAS,
  type NeedWithLedger,
  type PledgeStatus,
} from "@/lib/giving";
import {
  createNeedAction,
  deleteNeedAction,
  deleteUpdateAction,
  postUpdateAction,
  seedKitchenNeedsAction,
  setPledgeStatusAction,
  updateNeedAction,
} from "./actions";

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
        <span className="mt-2 block text-sm leading-relaxed text-smoke">{hint}</span>
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
        Saved. It is live on the site now.
      </p>
    );
  }
  return null;
}

/**
 * The fields of a need, shared by the "add" form and the "edit" form.
 *
 * One component rather than two because the two forms differ in exactly two
 * ways — which action they post to, and whether they carry an id — and a need
 * whose editor showed a field its creator did not is how a cost ends up saved
 * without the summary that explains it.
 */
function NeedFields({ need }: { need?: NeedWithLedger }) {
  return (
    <>
      <Field label="What is needed">
        <input
          name="title"
          required
          defaultValue={need?.title}
          placeholder="Water tank for harvesting water, plus pipes"
          className={inputClass}
        />
      </Field>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <Field
          label="What it costs"
          hint={
            need && need.ledger.receivedCents + need.ledger.promisedCents > 0
              ? `Cannot go below ${usd(need.ledger.receivedCents + need.ledger.promisedCents)} — that much is already claimed.`
              : "In US dollars."
          }
        >
          <input
            name="cost"
            required
            inputMode="decimal"
            defaultValue={need ? String(need.costCents / 100) : ""}
            placeholder="850"
            className={`${inputClass} tabular`}
          />
        </Field>

        <Field label="Part of the ministry">
          <select
            name="area"
            defaultValue={need?.area ?? "other"}
            className={inputClass}
          >
            {NEED_AREAS.map((area) => (
              <option key={area.id} value={area.id}>
                {area.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Order" hint="Lower numbers come first on the page.">
          <input
            name="position"
            type="number"
            defaultValue={need?.position ?? 0}
            className={`${inputClass} tabular`}
          />
        </Field>
      </div>

      <Field
        label="One line about it"
        hint="Shown on the card in the list, under the name."
        className="mt-5"
      >
        <input
          name="summary"
          defaultValue={need?.summary}
          className={inputClass}
        />
      </Field>

      <Field
        label="The full explanation"
        hint="Shown on the item's own page. Leave a blank line between paragraphs."
        className="mt-5"
      >
        <textarea
          name="detail"
          rows={6}
          defaultValue={need?.detail}
          className={inputClass}
        />
      </Field>

      <div className="mt-6 space-y-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={need?.published ?? false}
            className="mt-1 h-4 w-4 accent-green"
          />
          <span className="text-sm leading-relaxed">
            <strong className="font-medium">Show this on the site.</strong>{" "}
            <span className="text-smoke">
              Until this is ticked, nobody outside /app can see it or give to it.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="closed"
            defaultChecked={need?.closed ?? false}
            className="mt-1 h-4 w-4 accent-plum"
          />
          <span className="text-sm leading-relaxed">
            <strong className="font-medium">The work on this is finished.</strong>{" "}
            <span className="text-smoke">
              It stops asking for money but stays on the page, with its ledger,
              as a record of what was done.
            </span>
          </span>
        </label>
      </div>
    </>
  );
}

export function NewNeedForm() {
  const [state, formAction, pending] = useActionState(createNeedAction, undefined);

  return (
    <form action={formAction} className="mt-6">
      <NeedFields />
      <Notice error={state?.error} saved={state?.saved} />
      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Adding…" : "Add this item"}
      </button>
    </form>
  );
}

export function EditNeedForm({ need }: { need: NeedWithLedger }) {
  const [state, formAction, pending] = useActionState(updateNeedAction, undefined);

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="id" value={need.id} />
      <NeedFields need={need} />
      <Notice error={state?.error} saved={state?.saved} />
      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function DeleteNeedButton({
  needId,
  title,
  claimed,
}: {
  needId: string;
  title: string;
  claimed: boolean;
}) {
  const [pending, start] = useTransition();

  /*
    Not offered at all once money is claimed against it. The action refuses too
    — that is where the rule actually lives — but a button that always fails is
    a worse explanation than no button and a sentence.
  */
  if (claimed) {
    return (
      <p className="text-sm leading-relaxed text-smoke">
        This cannot be deleted — money has been claimed against it. Tick
        &ldquo;the work is finished&rdquo; above to close it instead.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete “${title}”? Nothing has been claimed against it.`)) {
          return;
        }
        start(() => {
          void deleteNeedAction(needId);
        });
      }}
      className={quietButton}
    >
      {pending ? "Deleting…" : "Delete this item"}
    </button>
  );
}

/** The buttons that move a claim along: confirm it, bank it, or drop it. */
export function PledgeActions({
  pledgeId,
  status,
}: {
  pledgeId: string;
  status: PledgeStatus;
}) {
  const [pending, start] = useTransition();

  const move = (next: PledgeStatus, confirmation?: string) => {
    if (confirmation && !confirm(confirmation)) return;
    start(() => {
      void setPledgeStatusAction(pledgeId, next);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "received" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("received", "Mark this as received? Only do this once the money is actually in.")}
          className="cursor-pointer rounded bg-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60"
        >
          Money received
        </button>
      )}

      {status === "pending" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("promised")}
          className={quietButton}
        >
          Confirm the promise
        </button>
      )}

      {status !== "declined" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            move(
              "declined",
              "Withdraw this claim? The amount goes straight back to being open for somebody else.",
            )
          }
          className={quietButton}
        >
          Withdraw
        </button>
      )}

      {status === "declined" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => move("pending")}
          className={quietButton}
        >
          Put it back
        </button>
      )}
    </div>
  );
}

export function PostUpdateForm({ needId }: { needId: string }) {
  const [state, formAction, pending] = useActionState(postUpdateAction, undefined);

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="needId" value={needId} />

      <Field
        label="What has happened"
        hint="Written to the churches who paid for this. Leave a blank line between paragraphs."
      >
        <textarea name="body" rows={5} required className={inputClass} />
      </Field>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="A photo" hint="Optional. JPEG, PNG, WebP or AVIF, up to 15 MB.">
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="mt-2 w-full text-sm text-smoke file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm file:font-medium"
          />
        </Field>

        <Field
          label="What the photo shows"
          hint="Read aloud to people who cannot see it."
        >
          <input name="photoAlt" className={inputClass} />
        </Field>
      </div>

      {/*
        An upload can half-succeed — the words land and the picture does not —
        so this reports both outcomes at once rather than choosing one.
      */}
      {state?.error && (
        <p role="alert" className="mt-4 text-sm leading-relaxed text-plum">
          {state.error}
        </p>
      )}
      {state?.saved && !state?.error && (
        <p role="status" className="mt-4 text-sm text-green">
          Posted. It is on the item&apos;s page and on every partner&apos;s
          dashboard.
        </p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButton} mt-6`}>
        {pending ? "Posting…" : "Post this update"}
      </button>
    </form>
  );
}

export function DeleteUpdateButton({ updateId }: { updateId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this update? The photo goes with it.")) return;
        start(() => {
          void deleteUpdateAction(updateId);
        });
      }}
      className="cursor-pointer text-xs font-medium text-smoke underline underline-offset-4 hover:text-plum disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function SeedKitchenButton() {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(() => {
          void seedKitchenNeedsAction();
        });
      }}
      className={primaryButton}
    >
      {pending ? "Adding…" : "Add the three kitchen items"}
    </button>
  );
}
