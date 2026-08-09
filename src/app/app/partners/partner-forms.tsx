"use client";

import { useState, useTransition } from "react";
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
 * read out of the reconciliation in the ledger.
 */
export function SeedEncounterForm() {
  /*
    A full page load on success, rather than a redirect or a revalidate.
    Deliberate, and the only thing that works here.

    Succeeding removes this panel — it is rendered only while Encounter Church
    is absent, which is right for a button with one job. But every in-React way
    of refreshing the page afterwards re-renders it *without this component*,
    and a transition cannot commit a tree that deletes the thing waiting on it.
    The rows land, the button stays on "Adding…", and the obvious next move is
    to press it again — which is the one thing a seed button must never invite.
    Probes put the server side of it at 17ms; the screen never moved.

    So: hand the browser the URL and let it fetch the page from scratch. It is
    a one-off administrative action, the reload is imperceptible, and their card
    with $8,000 against it is the confirmation.
  */
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-6 border-t border-black/8 pt-6">
      <label className="block max-w-sm">
        <span className="eyebrow text-smoke">Encounter Church&apos;s email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          placeholder="office@encounterchurch.org"
        />
        <span className="mt-2 block text-xs text-smoke">
          The address they would sign in with. Nothing is sent to it now.
        </span>
      </label>

      {/*
        Only an error lands here. Success redirects, and this whole panel is
        gone by the time the page comes back — replaced by their card.
      */}
      {error && (
        <p role="alert" className="mt-4 text-sm text-plum">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const result = await seedEncounterChurchAction(email);
            if (result?.error) {
              setError(result.error);
              return;
            }
            // Not router.refresh() — see above. `pending` stays true through
            // the navigation, so the button reads "Adding…" until the new page
            // arrives, which is exactly what it should say.
            window.location.assign("/app/partners");
          });
        }}
        className={`${primaryButton} mt-5`}
      >
        {pending ? "Adding…" : "Add Encounter Church and their giving"}
      </button>
    </div>
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
  /*
    A transition and a page load, like the seed button beside it. Adding a
    partner puts a new card in the list this form sits in, and refreshing that
    list from inside the form is the arrangement that leaves the button on
    "Adding…" with the row already written.
  */
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    name: "",
    email: "",
    kind: "church",
    location: "",
    contactName: "",
    note: "",
    verified: true,
  });

  const set = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) =>
    setFields((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-smoke">Their name</span>
          <input
            name="name"
            required
            value={fields.name}
            onChange={(event) => set("name", event.target.value)}
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
            value={fields.email}
            onChange={(event) => set("email", event.target.value)}
            className={inputClass}
            placeholder="office@example.org"
          />
          <span className="mt-2 block text-xs text-smoke">
            The address they would sign in with, if they ever want a login.
          </span>
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Kind</span>
          <select
            name="kind"
            value={fields.kind}
            onChange={(event) => set("kind", event.target.value)}
            className={inputClass}
          >
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
            value={fields.location}
            onChange={(event) => set("location", event.target.value)}
            className={inputClass}
            placeholder="United States"
          />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Who to write to</span>
          <input
            name="contactName"
            value={fields.contactName}
            onChange={(event) => set("contactName", event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="eyebrow text-smoke">Your note</span>
        <textarea
          name="note"
          rows={2}
          value={fields.note}
          onChange={(event) => set("note", event.target.value)}
          className={inputClass}
        />
        <span className="mt-2 block text-xs text-smoke">
          For you only. Never shown to them or to anybody else.
        </span>
      </label>

      <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-smoke">
        <input
          type="checkbox"
          checked={fields.verified}
          onChange={(event) => set("verified", event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-green"
        />
        <span>
          I know who this is — mark them verified. For a church or an
          organisation this also opens the project accounts to them, so untick it
          if their details came to you second-hand.
        </span>
      </label>

      {/*
        Only an error lands back here. On success the page reloads and their
        card is on it, which says more than a sentence would.
      */}
      {error && (
        <p role="alert" className="mt-4 text-sm text-plum">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={pending || !fields.name.trim() || !fields.email.trim()}
        onClick={() => {
          setError(null);
          start(async () => {
            const result = await addPartnerAction(fields);
            if (result?.error) {
              setError(result.error);
              return;
            }
            window.location.assign("/app/partners");
          });
        }}
        className={`${primaryButton} mt-5`}
      >
        {pending ? "Adding…" : "Add this partner"}
      </button>
    </div>
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
  /*
    A transition, like everything else on this page. Recording a gift changes
    the figures on the partner's own card, and refreshing the page from inside
    a form standing on it is what leaves the button reading "Recording…" over a
    gift that is already in the ledger.
  */
  const [pending, start] = useTransition();
  const [state, setState] = useState<
    { error?: string; saved?: boolean; message?: string } | undefined
  >(undefined);
  const [towards, setTowards] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("received");
  const [designation, setDesignation] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-smoke">How much, in dollars</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="850"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={`${inputClass} tabular`}
          />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Has it arrived?</span>
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          >
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
            value={designation}
            onChange={(event) => setDesignation(event.target.value)}
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
        <textarea
          name="message"
          rows={2}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={inputClass}
        />
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

      <button
        type="button"
        disabled={pending || !amount.trim() || !towards}
        onClick={() => {
          setState(undefined);
          start(async () => {
            const result = await recordGiftAction({
              partnerId: partner.id,
              amount,
              towards,
              designation,
              status,
              message,
            });
            setState(result);
            /*
              Clear the amount on success so the same gift cannot be recorded
              twice by a second click on a form that still looks filled in.
            */
            if (result?.saved) setAmount("");
          });
        }}
        className={`${primaryButton} mt-5`}
      >
        {pending ? "Recording…" : "Record this gift"}
      </button>
    </div>
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
            `Un-verify ${name}? The project accounts close to them immediately, and any password they were given is cleared. They can still sign in with a code and see their own giving.`,
          )
        ) {
          return;
        }
        start(async () => {
          await setVerifiedAction(partnerId, !verified);
          // Reloaded rather than revalidated — see the note in actions.ts.
          window.location.assign("/app/partners");
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
        start(async () => {
          await revokeLoginAction(partnerId);
          // This button is one of the things the reload removes.
          window.location.assign("/app/partners");
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
  const [pending, start] = useTransition();
  const [password, setPassword] = useState("");
  const [notify, setNotify] = useState(true);
  const [state, setState] = useState<
    { error?: string; saved?: boolean; message?: string } | undefined
  >(undefined);

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
    <div>
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
          checked={notify}
          onChange={(event) => setNotify(event.target.checked)}
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
          type="button"
          disabled={pending || password.length < 10}
          onClick={() => {
            setState(undefined);
            start(async () => {
              setState(
                await issueLoginAction({
                  partnerId: partner.id,
                  password,
                  notify,
                }),
              );
            });
          }}
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
    </div>
  );
}

/**
 * Their details.
 *
 * A transition rather than a form action, like everything else on this page —
 * saving re-renders the card these fields live in, and doing that from inside a
 * `useActionState` form is what leaves the button reading "Saving…" over work
 * that is already in the database.
 */
export function PartnerDetailsForm({ partner }: { partner: PartnerWithTotals }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<
    { error?: string; saved?: boolean } | undefined
  >(undefined);
  const [fields, setFields] = useState({
    name: partner.name,
    kind: partner.kind,
    location: partner.location,
    contactName: partner.contactName,
    note: partner.note,
  });

  const set = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) =>
    setFields((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow text-smoke">Name</span>
          <input
            name="name"
            required
            value={fields.name}
            onChange={(event) => set("name", event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Kind</span>
          <select
            name="kind"
            value={fields.kind}
            onChange={(event) => set("kind", event.target.value)}
            className={inputClass}
          >
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
            value={fields.location}
            onChange={(event) => set("location", event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="eyebrow text-smoke">Who to write to</span>
          <input
            name="contactName"
            value={fields.contactName}
            onChange={(event) => set("contactName", event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="eyebrow text-smoke">Your note</span>
        <textarea
          name="note"
          rows={2}
          value={fields.note}
          onChange={(event) => set("note", event.target.value)}
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
        type="button"
        disabled={pending || !fields.name.trim()}
        onClick={() => {
          setState(undefined);
          start(async () => {
            setState(
              await updatePartnerAction({ partnerId: partner.id, ...fields }),
            );
          });
        }}
        className={`${quietButton} mt-4`}
      >
        {pending ? "Saving…" : "Save details"}
      </button>
    </div>
  );
}
