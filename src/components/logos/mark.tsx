/*
  The brand marks, split out of the master logo sheet into one component each.

  Every surface these sit on is either cream or a deep plum/charcoal, and the
  full-colour art was drawn for white paper — the "at school" lettering is dark
  brown, the college crest is navy. Both disappear on plum. So each mark renders
  two ways:

    variant="color" — the full palette, for cream/light surfaces.
    variant="mono"  — a single-colour knockout that inherits `currentColor`, so
                      `className="text-cream"` tints it. For plum and charcoal.

  Mono is a real knockout, not a brightness filter: the white details in the art
  (the crest's book and grapes) are punched back out through a mask, so they stay
  visible instead of flooding solid.
*/

export type LogoVariant = "color" | "mono";

export type LogoProps = {
  variant?: LogoVariant;
  /** Accessible name. Omit when the mark sits next to a text label already. */
  title?: string;
  className?: string;
};

export type MarkShape = {
  d: string;
  fill: string;
  evenOdd?: boolean;
  /**
   * Painted with a knockout hairline in mono. Set on shapes that overlap darker
   * ones — the plum flame sits on top of the black Africa map, and without the
   * hairline the two merge into one blob once they're the same colour.
   */
  hairline?: boolean;
};

export type Mark = {
  id: string;
  viewBox: string;
  shapes: MarkShape[];
};

/** The white detail colour in the source art — knocked back out in mono. */
const PAPER = "#fff";

/** Hairline width, in viewBox units (the marks are ~300–400 units wide). */
const HAIRLINE = 4;

export function MarkSvg({
  mark,
  variant = "color",
  title,
  className,
}: LogoProps & { mark: Mark }) {
  const a11y = title ? { role: "img" as const } : { "aria-hidden": true as const };
  const label = title ? <title>{title}</title> : null;

  if (variant === "color") {
    return (
      <svg viewBox={mark.viewBox} className={className} {...a11y}>
        {label}
        {mark.shapes.map((shape, i) => (
          <path
            key={i}
            d={shape.d}
            fill={shape.fill}
            fillRule={shape.evenOdd ? "evenodd" : undefined}
          />
        ))}
      </svg>
    );
  }

  const [x, y, width, height] = mark.viewBox.split(" ");
  const maskId = `${mark.id}-knockout`;

  return (
    <svg viewBox={mark.viewBox} className={className} {...a11y}>
      {label}
      <mask id={maskId} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}>
        {mark.shapes
          .filter((shape) => shape.fill !== PAPER)
          .map((shape, i) => (
            <path
              key={i}
              d={shape.d}
              fill="#fff"
              fillRule={shape.evenOdd ? "evenodd" : undefined}
              stroke={shape.hairline ? "#000" : undefined}
              strokeWidth={shape.hairline ? HAIRLINE : undefined}
            />
          ))}
        {mark.shapes
          .filter((shape) => shape.fill === PAPER)
          .map((shape, i) => (
            <path
              key={i}
              d={shape.d}
              fill="#000"
              fillRule={shape.evenOdd ? "evenodd" : undefined}
            />
          ))}
      </mask>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
