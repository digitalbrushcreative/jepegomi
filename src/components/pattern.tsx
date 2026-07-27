/**
 * The soft edges the page is cut with.
 *
 * These are what keep the site from being a stack of hard-ruled colour bands,
 * which is what made it read as generated in the first place.
 */

/**
 * A soft cloth edge between two sections, in place of the ruler-straight line
 * where one colour band stops and the next starts.
 *
 * Sits at the top of a section and hangs upward over the section before it, so
 * it must be given the *same* colour as the section it belongs to:
 *
 *   <section className="relative bg-sand"><ClothEdge className="text-sand" /> …
 */
export function ClothEdge({
  className = "",
  anchor = "above",
}: {
  className?: string;
  /**
   * `above` — the default — hangs the edge over the section *before* this one,
   * so this section appears to reach up into it. `inside-bottom` paints it at
   * the foot of this section instead, which is how a section hands its base
   * over to whatever colour follows (the plum hero to the cream page below).
   */
  anchor?: "above" | "inside-bottom";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 48"
      preserveAspectRatio="none"
      fill="currentColor"
      className={`pointer-events-none absolute inset-x-0 h-8 w-full sm:h-12 ${
        anchor === "above" ? "bottom-full" : "bottom-0"
      } ${className}`}
    >
      {/*
        Deliberately not a symmetrical sine wave. The crests sit at uneven
        heights and uneven spacings, because a perfect wave reads as a CSS shape
        and a slightly irregular one reads as a torn edge of cloth.
      */}
      <path d="M0 48V26c120-14 224 6 336 12s196-10 300-20 214-6 316 6 190 8 288-4 132-16 200-20v48Z" />
    </svg>
  );
}

/**
 * The hand-drawn underline that sits beneath a section heading. Two strokes,
 * neither of them straight and neither of them the same, the way a line drawn
 * twice with a marker never lands in the same place.
 */
export function WavyRule({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 12"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={`h-3 w-[120px] ${className}`}
    >
      <path d="M2 5c14-4 26 4 40 0s26-5 38-1 24 5 38 1" strokeWidth="2.5" />
      <path
        d="M8 10c12-2 22 2 34 0s24-3 34-1"
        strokeWidth="1.5"
        opacity="0.45"
      />
    </svg>
  );
}
