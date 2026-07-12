import Link from "next/link";
import { getContent } from "@/cms/content";
import {
  AcademyLogo,
  BibleCollegeLogo,
  FoodAtSchoolLogo,
  JepegomiLogo,
} from "@/components/logos";
import { site } from "@/lib/site";

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
    <footer className="bg-plum">
      <div className="mx-auto max-w-6xl px-6 py-12">
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
            className="rounded bg-green px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-green-light"
          >
            Give
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap justify-between gap-6 border-t border-white/15 pt-8 text-sm text-white/50">
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
