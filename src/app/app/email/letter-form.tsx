"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Audience } from "@/lib/letters";
import {
  type Draft,
  type Preview,
  type SendState,
  previewLetterAction,
  sendLetterAction,
  sendTestAction,
} from "./actions";

/**
 * Writing one.
 *
 * The shape of the screen is the argument: the fields on the left, the actual
 * email on the right, redrawn by the server as you type. Nobody can hold in
 * their head what a heading, an eyebrow and four paragraphs look like inside a
 * plum masthead, and the alternative — send it and see — is a letter to every
 * partner the ministry has.
 *
 * The preview is rendered by the same function that builds the message, on the
 * server, and dropped into an iframe. Not a React approximation of the
 * template: the whole value of a preview is that it cannot drift from the thing
 * it is previewing.
 */

const field =
  "mt-2 w-full rounded border border-black/15 bg-white px-4 py-2.5 outline-none focus:border-plum focus:ring-2 focus:ring-plum/20";
const label = "block";
const labelText = "eyebrow text-smoke";

const quietButton =
  "cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum disabled:opacity-60";

const empty: Draft = {
  audienceId: "partners",
  addresses: "",
  subject: "",
  eyebrow: "From the ministry",
  heading: "",
  body: "",
  buttonLabel: "",
  buttonUrl: "",
  signedBy: "",
  greet: true,
};

export function LetterForm({
  audiences,
  defaultSignedBy,
  mailConfigured,
  cap,
}: {
  audiences: Audience[];
  defaultSignedBy: string;
  mailConfigured: boolean;
  /** The most one send is allowed to reach — passed in rather than imported,
      so the server-only module it lives in stays out of the browser bundle. */
  cap: number;
}) {
  const [draft, setDraft] = useState<Draft>({
    ...empty,
    signedBy: defaultSignedBy,
  });
  const [preview, setPreview] = useState<Preview>({});
  const [state, setState] = useState<SendState>(undefined);
  const [sending, startSending] = useTransition();
  const [testing, startTesting] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    /*
      Any edit invalidates the last outcome. Leaving "on its way to 14 people"
      on screen while somebody types the next letter is how one gets sent twice.
    */
    setState(undefined);
  };

  /*
    The preview follows the typing rather than a button, because a button is
    something people stop pressing. It is debounced hard — 700ms after the last
    keystroke — so a paragraph is one render on the server, not forty.

    `latest` is what stops an early, slow response painting over a later one:
    each run stamps its own number and only the newest is allowed to land.
  */
  const latest = useRef(0);

  useEffect(() => {
    const run = ++latest.current;

    const timer = setTimeout(async () => {
      const result = await previewLetterAction(draft);
      if (latest.current === run) setPreview(result);
    }, 700);

    return () => clearTimeout(timer);
  }, [draft]);

  const chosen = audiences.find((one) => one.id === draft.audienceId);
  const count = preview.count ?? 0;
  const ready = !preview.error && count > 0 && Boolean(preview.html);

  const sendIt = () => {
    const who = chosen?.label.toLowerCase() ?? "the list";
    if (
      !confirm(
        `Send "${draft.subject}" to ${count} ${count === 1 ? "person" : "people"} — ${who}?\n\nThis cannot be taken back.`,
      )
    ) {
      return;
    }

    startSending(async () => {
      setState(await sendLetterAction(draft));
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-6">
        {/* ------------------------------------------------------ who */}
        <section className="rounded-lg border border-black/8 bg-white p-5">
          <label className={label}>
            <span className={labelText}>Who it goes to</span>
            <select
              value={draft.audienceId}
              onChange={(event) => set("audienceId", event.target.value)}
              className={field}
            >
              {audiences.map((one) => (
                <option key={one.id} value={one.id}>
                  {one.label}
                </option>
              ))}
            </select>
          </label>

          {chosen && <p className="mt-2 text-sm text-smoke">{chosen.description}</p>}

          {draft.audienceId === "custom" && (
            <label className={`${label} mt-4`}>
              <span className={labelText}>The addresses</span>
              <textarea
                value={draft.addresses}
                onChange={(event) => set("addresses", event.target.value)}
                rows={4}
                placeholder={"ruth@example.com\nPastor Njoroge <njoroge@example.com>"}
                className={`${field} font-mono text-sm`}
              />
            </label>
          )}

          <Recipients preview={preview} cap={cap} />
        </section>

        {/* --------------------------------------------------- the letter */}
        <section className="space-y-5 rounded-lg border border-black/8 bg-white p-5">
          <label className={label}>
            <span className={labelText}>Subject</span>
            <input
              value={draft.subject}
              onChange={(event) => set("subject", event.target.value)}
              placeholder="The kitchen has a roof on it"
              className={field}
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className={label}>
              <span className={labelText}>Eyebrow</span>
              <input
                value={draft.eyebrow}
                onChange={(event) => set("eyebrow", event.target.value)}
                placeholder="From the ministry"
                className={field}
              />
              <span className="mt-1.5 block text-xs text-smoke">
                The small line above the heading. Leave it blank for none.
              </span>
            </label>

            <label className={label}>
              <span className={labelText}>Signed by</span>
              <input
                value={draft.signedBy}
                onChange={(event) => set("signedBy", event.target.value)}
                placeholder={defaultSignedBy}
                className={field}
              />
              <span className="mt-1.5 block text-xs text-smoke">
                Whose name it ends with.
              </span>
            </label>
          </div>

          <label className={label}>
            <span className={labelText}>Heading</span>
            <input
              value={draft.heading}
              onChange={(event) => set("heading", event.target.value)}
              placeholder="The kitchen has a roof on it"
              className={field}
            />
          </label>

          <label className={label}>
            <span className={labelText}>The letter</span>
            <textarea
              value={draft.body}
              onChange={(event) => set("body", event.target.value)}
              rows={12}
              placeholder={
                "Write it as you would say it. A blank line starts a new paragraph.\n\nNothing else is interpreted — no headings, no bold — so a link typed in here arrives as the words you typed. Use the button below for anywhere you want people to go."
              }
              className={`${field} leading-relaxed`}
            />
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={draft.greet}
              onChange={(event) => set("greet", event.target.checked)}
              className="mt-1 h-4 w-4 accent-plum"
            />
            <span className="text-sm">
              Open with <span className="font-medium">Dear …</span>, and their own
              name
              <span className="block text-xs text-smoke">
                Each person gets their own copy, so the name is theirs. Turn it off
                for anything that reads oddly with a greeting.
              </span>
            </span>
          </label>
        </section>

        {/* ------------------------------------------------------ button */}
        <section className="rounded-lg border border-black/8 bg-white p-5">
          <p className="font-display text-base font-bold">A button (optional)</p>
          <p className="mt-1 text-sm text-smoke">
            One place to send people. Both boxes or neither.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className={label}>
              <span className={labelText}>What it says</span>
              <input
                value={draft.buttonLabel}
                onChange={(event) => set("buttonLabel", event.target.value)}
                placeholder="See the photographs"
                className={field}
              />
            </label>

            <label className={label}>
              <span className={labelText}>Where it goes</span>
              <input
                value={draft.buttonUrl}
                onChange={(event) => set("buttonUrl", event.target.value)}
                placeholder="https://www.jepegomi.org/projects/kitchen"
                className={`${field} font-mono text-sm`}
              />
            </label>
          </div>
        </section>

        {/* ------------------------------------------------------- send */}
        <section className="rounded-lg border border-black/8 bg-white p-5">
          {!mailConfigured && (
            <p className="mb-4 rounded border border-clay/30 bg-clay/8 px-4 py-3 text-sm leading-relaxed text-charcoal">
              No mail provider is set up on this deployment, so nothing can
              actually leave. What you send is written down and printed to the
              server log instead — which is how this screen is worked on without
              mailing anybody.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!ready || sending}
              onClick={sendIt}
              className="cursor-pointer rounded bg-plum px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-plum-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending
                ? "Sending…"
                : `Send to ${count} ${count === 1 ? "person" : "people"}`}
            </button>

            <button
              type="button"
              disabled={!preview.html || testing}
              onClick={() =>
                startTesting(async () => {
                  setState(await sendTestAction(draft));
                })
              }
              className={quietButton}
            >
              {testing ? "Sending…" : "Send one to me first"}
            </button>
          </div>

          {state?.error && (
            <p role="alert" className="mt-4 text-sm text-plum">
              {state.error}
            </p>
          )}
          {state?.sent && (
            <p role="status" className="mt-4 text-sm text-green">
              {state.sent}
            </p>
          )}
        </section>
      </div>

      {/* --------------------------------------------------------- preview */}
      <div className="lg:sticky lg:top-24">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold">As it will arrive</h2>
          <p className="text-xs text-smoke">
            {preview.html ? "The real template" : "Waiting for words"}
          </p>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-black/8 bg-cream">
          {/*
            The unfinished-letter message sits here rather than by the fields,
            because it is not an error anybody has made yet — it is the answer
            to "why is there nothing in the preview".
          */}
          {preview.error ? (
            <p className="px-5 py-16 text-center text-sm text-smoke">
              {preview.error}
            </p>
          ) : preview.html ? (
            /*
              Sandboxed with no allowances at all: no scripts, no forms, no
              navigation out of it. The document inside is ours, but it is built
              from text somebody typed into a box, and a preview pane is not a
              place to find out that the escaping had a hole in it.
            */
            <iframe
              title="Preview of the email"
              srcDoc={preview.html}
              sandbox=""
              className="h-[70vh] w-full border-0 bg-cream"
            />
          ) : (
            <p className="px-5 py-16 text-center text-sm text-smoke">
              Start writing and it appears here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** How many, and enough of the addresses to know the count is the right list. */
function Recipients({ preview, cap }: { preview: Preview; cap: number }) {
  if (preview.count === undefined) return null;

  if (preview.count === 0) {
    return (
      <p className="mt-4 rounded bg-sand px-4 py-3 text-sm text-smoke">
        Nobody on that list yet.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded bg-sand px-4 py-3 text-sm">
      <p className="font-medium">
        {preview.count} {preview.count === 1 ? "person" : "people"}
      </p>
      <p className="mt-1 text-smoke">
        {preview.sample?.join(", ")}
        {preview.count > (preview.sample?.length ?? 0) &&
          ` and ${preview.count - (preview.sample?.length ?? 0)} more`}
      </p>
      {preview.capped && (
        <p className="mt-2 text-clay">
          Longer than one send is allowed to be — only the first {cap} will be
          written to.
        </p>
      )}
    </div>
  );
}
