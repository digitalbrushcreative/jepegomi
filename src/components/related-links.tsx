import Link from "next/link";

export type RelatedLink = {
  href: string;
  label: string;
  blurb: string;
};

/**
 * Where to go next, said in a sentence rather than an arrow.
 *
 * Every page on this site used to end at its own closing ask, which left the
 * arms of the ministry connected in one direction only: down from the nav.
 * Somebody who arrived on /projects/kitchen from a search had no way to learn
 * that the kitchen cooks for a school, and nothing on the page said so.
 *
 * So each page ends by naming the two or three pages that genuinely follow from
 * it, and — this is the part that matters — says what is on them. "Food at
 * School" is a label; "the porridge and hot lunch this kitchen cooks, every
 * school day" is a reason to click, and it is also the only thing a crawler has
 * to go on when it weighs what the linked page is about. Anchor text of two
 * words describes nothing.
 *
 * These are written by hand per page rather than generated from the nav, and
 * they should stay that way. The nav describes the site's shape; this describes
 * a relationship between two particular pages, and that is not derivable from
 * where they sit in a tree.
 */
export function RelatedLinks({
  heading = "Read next",
  links,
  className = "",
}: {
  heading?: string;
  links: RelatedLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <section
      aria-labelledby="related"
      className={`bg-cream px-6 py-16 sm:py-20 ${className}`}
    >
      <div className="shell">
        {/*
          h2, and a real one. This is the last section of a page whose other
          sections are h2s, and a styled <p> here would leave a document outline
          that ends mid-thought — which is what a screen reader jumping by
          heading actually navigates.
        */}
        <h2
          id="related"
          className="font-display text-sm font-bold tracking-[0.14em] text-plum uppercase"
        >
          {heading}
        </h2>

        <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="group block">
                <span className="font-display text-xl font-semibold text-charcoal transition-colors group-hover:text-plum">
                  {link.label}
                  <span
                    aria-hidden="true"
                    className="ml-2 inline-block text-plum transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
                <span className="mt-2 block leading-relaxed text-smoke">
                  {link.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
