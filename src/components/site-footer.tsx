import Link from "next/link";
import { getContent } from "@/cms/content";
import {
  AcademyLogo,
  BibleCollegeLogo,
  FoodAtSchoolLogo,
  JepegomiLogo,
} from "@/components/logos";
import { site } from "@/lib/site";

const footerLinks = [
  { href: "/needs", label: "What's needed" },
  { href: "/give", label: "How to give" },
  { href: "/contact", label: "Contact" },
  { href: "/partners", label: "Partner sign in" },
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
          The giving pages, which the top nav has no room for — it is already at
          seven items plus the Give button. The partner door belongs down here
          anyway: it is for the handful of churches who have been given a login,
          and putting it in the main nav would advertise a room almost every
          visitor cannot open.
        */}
        <nav
          aria-label="Giving"
          className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-8 text-sm"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-white/60 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
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
