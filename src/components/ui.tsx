import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`eyebrow text-plum ${className}`}>{children}</p>;
}

/**
 * A section heading. One component so every page's headings agree on size and
 * weight. It used to carry a hand-drawn wavy rule beneath it; the heading now
 * stands on its own.
 */
export function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="font-display text-3xl leading-[1.15] font-normal tracking-tight text-balance sm:text-[2.6rem]">
        {children}
      </h2>
    </div>
  );
}

/**
 * A verse, set between two sections.
 *
 * Deliberately not a card. The site already has a green aside for a quoted line
 * — the academy motto on the kitchen page — and borrowing it here would make
 * scripture shout on four pages at once. This is a breath in the page instead:
 * the verse centred in the display face, and the reference in the eyebrow that
 * labels everything else. Nothing new was invented to draw it.
 *
 * Renders nothing at all when the verse is blank, so a page carries scripture
 * for exactly as long as somebody wants it to and no page has to be edited to
 * take one away.
 */
export function Verse({ text, reference }: { text: string; reference: string }) {
  if (!text.trim()) return null;

  return (
    <section className="px-6 py-16 sm:py-20">
      <figure className="shell flex flex-col items-center text-center">
        <blockquote className="font-display max-w-2xl text-xl leading-snug font-medium text-balance sm:text-2xl">
          {text}
        </blockquote>

        {/*
          gold-ink, not gold: the lighter gold is not readable as text on
          cream, which is the whole reason the ink variant exists.
        */}
        {reference.trim() && (
          <figcaption className="eyebrow mt-5 text-gold-ink">
            {reference}
          </figcaption>
        )}
      </figure>
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

/*
  Green is the giving colour and nothing else's. If every button on a page is
  green then none of them is the one that matters, so `primary` is reserved for
  the act of giving and everything else takes `secondary` or `ghost`.
*/
const variants: Record<ButtonVariant, string> = {
  primary: "bg-forest text-white hover:bg-forest-light",
  secondary: "bg-charcoal text-white hover:bg-charcoal/85",
  ghost: "border-2 border-current/25 text-current hover:border-current/60",
};

/**
 * The button as a bare class string, for the one thing `ButtonLink` cannot be:
 * an `<a>` to somewhere outside the site — a `mailto:`, in practice. Both go
 * through here so an email button can never drift from a page button.
 */
export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex items-center justify-center gap-2.5 rounded-sm px-6 py-3 text-[0.95rem] font-semibold transition-colors ${variants[variant]} ${className}`;
}

export function ButtonLink({
  href,
  variant = "primary",
  icon,
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  icon?: IconName;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={buttonClass(variant, className)}
      {...rest}
    >
      {icon && <Icon name={icon} className="h-[1.15em] w-[1.15em]" />}
      {children}
    </Link>
  );
}

/**
 * Card used by the Programs and Projects hubs. Both hubs ship with one child
 * today; adding a second is a new entry in the array that feeds this.
 */
export function HubCard({
  href,
  eyebrow,
  title,
  blurb,
  cta,
  icon,
}: {
  href: string;
  /** May carry a money figure, which is an element rather than a string. */
  eyebrow: ReactNode;
  title: string;
  blurb: string;
  cta: string;
  icon?: IconName;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-warm transition-all hover:shadow-warm-lg"
    >
      <div className="flex flex-1 flex-col p-8">
        {icon && (
          <Icon
            name={icon}
            className="mb-5 h-9 w-9 text-plum transition-transform"
          />
        )}
        <Eyebrow>{eyebrow}</Eyebrow>
        {/*
          h2, not h3. On all three hub pages these cards are the first level
          below the PageHero's h1 and nothing sits between, so an h3 left a hole
          in the outline that screen-reader navigation reads as a missing level.
        */}
        <h2 className="font-display mt-3 text-2xl font-medium">{title}</h2>
        <p className="mt-3 flex-1 leading-relaxed text-smoke">{blurb}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-plum">
          {cta}
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

/**
 * Page banner used by every page except Home, which has its own hero.
 *
 * Light stone under the white header, dark type, and nothing else — the page's
 * title should be the first thing read, not the colour of the band behind it.
 */
export function PageHero({
  eyebrow,
  title,
  intro,
  children,
}: {
  /**
   * Optional, and worth staying that way. Most pages had one purely because the
   * component demanded one, which is how /programs came to announce "PROGRAMS"
   * directly above "The ways Jepegomi serves its community day to day" — the
   * heading was already carrying it. Pass one only where it says something the
   * heading does not, such as which arm of the ministry a page belongs to.
   */
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-sand px-6">

      <div className="shell relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="max-w-3xl">
          {eyebrow && <p className="eyebrow text-plum">{eyebrow}</p>}
          <h1
            className={`font-display text-4xl leading-[1.1] font-medium text-balance text-charcoal sm:text-[3.25rem] ${
              eyebrow ? "mt-4" : ""
            }`}
          >
            {title}
          </h1>
          {intro && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-smoke">
              {intro}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

/**
 * Flags content that Simon & Joyce still need to confirm, so a placeholder can
 * never be mistaken for a real figure.
 *
 * Only ever rendered inside an `EditorOnly` — a donor should not be reading the
 * ministry's own to-do list. See components/editor-only.tsx.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="eyebrow inline-block rounded-sm border border-dashed border-clay/50 bg-clay/10 px-3 py-1 text-clay-ink">
      {children}
    </span>
  );
}
