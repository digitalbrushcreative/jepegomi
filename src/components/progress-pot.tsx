/**
 * The kitchen's progress, drawn as a cooking pot filling up.
 *
 * This was buried on the Kitchen page. It is the most characterful thing the
 * site owns — a progress bar says 75%, but a pot filling with food says what
 * the 75% is *for* — so it now leads the homepage too.
 *
 * Deliberately built with no <defs>: a clipPath or a gradient needs an id, and
 * two pots on one page sharing an id would clip against each other. The fill is
 * a plain polygon that follows the pot's walls instead, which needs no id and
 * so can never collide.
 */

const TOP = 28;
const BOTTOM = 88;
const OUTLINE =
  "M14 28 Q11 31 11 39 L15 80 Q15 88 24 88 L64 88 Q73 88 73 80 L77 39 Q77 31 74 28 Z";

/**
 * The x of the pot's left wall at a given height. The pot flares out at the rim
 * and tapers back in toward the base, so it is two straight runs rather than
 * one. The right wall is its mirror: the pot is symmetrical about x = 44.
 */
function leftWallAt(y: number) {
  if (y <= 39) return 14 + ((y - TOP) / (39 - TOP)) * (11 - 14);
  return 11 + ((y - 39) / (80 - 39)) * (15 - 11);
}

export function ProgressPot({
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
}) {
  const safe = Math.min(100, Math.max(0, percent));
  const fillY = TOP + (BOTTOM - TOP) * (1 - safe / 100);
  const left = leftWallAt(fillY);
  const right = 88 - left;

  const fill = `M ${left} ${fillY} H ${right} L 73 80 Q 73 88 64 88 L 24 88 Q 15 88 15 80 Z`;

  return (
    <svg
      viewBox="0 0 88 96"
      role="img"
      aria-label={`Kitchen ${safe}% complete`}
      className={className}
    >
      {/* Steam. Three strokes, none of them the same, because real steam isn't. */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      >
        <path d="M34 20 Q36 13 34 6" />
        <path d="M44 18 Q46 10 44 2" />
        <path d="M54 20 Q56 13 54 6" />
      </g>

      {/* What's been built so far. */}
      <path d={fill} className="fill-green" opacity="0.85" />
      {/* The surface of it, so the fill reads as something poured in. */}
      <path
        d={`M ${left} ${fillY} H ${right}`}
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
        fill="none"
      />

      {/* The pot itself. */}
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d={OUTLINE} />
        <rect x="9" y="24" width="70" height="8" rx="4" />
        <path d="M9 32 Q2 32 2 24 Q2 16 9 16" />
        <path d="M79 32 Q86 32 86 24 Q86 16 79 16" />
      </g>
    </svg>
  );
}
