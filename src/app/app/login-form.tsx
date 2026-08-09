"use client";

import { useState, useTransition } from "react";
import { createFirstUserAction, signInAction } from "./actions";

/**
 * Both forms below hand the browser to /app themselves rather than letting the
 * action redirect there.
 *
 * Succeeding replaces the form with the dashboard, and a form that re-renders
 * the page out from under itself never applies the result it is waiting for:
 * the cookie is set, and the button reads "Checking…" until somebody reloads.
 * Rare, but this is the front door, and the same failure has been chased out of
 * the partner screens — see the note in app/partners/actions.ts.
 */
function goToApp() {
  window.location.assign("/app");
}

/*
  Both forms below are submitted by an `onSubmit` handler that calls
  `preventDefault`, so in the ordinary case the browser never submits them at
  all. `method="post"` is for the case that is not ordinary.

  A `<form>` with no method is a GET, and a GET submitted before this component
  has hydrated puts what is in the boxes into the address bar — which for these
  two forms means an administrator's password, in the browser history, in the
  server log, and in the Referer header of the next request out. It is a narrow
  window and not a theoretical one: it is what happens on a slow connection, on
  a first paint, and whenever the client bundle fails to arrive for any reason
  at all.

  A POST to the same address does nothing, and says nothing while doing it. That
  is the whole ambition here — not a working no-JavaScript fallback, but a
  failure that cannot spill a credential. The partner form does not need this,
  because a server action passed to `action` posts on its own.
*/

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

/*
  The boxes below are deliberately uncontrolled — no `value`, no `onChange` —
  and the values are read off the form when it is submitted.

  They were controlled, and it silently ate what people typed. A controlled
  input renders with whatever is in React state, and React state on a fresh page
  is empty; anything typed into the box *before* the client bundle arrives and
  hydrates is thrown away the moment it does, with no error and no clue. It is
  not a rare case either — the field carries `autoFocus`, so the cursor is
  already sitting in it while the page is still loading, and somebody who types
  their address straight away is exactly the person it happens to. It surfaced
  here as a test that filled the email fast and the password a moment later, and
  arrived at a form with an empty email and a full password, which is precisely
  what a person on a slow connection would have got.

  Reading from the form instead means the browser owns the text from the first
  keystroke, and nothing this component does can take it back.
*/
function valuesOf(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""),
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? ""),
  };
}

export function LoginForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | undefined>();

  return (
    <form
      method="post"
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
        const { email, password } = valuesOf(event.currentTarget);

        setError(undefined);
        start(async () => {
          const result = await signInAction({ email, password });
          if (result?.error) {
            setError(result.error);
            return;
          }
          goToApp();
        });
      }}
    >
      <label className="block">
        <span className="eyebrow text-smoke">Email</span>
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
        <span className="eyebrow text-smoke">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      <FormError message={error} />

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
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | undefined>();

  return (
    <form
      method="post"
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
        // Uncontrolled, for the reason given on `valuesOf` above.
        const fields = valuesOf(event.currentTarget);

        setError(undefined);
        start(async () => {
          const result = await createFirstUserAction(fields);
          if (result?.error) {
            setError(result.error);
            return;
          }
          goToApp();
        });
      }}
    >
      <label className="block">
        <span className="eyebrow text-smoke">Your name</span>
        <input
          name="name"
          autoFocus
          required
          className={inputClass}
        />
      </label>

      <label className="mt-5 block">
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

      <FormError message={error} />

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
