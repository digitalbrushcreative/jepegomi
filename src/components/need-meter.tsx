import type { ReactNode } from "react";
import { Money } from "@/components/money";
import type { Ledger } from "@/lib/giving";

/**
 * A need's ledger, drawn.
 *
 * Two segments, not one. Money that has arrived and money that has been
 * promised are genuinely different things and a single bar makes them look
 * identical — which flatters the appeal and misleads the reader, in that order.
 * Solid green is in the bank. Pale green is somebody's word. The empty track is
 * the part still waiting for somebody, and it is the only figure on this whole
 * component that a visitor can actually act on, so it is the one written
 * largest.
 *
 * Deliberately no donor count and no donor names anywhere in here. Whether the
 * $400 came from one church or from eight is not the reader's business and,
 * more to the point, is not their decision to be swayed by.
 *
 * ## The bar stays; the figures do not
 *
 * Every amount in here goes through `Money`, which shows it to somebody signed
 * in and a blur to everybody else (see components/money.tsx). The drawing does
 * not: the segments, the percentage and the word "claimed" are all still there
 * for a signed-out reader, because a proportion is not a price. You can see that
 * a water tank is most of the way paid for without learning what a water tank
 * costs this ministry, and the first of those is the part that makes somebody
 * want to finish it.
 *
 * That split is also why the bar's `aria-label` had to be rewritten. It used to
 * recite all four figures, which would have handed the entire ledger to anybody
 * reading the page source — a redaction with the answer key stapled to it. It
 * describes the shape now, in the same terms the sighted version is drawn in.
 */

type Tone = "light" | "dark";

const tones: Record<
  Tone,
  { track: string; label: string; figure: string; muted: string; emphasis: string }
> = {
  light: {
    track: "bg-sand-deep",
    label: "text-smoke",
    figure: "text-charcoal",
    muted: "text-smoke",
    // Marigold at brand value is 2.0:1 on a white card — the open figure is
    // the one number here worth acting on, so it cannot be the unreadable one.
    emphasis: "text-marigold-ink",
  },
  dark: {
    track: "bg-white/15",
    label: "text-white/50",
    figure: "text-white",
    muted: "text-white/60",
    emphasis: "text-marigold",
  },
};

export function NeedBar({
  ledger,
  tone = "light",
  className = "",
}: {
  ledger: Ledger;
  tone?: Tone;
  className?: string;
}) {
  const { percentReceived, percentClaimed } = ledger;

  return (
    <div
      className={`h-3 w-full overflow-hidden rounded-full ${tones[tone].track} ${className}`}
      role="img"
      aria-label={
        `${percentReceived}% of the cost received` +
        (percentClaimed > percentReceived
          ? `, ${percentClaimed}% claimed in all`
          : "") +
        `. ${100 - percentClaimed}% still open.`
      }
    >
      {/*
        Layered rather than sat side by side, and scaled rather than widened.
        Animating `width` relayouts the bar on every frame of the 700ms; a
        scaleX on a composited layer does not. Promised is drawn underneath at
        its full extent and received sits on top of it, which reads identically
        — claimed is always >= received — without the second segment having to
        know the width of the first.
      */}
      <div className="relative h-full">
        <div
          className="absolute inset-y-0 left-0 w-full origin-left bg-green/40 transition-transform duration-700"
          style={{ transform: `scaleX(${percentClaimed / 100})` }}
        />
        <div
          className="absolute inset-y-0 left-0 w-full origin-left bg-green transition-transform duration-700"
          style={{ transform: `scaleX(${percentReceived / 100})` }}
        />
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  /** A `Money` element, not a string — the figure may not be ours to print. */
  value: ReactNode;
  tone: Tone;
  emphasis?: boolean;
}) {
  const colours = tones[tone];
  return (
    <div>
      <dt className={`eyebrow ${colours.label}`}>{label}</dt>
      <dd
        className={`font-display tabular mt-1 text-2xl font-semibold ${
          emphasis ? colours.emphasis : colours.figure
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export function NeedMeter({
  ledger,
  closed = false,
  tone = "light",
  className = "",
}: {
  ledger: Ledger;
  /** The work is finished — the ledger becomes a record rather than an ask. */
  closed?: boolean;
  tone?: Tone;
  className?: string;
}) {
  const colours = tones[tone];
  const settled = closed || ledger.openCents === 0;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <p className={`eyebrow ${colours.label}`}>
          {settled ? "Fully claimed" : `${ledger.percentClaimed}% claimed`}
        </p>
        <p className={`tabular text-sm font-medium ${colours.muted}`}>
          of <Money cents={ledger.costCents} />
        </p>
      </div>

      <NeedBar ledger={ledger} tone={tone} className="mt-3" />

      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        <Figure
          label="Received"
          value={<Money cents={ledger.receivedCents} />}
          tone={tone}
        />
        {ledger.promisedCents > 0 && (
          <Figure
            label="Promised"
            value={<Money cents={ledger.promisedCents} />}
            tone={tone}
          />
        )}
        {!settled && (
          <Figure
            label="Still open"
            value={<Money cents={ledger.openCents} />}
            tone={tone}
            emphasis
          />
        )}
      </dl>
    </div>
  );
}
