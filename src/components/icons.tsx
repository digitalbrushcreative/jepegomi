/**
 * The icon set.
 *
 * These exist because the site used to point at things with emoji (🚰 🔲 💡 🙏),
 * which render as a different picture on every device and read as a placeholder
 * nobody got round to replacing. These are drawn on one 24px grid with one
 * stroke weight and round caps, so a row of them looks like a set rather than a
 * handful of clip art.
 *
 * They inherit `currentColor` and size, so an icon is coloured by the text
 * around it and never needs a colour prop.
 */

type IconProps = {
  className?: string;
  /** Omit for decorative icons — the label beside them already says it. */
  title?: string;
};

function Svg({
  className = "h-6 w-6",
  title,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/** A rainwater tank on its stand, with the downpipe feeding it. */
export function WaterTankIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9.5h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
      <path d="M5 12.5h12" />
      <path d="M7.5 18.5V21M14.5 18.5V21" />
      <path d="M20 4v3.5a2 2 0 0 1-2 2h-1.5" />
      <path d="M9 9.5V7a2 2 0 0 1 2-2h2" />
    </Svg>
  );
}

/** Cabro paving stones — the interlocking blocks the eating area needs. */
export function PavingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7.5h6v5H3zM9 7.5h6v5H9zM15 7.5h6v5h-6z" />
      <path d="M3 12.5h4.5v5H3zM7.5 12.5h9v5h-9zM16.5 12.5H21v5h-4.5z" />
    </Svg>
  );
}

/** Plaster and power for the dining hall. */
export function LightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 17.5a5.5 5.5 0 1 1 6 0v1.5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1.5Z" />
      <path d="M10 21.5h4" />
      <path d="M12 2v1.5M4.5 6l1 1M19.5 6l-1 1" />
    </Svg>
  );
}

/** A cooking pot over the fire — the Food at School meal. */
export function PotIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10h16l-1 7.5a2 2 0 0 1-2 1.5H7a2 2 0 0 1-2-1.5L4 10Z" />
      <path d="M3 10h18" />
      <path d="M4 12.5H2.5M20 12.5h1.5" />
      <path d="M9 6.5c0-1.5 1.5-1.5 1.5-3M14 6.5c0-1.5 1.5-1.5 1.5-3" />
    </Svg>
  );
}

/** A child. Used where the site counts the children it feeds. */
export function ChildIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="6.5" r="3" />
      <path d="M6.5 21v-4a5.5 5.5 0 0 1 11 0v4" />
      <path d="M9.5 21v-3M14.5 21v-3" />
    </Svg>
  );
}

/** An open book — the Academy and the Bible college. */
export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.5C10.5 5 8.5 4.5 4 4.5v13c4.5 0 6.5.5 8 2 1.5-1.5 3.5-2 8-2v-13c-4.5 0-6.5.5-8 2Z" />
      <path d="M12 6.5v13" />
    </Svg>
  );
}

/** The church. */
export function ChurchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2v4M10 4h4" />
      <path d="M12 6.5 5.5 11v9h13v-9L12 6.5Z" />
      <path d="M10 20v-4a2 2 0 0 1 4 0v4" />
    </Svg>
  );
}

/** Where the ministry is. */
export function PinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

/** Outreach beyond the school gate. */
export function GlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9.5h17M3.5 14.5h17" />
      <path d="M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z" />
    </Svg>
  );
}

/** Giving. Deliberately a hand holding a heart, not a bare heart. */
export function GiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 8.5c1-1.8 4-1.6 4 .8 0 1.8-2.4 3.4-4 4.7-1.6-1.3-4-2.9-4-4.7 0-2.4 3-2.6 4-.8Z" />
      <path d="M3 17.5c1.5-1 3-1 4.5 0l1.5 1h4.5c1 0 1-1.5 0-1.5h-3" />
      <path d="M14 18.5c2.5 0 4.5-1 7-3" />
    </Svg>
  );
}

/** The school van — the transport that brings children in to the academy. */
export function BusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 16.5V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8.5H4Z" />
      <path d="M4 12h16" />
      <path d="M12 6v6" />
      <circle cx="8" cy="18" r="1.5" />
      <circle cx="16" cy="18" r="1.5" />
    </Svg>
  );
}

/** The trowel — building work, and Simon doing it himself. */
export function TrowelIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3.5 20.5 10 14 16.5 7.5 10 14 3.5Z" />
      <path d="M9.5 12 4 17.5a2 2 0 0 0 2.8 2.8L12 15" />
    </Svg>
  );
}

export const ICONS = {
  water: WaterTankIcon,
  paving: PavingIcon,
  light: LightIcon,
  pot: PotIcon,
  child: ChildIcon,
  book: BookIcon,
  church: ChurchIcon,
  pin: PinIcon,
  globe: GlobeIcon,
  give: GiveIcon,
  trowel: TrowelIcon,
  bus: BusIcon,
} as const;

export type IconName = keyof typeof ICONS;

/** Looks an icon up by name, for content files that only store a string. */
export function Icon({
  name,
  ...props
}: IconProps & { name: IconName }) {
  const Component = ICONS[name];
  return <Component {...props} />;
}
