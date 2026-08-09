import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { ClothEdge, WavyRule } from "@/components/pattern";

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
 * A section heading with its hand-drawn rule beneath it. The rule belongs to the
 * heading rather than being something each page remembers to add, so pages
 * cannot drift apart on whether headings are underlined.
 */
export function SectionTitle({
  children,
  className = "",
  ruleClassName = "text-marigold",
}: {
  children: ReactNode;
  className?: string;
  ruleClassName?: string;
}) {
  return (
    <div className={className}>
      <h2 className="font-display text-3xl leading-[1.15] font-semibold text-balance sm:text-[2.6rem]">
        {children}
      </h2>
      <WavyRule className={`mt-3 ${ruleClassName}`} />
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

/*
  Green is the giving colour and nothing else's. If every button on a page is
  green then none of them is the one that matters, so `primary` is reserved for
  the act of giving and everything else takes `secondary` or `ghost`.
*/
const variants: Record<ButtonVariant, string> = {
  primary: "bg-green text-white hover:bg-green-light shadow-warm",
  secondary: "bg-plum text-white hover:bg-plum-light shadow-warm",
  ghost: "border-2 border-current/25 text-current hover:border-current/60",
};

/**
 * The button as a bare class string, for the one thing `ButtonLink` cannot be:
 * an `<a>` to somewhere outside the site — a `mailto:`, in practice. Both go
 * through here so an email button can never drift from a page button.
 */
export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-[0.95rem] font-bold transition-all hover:-translate-y-0.5 ${variants[variant]} ${className}`;
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
  eyebrow: string;
  title: string;
  blurb: string;
  cta: string;
  icon?: IconName;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-warm transition-all hover:-translate-y-1 hover:shadow-warm-lg"
    >
      <div className="flex flex-1 flex-col p-8">
        {icon && (
          <Icon
            name={icon}
            className="mb-5 h-9 w-9 text-plum transition-transform group-hover:scale-110"
          />
        )}
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="font-display mt-3 text-2xl font-semibold">{title}</h3>
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
 * Still plum, but no longer a plum *slab*: it hands off to the page below with a
 * soft cloth edge instead of a ruled line.
 */
export function PageHero({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-plum-deep">
      <div className="grain-layer" />

      <div className="shell relative px-6 pt-28 pb-24 sm:pt-32 sm:pb-28">
        <div className="max-w-3xl">
          <p className="eyebrow text-marigold">{eyebrow}</p>
          <h1 className="font-display mt-4 text-4xl leading-[1.1] font-semibold text-balance text-white sm:text-[3.25rem]">
            {title}
          </h1>
          {intro && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              {intro}
            </p>
          )}
        </div>
        {children}
      </div>

      {/*
        The cream page below, reaching up into the plum. Every page that uses
        PageHero starts on cream, so the colour is fixed here rather than passed
        in — a prop would only be a chance to leave a seam of the wrong colour
        across the top of a page.
      */}
      <ClothEdge anchor="inside-bottom" className="text-cream" />
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
    <span className="eyebrow inline-block rounded-full border border-dashed border-clay/50 bg-clay/10 px-3 py-1 text-clay">
      {children}
    </span>
  );
}
