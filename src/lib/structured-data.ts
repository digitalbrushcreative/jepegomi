import { shareImage } from "./seo";
import { site } from "./site";

/**
 * The ministry, described so a machine can file it.
 *
 * This is the one thing on the site aimed squarely at something that is not a
 * person: Google's knowledge panel, a map listing, an assistant asked "is there
 * a church school in Kahawa Sukari". The pages say all of it in prose already —
 * this says it again in the vocabulary those readers parse, which is the only
 * way a ministry this size gets filed as a real place rather than a text blob.
 *
 * `Church` rather than `Organization` or `NGO`, because that is what it is and
 * the narrower type carries the address and opening-hours vocabulary a map
 * wants. The academy and the college hang off it as `subOrganization` — they
 * are two arms of one ministry, which is the same thing /education says in
 * words, and it means a search for either lands on a page that belongs to
 * something rather than on an orphan.
 *
 * Every field here is either a constant from lib/site.ts or something typed
 * into the CMS. Nothing is inferred, and anything blank is left out rather than
 * filled in — see the address note below. That is the same rule the pages
 * follow, and it matters more here, not less: prose that hedges reads as
 * honest, but a structured field is read as a fact and repeated without it.
 */
export function ministryLd({
  longName,
  email,
  streetAddress,
  sameAs,
}: {
  longName: string;
  email: string;
  /**
   * The church's street address, from the CMS, where one has been confirmed.
   * It is blank by default and stays out of the payload while it is — a guessed
   * street here does not just look wrong on a page, it feeds a map pin that
   * sends somebody to a stranger's gate.
   */
  streetAddress?: string;
  /** The ministry's own channels. Blanks are dropped by the caller's filter. */
  sameAs?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Church",
    "@id": `${site.url}#ministry`,
    name: site.name,
    alternateName: longName,
    description: site.tagline,
    url: site.url,
    logo: `${site.url}/logos/jepegomi.svg`,
    image: `${site.url}${shareImage.url}`,
    email,
    address: {
      "@type": "PostalAddress",
      ...(streetAddress ? { streetAddress } : {}),
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    ...(sameAs && sameAs.length > 0 ? { sameAs } : {}),
    /*
      The names are the marks' own — the four logos in the footer — rather than
      anything out of the CMS, because the CMS holds each page's *heading*, and
      a heading is a sentence: the college's is "The church at the centre of it"
      sort of writing, not "Contextual Bible Training College". A name field
      wants the name.

      No `founder`. `site.leaders` is "Pastor Simon & Joyce Nderitu" — one
      string describing two people with one surname and a title on the front,
      and every way of splitting it into two Person records is a guess that
      breaks the first time somebody edits the wording. The About page says who
      they are in prose, which is where a reader looks anyway.
    */
    subOrganization: [
      {
        "@type": "School",
        "@id": `${site.url}/academy#academy`,
        name: "Jepegomi Academy",
        url: `${site.url}/academy`,
        description:
          "A primary school in Kahawa Sukari, Nairobi, run by the ministry — kindergarten to Grade 6, with a hot meal every school day.",
      },
      {
        "@type": "CollegeOrUniversity",
        "@id": `${site.url}/college#college`,
        name: "Contextual Bible Training College",
        url: `${site.url}/college`,
        description:
          "The ministry's training arm, teaching Bible and ministry to adults in Nairobi.",
      },
    ],
  };
}

/**
 * The trail above a page, for the line of crumbs a search result prints instead
 * of a bare URL.
 *
 * Worth having only where a page genuinely sits under another — the costed
 * needs, and the pages beneath /programs and /projects. A one-item breadcrumb
 * on a top-level page tells a reader nothing they did not get from the address,
 * so those do not get one.
 */
export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${site.url}${step.path === "/" ? "" : step.path}`,
    })),
  };
}
