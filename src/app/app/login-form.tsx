"use client";

import { useActionState } from "react";
import { signInAction } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, undefined);

  return (
    <form action={formAction} className="mt-8">
      <label htmlFor="passphrase" className="label-mono block text-smoke">
        Passphrase
      </label>
      <input
        id="passphrase"
        name="passphrase"
        type="password"
        autoComplete="current-password"
        autoFocus
        aria-describedby={state?.error ? "passphrase-error" : undefined}
        className="mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20"
      />

      {state?.error && (
        <p id="passphrase-error" role="alert" className="mt-3 text-sm text-plum">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full cursor-pointer rounded bg-green px-6 py-3 font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60"
      >
        {pending ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
