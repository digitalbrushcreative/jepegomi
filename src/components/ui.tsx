import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`label-mono text-plum ${className}`}>{children}</p>;
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-3xl leading-tight font-bold sm:text-4xl ${className}`}
    >
      {children}
    </h2>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-green text-white hover:bg-green-light",
  secondary: "bg-plum text-white hover:bg-plum-light",
  ghost: "border border-current/25 text-current hover:bg-current/5",
};

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded px-7 py-3.5 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      {...rest}
    >
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
}: {
  href: string;
  eyebrow: string;
  title: string;
  blurb: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded border border-black/8 bg-white p-8 transition-shadow hover:shadow-lg"
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className="font-display mt-4 text-2xl font-bold">{title}</h3>
      <p className="mt-3 flex-1 leading-relaxed text-smoke">{blurb}</p>
      <span className="mt-6 text-sm font-medium text-plum">
        {cta}{" "}
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </Link>
  );
}

/** Page banner used by every page except Home, which has its own hero. */
export function PageHero({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="bg-plum-deep px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <p className="label-mono text-white/45">{eyebrow}</p>
        <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
            {intro}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * Flags content that Simon & Joyce still need to confirm, so a placeholder can
 * never be mistaken for a real figure once this is in front of donors.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="label-mono inline-block rounded-sm border border-dashed border-smoke/40 bg-sand px-2 py-1 text-smoke">
      {children}
    </span>
  );
}
