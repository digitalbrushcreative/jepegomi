import Link from "next/link";
import { getContent } from "@/cms/content";
import {
  AcademyLogo,
  BibleCollegeLogo,
  FoodAtSchoolLogo,
  JepegomiLogo,
} from "@/components/logos";
import { givingLinks, navLinks, site } from "@/lib/site";

/*
  Flattened out of the nav, with the giving pages folded in — every public page
  worth finding, each with the line that says what is on it.

  Home is dropped: the logo above already goes there, and a footer that
  describes the page you are standing on is filler. The children come up to sit
  beside their parents rather than nested under them, because this is a list of
  pages and not a reproduction of the menu — /academy is a destination in its
  own right, and burying it a level down in the one place on the site that
  prints a full index is how a page ends up unreachable except by hover.
*/
const indexLinks = [
  ...navLinks.flatMap((link) => [
    ...(link.blurb ? [{ href: link.href, label: link.label, blurb: link.blurb }] : []),
    ...(link.children ?? []),
  ]),
  ...givingLinks,
];


const logos = [
  { Mark: JepegomiLogo, label: "Jepegomi — Jesus People Gospel Ministries" },
  { Mark: AcademyLogo, label: "Jepegomi Academy" },
  { Mark: BibleCollegeLogo, label: "Contextual Bible Training College" },
  { Mark: FoodAtSchoolLogo, label: "Food at School" },
];

/*
  The name, location and email come from the CMS; the domain and URL do not.
  Those are where the site lives, not something written about it — changing them
  in a text box would break every link rather than update one.
*/
export async function SiteFooter() {
  const content = await getContent("site");

  return (
    <footer className="relative overflow-hidden bg-plum-deep">
      <div className="grain-layer" />

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex flex-wrap items-center gap-6">
            {logos.map(({ Mark, label }) => (
              <Mark
                key={label}
                variant="mono"
                title={label}
                className="h-10 w-auto text-white/85"
              />
            ))}
          </div>

          <Link
            href="/give"
            className="rounded-full bg-green px-7 py-3 text-sm font-bold text-white shadow-warm transition-colors hover:bg-green-light"
          >
            Give
          </Link>
        </div>

        {/*
          The whole site, once, at the bottom of every page — including the
          giving pages the top nav has no room for, it being already at seven
          items plus the Give button.

          It carries the blurbs rather than a bare column of labels, and that is
          the point of it. A visitor who scrolled to the end of a page is
          looking for somewhere to go, and "Projects" does not tell them whether
          that means a kitchen or a building fund. It is also, on every page,
          the only complete description of what this site contains — which is
          what a search engine reads it as, and why the words are worth writing
          properly rather than filling with the label again.
        */}
        <nav
          aria-label="All pages"
          className="mt-10 grid gap-x-10 gap-y-7 border-t border-white/15 pt-9 sm:grid-cols-2 lg:grid-cols-3"
        >
          {indexLinks.map((link) => (
            <Link key={link.href} href={link.href} className="group block">
              <span className="block text-sm font-bold text-white/85 transition-colors group-hover:text-white">
                {link.label}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-white/45">
                {link.blurb}
              </span>
            </Link>
          ))}
        </nav>

        {/*
          The partner door, on its own and without a description. It is for the
          handful of churches who have been given a code, so a blurb selling it
          on every page of the site would advertise a room almost every visitor
          cannot open.
        */}
        <nav
          aria-label="Partners"
          className="mt-9 border-t border-white/15 pt-8 text-sm"
        >
          <Link
            href="/partners"
            className="font-medium text-white/60 transition-colors hover:text-white"
          >
            Partner sign in
          </Link>
        </nav>

        <div className="mt-8 flex flex-wrap justify-between gap-6 border-t border-white/15 pt-8 text-sm text-white/50">
          <p className="leading-relaxed">
            {content.longName}
            <br />
            {content.location}
          </p>
          <p className="leading-relaxed">
            <a
              href={`mailto:${content.email}`}
              className="transition-colors hover:text-white"
            >
              {content.email}
            </a>
            <br />
            <a href={site.url} className="transition-colors hover:text-white">
              {site.domain}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
