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
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = () => {
    setError(undefined);
    start(async () => {
      const result = await signInAction({ email, password });
      if (result?.error) {
        setError(result.error);
        return;
      }
      goToApp();
    });
  };

  return (
    <form
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
  const [fields, setFields] = useState({ name: "", email: "", password: "" });

  const set = (key: keyof typeof fields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="mt-8"
      onSubmit={(event) => {
        event.preventDefault();
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
          value={fields.name}
          onChange={(event) => set("name", event.target.value)}
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
          value={fields.email}
          onChange={(event) => set("email", event.target.value)}
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
          value={fields.password}
          onChange={(event) => set("password", event.target.value)}
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
