"use client";

import { useActionState } from "react";
import { type PartnerLoginState, partnerSignInAction } from "../actions";

const inputClass =
  "mt-2 w-full rounded-md border border-black/15 bg-white px-4 py-3 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/20";

export function PartnerPasswordForm() {
  const [state, formAction, pending] = useActionState<PartnerLoginState, FormData>(
    partnerSignInAction,
    undefined,
  );

  return (
    <form action={formAction}>
      <label className="block">
        <span className="eyebrow text-smoke">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </label>

      <label className="mt-5 block">
        <span className="eyebrow text-smoke">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      {state?.error && (
        <p role="alert" className="mt-4 text-sm leading-relaxed text-plum">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-7 w-full cursor-pointer rounded-full bg-green px-7 py-3.5 text-[0.95rem] font-bold text-white shadow-warm transition-all hover:-translate-y-0.5 hover:bg-green-light disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
