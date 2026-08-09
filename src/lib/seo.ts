import type { Metadata } from "next";
import { site } from "./site";

export type ShareImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

/*
  The picture a link to this site unfurls with when somebody pastes it into a
  WhatsApp group, a Facebook post or an email to their church — which is how
  most of this site's traffic will actually arrive, not through a search box.

  Graduation day at the academy, because it is the only photograph in the set
  that is both the right shape and about people. The scrapers crop to roughly
  1.91:1 and this is 1072×602, so it survives the crop nearly whole; everything
  else wide enough is a compound, a wall or a building site. A share card that
  unfurls as a pile of stones persuades nobody to open the link.

  Pages pass their own where they have one that says more — the kitchen has a
  year of photographs, the playground has the thing being replaced.
*/
export const shareImage: ShareImage = {
  url: "/photos/academy/graduation.jpg",
  width: 1072,
  height: 602,
  alt: "Children in gowns and green uniform at Jepegomi Academy's graduation",
};

/**
 * Everything the head of a public page needs, in one call.
 *
 * This exists because of one rule in the metadata API that is easy to miss and
 * expensive to get wrong: metadata is merged **shallowly**, so a page that sets
 * `openGraph` replaces the root layout's entire `openGraph` object rather than
 * adding to it — and a page that sets none inherits the root's *whole* card,
 * site title and site tagline included.
 *
 * Every page here was in the second case. A link to /academy shared in a
 * parents' group unfurled as "Jepegomi — Jesus People Gospel Ministries" and
 * the site-wide tagline, and so did /projects/kitchen, and so did every costed
 * need. The pages each had a perfectly good `description`; none of it reached
 * the card anybody actually saw. So this emits the card in full, every time,
 * from the same title and description the page already wrote.
 *
 * The canonical is the other half. The site answers at both the apex and www,
 * with a redirect from one to the other (see the note on `url` in lib/site.ts),
 * and a crawler that finds the same page at two addresses has to guess which is
 * the real one. Paths are relative and resolve against `metadataBase`, so they
 * cannot drift from the host the rest of the code links to.
 */
export function pageMeta({
  title,
  description,
  path,
  image = shareImage,
}: {
  /**
   * The page's own title, without the site name — the root layout's template
   * adds that. Omit it only on the front page, which wants the untemplated
   * default.
   */
  title?: string;
  description: string;
  /** Absolute path, leading slash, no host: "/programs/food-at-school". */
  path: string;
  image?: ShareImage;
}): Metadata {
  /*
    Spelled out rather than left to the title template. The template applies to
    the `<title>` tag; this is the text on the share card, and it is built here
    so that what a page passes as `title` is the only thing anybody has to keep
    in step.
  */
  const heading = title
    ? `${title} · ${site.name}`
    : `${site.name} — ${site.longName}`;

  return {
    ...(title === undefined ? {} : { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      title: heading,
      description,
      url: path,
      siteName: site.name,
      locale: "en_KE",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: heading,
      description,
      images: [image.url],
    },
  };
}
