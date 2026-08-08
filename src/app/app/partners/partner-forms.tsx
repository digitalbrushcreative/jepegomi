"use client";

import { useActionState, useState, useTransition } from "react";
import { NEED_AREAS, PARTNER_KINDS, type PartnerWithTotals } from "@/lib/giving";
import { usd } from "@/lib/money";
import {
  addPartnerAction,
  issueLoginAction,
  recordGiftAction,
  revokeLoginAction,
  seedEncounterChurchAction,
  setVerifiedAction,
  updatePartnerAction,
} from "./actions";

const inputClass =
  "mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20";

const quietButton =
  "cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum disabled:opacity-60";

const primaryButton =
  "cursor-pointer rounded bg-green px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60";

/** One item a gift can be recorded against, as the page hands it over. */
export type GiftTarget = {
  id: string;
  title: string;
  areaLabel: string;
  openCents: number;
  /** Whether the public can see it — a gift may be recorded against any of them. */
  state: "open" | "draft" | "finished";
};

/**
 * The one-click version, for the one partner it is worth writing a button for.
 *
 * Their email is asked for rather than assumed, because it is the address they
 * would sign in with and it is not something this repository has any business
 * guessing. Everything else — the six budget lines, the figures, the $8,000 — is
 * read out of the reconciliation in src/content/kitchen.ts.
 */
export function SeedEncounterForm() {
  const [state, formAction, pending] = useActionState(
    seedEncounterChurchAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 border-t border-black/8 pt-6">
      <label className="block max-w-sm">
        <span className="eyebrow text-smoke">Encounter Church&apos;s email</span>
        <input
          name="email"
          type="email"
          required
          className={inputClass}
          placeholder="office@encounterchurch.org"
        />
        <span className="mt-2 block text-xs text-smoke">
          The address they would sign in with. Nothing is sent to it now.
        </span>
      </label>

      {/*
        Only an error can appear here. Success redirects — see the note on
        `seedEncounterChurchAction` — and this whole panel is gone by the time
        the page comes back, replaced by their card.
      */}
      {state?.error && (
        <p role="alert" className="mt-4 text-sm text-plum">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButton} mt-5`}>
        {pending ? "Adding…" : "Add Encounter Church and their giving"}
      </button>
    </form>
  );
}

/**
 * Adding a partner nobody's form ever met.
 *
 * Folded away behind a summary rather than sitting open at the top of the page,
 * because it is the rarer of the two ways a partner appears and an open form is
 * a form that gets half-filled by accident. The page's own text says who it is
 * for.
 */
export function AddPartnerForm() {
  const [state, formAction, pending] = useActionState(addPartnerAction, undefined);

  return (
    <form action={formAction}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-smoke">Their name</span>
          <input
            name="name"
            required
            placeholder="Encounter Church"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Email</span>
          <input
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="office@example.org"
          />
          <span className="mt-2 block text-xs text-smoke">
            The address they would sign in with, if they ever want a login.
          </span>
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Kind</span>
          <select name="kind" defaultValue="church" className={inputClass}>
            {PARTNER_KINDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Where they are</span>
          <input name="location" className={inputClass} placeholder="United States" />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Who to write to</span>
          <input name="contactName" className={inputClass} />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="eyebrow text-smoke">Your note</span>
        <textarea name="note" rows={2} className={inputClass} />
        <span className="mt-2 block text-xs text-smoke">
          For you only. Never shown to them or to anybody else.
        </span>
      </label>

      <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-smoke">
        <input
          type="checkbox"
          name="verified"
          defaultChecked
          className="mt-0.5 h-4 w-4 accent-green"
        />
        <span>
          I know who this is — mark them verified. Untick it if their details
          came to you second-hand.
        </span>
      </label>

      {/*
        Only an error lands back here — success redirects, and the page comes
        back with their card on it. See the note on `addPartnerAction`.
      */}
      {state?.error && (
        <p role="alert" className="mt-4 text-sm text-plum">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButton} mt-5`}>
        {pending ? "Adding…" : "Add this partner"}
      </button>
    </form>
  );
}

/**
 * Writing down a gift that arrived off the site.
 *
 * The three kinds of answer to "what was it towards?" are one control, in the
 * order they are most often true: a listed item, an arm of the ministry, or
 * words of your own. Only the last one asks a second question, and it only asks
 * it once it has been chosen.
 */
export function RecordGiftForm({
  partner,
  targets,
}: {
  partner: PartnerWithTotals;
  targets: GiftTarget[];
}) {
  const [state, formAction, pending] = useActionState(recordGiftAction, undefined);
  const [towards, setTowards] = useState("");

  return (
    <form action={formAction}>
      <input type="hidden" name="partnerId" value={partner.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-smoke">How much, in dollars</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="850"
            className={`${inputClass} tabular`}
          />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Has it arrived?</span>
          <select name="status" defaultValue="received" className={inputClass}>
            <option value="received">Yes — it is in the bank</option>
            <option value="promised">Not yet — they have promised it</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className="eyebrow text-smoke">What was it towards?</span>
        <select
          name="towards"
          required
          value={towards}
          onChange={(event) => setTowards(event.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Choose…
          </option>

          {targets.length > 0 && (
            <optgroup label="A listed item">
              {targets.map((target) => (
                <option key={target.id} value={`need:${target.id}`}>
                  {target.title} ({target.areaLabel})
                  {target.state !== "open" && ` · ${target.state}`} —{" "}
                  {usd(target.openCents)} unclaimed
                </option>
              ))}
            </optgroup>
          )}

          <optgroup label="An arm of the ministry">
            {NEED_AREAS.map((area) => (
              <option key={area.id} value={`area:${area.id}`}>
                {area.label}
              </option>
            ))}
          </optgroup>

          <option value="other">Something else — I will write it</option>
        </select>
      </label>

      {towards === "other" && (
        <label className="mt-4 block">
          <span className="eyebrow text-smoke">In your words</span>
          <input
            name="designation"
            required
            maxLength={120}
            placeholder="School fees for one child"
            className={inputClass}
          />
          <span className="mt-2 block text-xs text-smoke">
            Goes on the ledger exactly as you write it, and is what they see on
            their own page.
          </span>
        </label>
      )}

      <label className="mt-4 block">
        <span className="eyebrow text-smoke">Anything they said with it</span>
        <textarea name="message" rows={2} className={inputClass} />
      </label>

      {state?.error && (
        <p role="alert" className="mt-4 text-sm text-plum">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="mt-4 text-sm text-green">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButton} mt-5`}>
        {pending ? "Recording…" : "Record this gift"}
      </button>
    </form>
  );
}

export function VerifyButton({
  partnerId,
  verified,
  name,
}: {
  partnerId: string;
  verified: boolean;
  name: string;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          verified &&
          !confirm(
            `Un-verify ${name}? Their login stops working immediately and their password is cleared.`,
          )
        ) {
          return;
        }
        start(() => {
          void setVerifiedAction(partnerId, !verified);
        });
      }}
      className={
        verified
          ? quietButton
          : "cursor-pointer rounded bg-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60"
      }
    >
      {pending ? "Saving…" : verified ? "Un-verify" : "Verify this partner"}
    </button>
  );
}

export function RevokeLoginButton({ partnerId, name }: { partnerId: string; name: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Take away ${name}'s login? They stay verified.`)) return;
        start(() => {
          void revokeLoginAction(partnerId);
        });
      }}
      className={quietButton}
    >
      {pending ? "Removing…" : "Remove their login"}
    </button>
  );
}

/**
 * Issuing a password.
 *
 * Shown in plain text, and generated rather than invented, for the same reason
 * the People tab does it: Simon has to be able to read it down a phone line to
 * a pastor in Pennsylvania. There is no email being sent from this site, so a
 * password nobody can read is a password nobody can use.
 */
export function IssueLoginForm({ partner }: { partner: PartnerWithTotals }) {
  const [state, formAction, pending] = useActionState(issueLoginAction, undefined);
  const [password, setPassword] = useState("");

  const suggest = () => {
    /*
      Four short words. Long enough to be genuinely hard to guess, and shaped so
      it survives being read aloud — which a jumble of symbols does not.
    */
    const words = [
      "kahawa", "marigold", "harvest", "kitchen", "lantern", "porridge",
      "sunrise", "acacia", "cobble", "rooftop", "mango", "thicket",
    ];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    setPassword(`${pick()}-${pick()}-${pick()}-${pick()}`);
  };

  if (!partner.verified) {
    return (
      <p className="text-sm leading-relaxed text-smoke">
        Verify them first. A login is only offered once you have confirmed who
        they are.
      </p>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="partnerId" value={partner.id} />

      <label className="block">
        <span className="eyebrow text-smoke">
          {partner.hasLogin ? "Set a new password" : "Give them a password"}
        </span>
        <input
          name="password"
          type="text"
          required
          minLength={10}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`${inputClass} font-mono`}
        />
      </label>

      {/*
        Emailing it is a choice rather than what happens by default-and-silently.
        Simon may well be about to read the password down the phone, and a copy
        landing in an inbox he did not ask for is a copy sitting there for good.
        Checked to start with, because sending it is the usual case.
      */}
      <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-smoke">
        <input
          type="checkbox"
          name="notify"
          defaultChecked
          className="mt-0.5 h-4 w-4 accent-green"
        />
        <span>
          Email it to <strong className="text-charcoal">{partner.email}</strong>{" "}
          with the sign-in link
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={suggest} className={quietButton}>
          Suggest one
        </button>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded bg-green px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60"
        >
          {pending ? "Saving…" : partner.hasLogin ? "Change it" : "Give them a login"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-smoke">
        Shown in plain text on purpose, so you can read it out to them if you
        would rather not send it.
      </p>

      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-plum">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="mt-3 text-sm text-green">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function PartnerDetailsForm({ partner }: { partner: PartnerWithTotals }) {
  const [state, formAction, pending] = useActionState(updatePartnerAction, undefined);

  return (
    <form action={formAction}>
      <input type="hidden" name="partnerId" value={partner.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-smoke">Name</span>
          <input
            name="name"
            required
            defaultValue={partner.name}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Kind</span>
          <select name="kind" defaultValue={partner.kind} className={inputClass}>
            {PARTNER_KINDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Where they are</span>
          <input
            name="location"
            defaultValue={partner.location}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Who to write to</span>
          <input
            name="contactName"
            defaultValue={partner.contactName}
            className={inputClass}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="eyebrow text-smoke">Your note</span>
        <textarea
          name="note"
          rows={2}
          defaultValue={partner.note}
          className={inputClass}
        />
        <span className="mt-2 block text-xs text-smoke">
          For you only. How you know them, when you last spoke — never shown to
          them or to anybody else.
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-plum">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="mt-3 text-sm text-green">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${quietButton} mt-4`}
      >
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
