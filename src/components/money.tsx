import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { HiddenFigure } from "@/components/hidden-figure";
import { usd } from "@/lib/money";
import { figuresRevealed } from "@/lib/reveal";

export { HiddenFigure };

/**
 * Every figure on the public site, and the door in front of it.
 *
 * ## Why the number is not simply blurred
 *
 * Because a blur is a CSS filter and a CSS filter is a suggestion. A figure
 * printed into the HTML and then smudged with `filter: blur(4px)` is a figure
 * anybody reads by pressing Ctrl-U, or by turning one line off in the inspector,
 * or by fetching the page with curl — which is how a scraper reads it anyway,
 * and a scraper is most of who this is for. It would look exactly like a lock
 * and be no lock at all, which is worse than no lock, because everybody
 * involved would believe it was one.
 *
 * So the blur is over a placeholder and the real figure is never sent. A
 * signed-out visitor's page contains `$•,•••` and no amount of inspecting turns
 * that into a price, because the price is not in the document, the response, or
 * the cache. What the blur is doing is telling the truth about its own shape:
 * there is a number here, it is about this long, and it is not yours yet.
 *
 * ## How it is delivered
 *
 * Every gate is its own Suspense boundary, which is a strange-looking thing to
 * do thirty times on one page and is exactly what makes the page fast. The site
 * runs on Cache Components (see next.config.ts): the prerendered shell is
 * everything that does not need a request, and reading a cookie needs one. Put
 * the cookie read at the top of a page and the whole page leaves the shell —
 * every heading, every photograph and every paragraph now waiting on Postgres.
 * Put it around each figure and the shell keeps the entire page *including the
 * locked state*, so a signed-out visitor — which is nearly all of them — gets a
 * fully static page with the blur already drawn on it, and never sees a flash of
 * anything.
 *
 * A signed-in reader gets the same shell instantly and the figures a moment
 * later. `figuresRevealed` is memoised per request (see lib/reveal.ts), so
 * thirty boundaries cost one cookie read and one query between them.
 *
 * ## What is behind this, and what is not
 *
 * Prices. What a thing costs, what has arrived, what is still short, and the
 * budget lines on a project page. Not the roll of the school, not the seats on
 * the bus, not how far through the kitchen is — see lib/reveal.ts for why the
 * line is drawn at money.
 *
 * And emphatically not anything from lib/disclosure.ts. A partner's own giving
 * and a project's reconciliation sit behind a rule that is earned by money that
 * arrived; this sits behind a turnstile anybody can push. Nothing may ever be
 * moved from that gate to this one.
 */

/* --------------------------------------------------------------- the blur */

async function RevealedFigure({ cents }: { cents: number }) {
  return (await figuresRevealed()) ? usd(cents) : <HiddenFigure />;
}

/**
 * One amount of money, shown or smudged.
 *
 * A drop-in for `usd(cents)` anywhere a figure is printed into the page. It is a
 * component and not a function because the answer needs a request, and the
 * request is what the Suspense boundary is holding the door open for.
 */
export function Money({ cents }: { cents: number }) {
  return (
    <Suspense fallback={<HiddenFigure />}>
      <RevealedFigure cents={cents} />
    </Suspense>
  );
}

/**
 * The same, for a figure already written out in another currency.
 *
 * The playground is bought in Nairobi and its estimate carries both: the
 * shilling price, which is the real one, beside the dollar price, which is the
 * one a reader in Pennsylvania can act on. Gating only the dollars would be a
 * redaction with the answer printed next to it.
 *
 * Takes the formatted string rather than a number and a currency, because the
 * only other currency on this site is shillings, it is formatted in exactly one
 * place, and a currency argument would be a general mechanism built for a second
 * case that does not exist.
 */
async function RevealedText({ text }: { text: string }) {
  return (await figuresRevealed()) ? text : <HiddenFigure />;
}

export function MoneyText({ text }: { text: string }) {
  return (
    <Suspense fallback={<HiddenFigure />}>
      <RevealedText text={text} />
    </Suspense>
  );
}

/* --------------------------------------------------------- the block gate */

async function RevealedBlock({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  return (await figuresRevealed()) ? children : fallback;
}

/**
 * A whole region that only exists once somebody has signed in.
 *
 * For the things too tangled to gate one figure at a time — a meter with four
 * amounts and an aria-label that recites all of them, a budget table, an
 * estimate. Those have to be replaced rather than redacted, because a table with
 * every cell smudged is a table nobody can read and a page nobody wants.
 *
 * `children` is a server-rendered element that is simply dropped when the answer
 * is no. Its props were computed — the ledger was already in memory — but a
 * React element the server never renders is never serialised, so the figures do
 * not reach the browser by the back door of an unrendered subtree.
 */
export function Figures({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      <RevealedBlock fallback={fallback}>{children}</RevealedBlock>
    </Suspense>
  );
}

/**
 * The inverse — something shown *only* while the figures are hidden.
 *
 * One use, and it is worth the export: the invitation to sign in should not go
 * on being offered to somebody who already has. Written as its own component
 * rather than as `<Figures fallback={invitation}>{null}</Figures>` because that
 * reads backwards, and a page full of empty children is a page nobody can skim.
 */
async function HiddenOnly({ children }: { children: ReactNode }) {
  return (await figuresRevealed()) ? null : children;
}

export function WhileHidden({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <HiddenOnly>{children}</HiddenOnly>
    </Suspense>
  );
}

/* ---------------------------------------------------------------- the ask */

/**
 * The panel that stands where a set of figures would have been.
 *
 * It says what is behind it and what to do about it, and it does not apologise.
 * The bars behind the words are the shape of the thing being withheld — a meter,
 * a couple of totals — smudged out, so the reader can see they are being kept
 * from something specific rather than from a marketing page.
 */
export function LockedFigures({
  title = "Join as a partner to reveal the total cost",
  blurb = "The full breakdown — what this comes to, what has already been given towards it, and what is still short — opens as soon as you sign in.",
  className = "",
}: {
  title?: string;
  blurb?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-dashed border-smoke/25 bg-sand/60 p-7 ${className}`}
    >
      {/*
        Decoration, and nothing but: three grey bars at the proportions a meter
        would have had. `aria-hidden` because a screen reader has no use for a
        drawing of a withheld chart, and the sentence below says the same thing
        better.
      */}
      <div aria-hidden="true" className="pointer-events-none blur-[6px] select-none">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow text-smoke">••% claimed</span>
          <span className="tabular text-sm text-smoke">of $•,•••</span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-sand-deep">
          <div className="h-full w-3/5 rounded-full bg-green/50" />
        </div>
        <div className="mt-5 flex gap-10">
          <span className="font-display tabular text-2xl font-semibold text-smoke">
            $•••
          </span>
          <span className="font-display tabular text-2xl font-semibold text-smoke">
            $•,•••
          </span>
        </div>
      </div>

      <div className="relative mt-7">
        <h3 className="font-display text-xl leading-snug font-semibold text-balance">
          {title}
        </h3>
        <p className="mt-2 max-w-md leading-relaxed text-smoke">{blurb}</p>
        <Link
          href="/partners"
          className="mt-5 inline-flex rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-plum-deep"
        >
          Sign in to see the figures
        </Link>
        <p className="mt-3 text-xs leading-relaxed text-smoke">
          No password and no account — we email a code to any address you can
          read. Giving is never required.
        </p>
      </div>
    </div>
  );
}

/**
 * The same invitation at one line, for a page that only has a figure or two to
 * withhold and would look absurd carrying a whole panel to say so.
 */
export function LockedNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm leading-relaxed text-smoke ${className}`}>
      Figures are shown to partners.{" "}
      <Link
        href="/partners"
        className="font-medium text-plum underline underline-offset-4"
      >
        Sign in to reveal the total cost and the breakdown
      </Link>{" "}
      — we email a code, and giving is never required.
    </p>
  );
}
