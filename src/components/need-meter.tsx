import type { Ledger } from "@/lib/giving";
import { usd } from "@/lib/money";

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
 */

type Tone = "light" | "dark";

const tones: Record<Tone, { track: string; label: string; figure: string; muted: string }> = {
  light: {
    track: "bg-sand-deep",
    label: "text-smoke",
    figure: "text-charcoal",
    muted: "text-smoke",
  },
  dark: {
    track: "bg-white/15",
    label: "text-white/50",
    figure: "text-white",
    muted: "text-white/60",
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
  const promisedWidth = Math.max(0, percentClaimed - percentReceived);

  return (
    <div
      className={`h-3 w-full overflow-hidden rounded-full ${tones[tone].track} ${className}`}
      role="img"
      aria-label={
        `${usd(ledger.receivedCents)} received` +
        (ledger.promisedCents > 0 ? `, ${usd(ledger.promisedCents)} promised` : "") +
        `, of ${usd(ledger.costCents)}. ${usd(ledger.openCents)} still open.`
      }
    >
      <div className="flex h-full">
        <div
          className="h-full bg-green transition-[width] duration-700"
          style={{ width: `${percentReceived}%` }}
        />
        <div
          className="h-full bg-green/40 transition-[width] duration-700"
          style={{ width: `${promisedWidth}%` }}
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
  value: string;
  tone: Tone;
  emphasis?: boolean;
}) {
  const colours = tones[tone];
  return (
    <div>
      <dt className={`eyebrow ${colours.label}`}>{label}</dt>
      <dd
        className={`font-display tabular mt-1 text-2xl font-semibold ${
          emphasis ? "text-marigold" : colours.figure
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
          of {usd(ledger.costCents)}
        </p>
      </div>

      <NeedBar ledger={ledger} tone={tone} className="mt-3" />

      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        <Figure label="Received" value={usd(ledger.receivedCents)} tone={tone} />
        {ledger.promisedCents > 0 && (
          <Figure label="Promised" value={usd(ledger.promisedCents)} tone={tone} />
        )}
        {!settled && (
          <Figure
            label="Still open"
            value={usd(ledger.openCents)}
            tone={tone}
            emphasis
          />
        )}
      </dl>
    </div>
  );
}
