"use client";

import { useActionState } from "react";
import { createFirstUserAction, signInAction } from "./actions";

const inputClass =
  "mt-2 w-full rounded border border-black/15 bg-white px-4 py-3 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20";

const buttonClass =
  "mt-6 w-full cursor-pointer rounded bg-green px-6 py-3 font-medium text-white transition-colors hover:bg-green-light disabled:opacity-60";

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 text-sm text-plum">
      {message}
    </p>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, undefined);

  return (
    <form action={formAction} className="mt-8">
      <label className="block">
        <span className="label-mono text-smoke">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          className={inputClass}
        />
      </label>

      <label className="mt-5 block">
        <span className="label-mono text-smoke">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      <FormError message={state?.error} />

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

/**
 * Shown only while the database has no accounts in it. Whoever opens /app first
 * claims the first account and is signed straight in; the action refuses to run
 * a second time, and everybody after that is added from the People tab.
 */
export function FirstUserForm() {
  const [state, formAction, pending] = useActionState(
    createFirstUserAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-8">
      <label className="block">
        <span className="label-mono text-smoke">Your name</span>
        <input name="name" autoFocus required className={inputClass} />
      </label>

      <label className="mt-5 block">
        <span className="label-mono text-smoke">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </label>

      <label className="mt-5 block">
        <span className="label-mono text-smoke">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className={inputClass}
        />
        <span className="mt-2 block text-sm leading-relaxed text-smoke">
          At least 10 characters. A short sentence you will remember beats a
          short jumble you will not.
        </span>
      </label>

      <FormError message={state?.error} />

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
