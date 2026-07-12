"use client";

import { useActionState, useTransition } from "react";
import { inviteUserAction, removeUserAction } from "../actions";

const inputClass =
  "mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(
    inviteUserAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="label-mono text-smoke">Name</span>
          <input name="name" required className={inputClass} />
        </label>

        <label className="block">
          <span className="label-mono text-smoke">Email</span>
          <input name="email" type="email" required className={inputClass} />
        </label>
      </div>

      <label className="mt-5 block">
        <span className="label-mono text-smoke">Password</span>
        <input
          name="password"
          type="text"
          required
          minLength={10}
          className={`${inputClass} font-mono`}
        />
        <span className="mt-2 block text-sm text-smoke">
          Shown in plain text on purpose — you have to be able to read it out to
          them. At least 10 characters.
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="mt-4 text-sm text-plum">
          {state.error}
        </p>
      )}

      {state?.saved && (
        <p role="status" className="mt-4 text-sm text-green">
          Added. They can sign in now.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 cursor-pointer rounded bg-green px-7 py-3 font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add person"}
      </button>
    </form>
  );
}

export function RemoveButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove ${name}? They will no longer be able to sign in.`)) {
          return;
        }
        start(() => removeUserAction(userId));
      }}
      className="cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
