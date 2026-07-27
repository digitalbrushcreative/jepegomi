"use client";

import { useActionState, useState, useTransition } from "react";
import { PARTNER_KINDS, type PartnerWithTotals } from "@/lib/giving";
import {
  issueLoginAction,
  revokeLoginAction,
  setVerifiedAction,
  updatePartnerAction,
} from "./actions";

const inputClass =
  "mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20";

const quietButton =
  "cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum disabled:opacity-60";

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

      <div className="mt-3 flex flex-wrap items-center gap-3">
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
        Shown in plain text on purpose — nothing is emailed from this site, so
        you have to be able to read it out to them.
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
