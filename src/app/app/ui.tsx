import Link from "next/link";

/**
 * The furniture every CMS screen is built from.
 *
 * Each screen used to draw its own title, its own spacing and its own idea of
 * what a panel looks like, which is how an admin area ends up feeling like a
 * dozen pages rather than one tool. These are the four pieces they share.
 */

/** The title block at the top of a screen. */
export function PageHeader({
  title,
  intro,
  actions,
}: {
  title: string;
  intro?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-black/8 pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {intro && (
          <p className="mt-2 max-w-2xl leading-relaxed text-smoke">{intro}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}

/** A titled white panel — the unit most screens are a stack of. */
export function Panel({
  title,
  hint,
  actions,
  children,
  className = "",
}: {
  title?: string;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-black/8 bg-white ${className}`}
    >
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-smoke">{hint}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * One number, with what it means under it.
 *
 * `href` is what makes these worth having: a count of things waiting is only
 * useful if it is also the way to go and deal with them.
 */
export function Stat({
  label,
  value,
  note,
  href,
  tone = "plain",
}: {
  label: string;
  value: string | number;
  note?: string;
  href?: string;
  tone?: "plain" | "waiting" | "good";
}) {
  const tones = {
    plain: "text-charcoal",
    waiting: "text-clay",
    good: "text-green",
  };

  const body = (
    <>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-smoke uppercase">
        {label}
      </p>
      <p
        className={`font-display mt-2 text-3xl font-bold tabular-nums ${tones[tone]}`}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-smoke">{note}</p>}
    </>
  );

  const className =
    "block rounded-lg border border-black/8 bg-white p-5 transition-colors";

  return href ? (
    <Link href={href} className={`${className} hover:border-plum/30 hover:bg-sand/60`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** What a list says when there is nothing in it yet. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-8 text-center text-sm leading-relaxed text-smoke">
      {children}
    </p>
  );
}
