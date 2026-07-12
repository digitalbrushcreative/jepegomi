import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

const logos = [
  { src: "/logos/jepegomi.png", alt: "Jepegomi — Jesus People Gospel Ministries", w: 630, h: 215 },
  { src: "/logos/jepegomi-academy.png", alt: "Jepegomi Academy", w: 225, h: 211 },
  { src: "/logos/food-at-school.png", alt: "Food at School", w: 287, h: 163 },
];

export function SiteFooter() {
  return (
    <footer className="bg-plum">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="flex flex-wrap items-center gap-6">
            {logos.map((logo) => (
              <Image
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                width={logo.w}
                height={logo.h}
                className="h-10 w-auto opacity-85 brightness-0 invert"
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
            {site.longName}
            <br />
            {site.location}
          </p>
          <p className="leading-relaxed">
            <a href={`mailto:${site.email}`} className="transition-colors hover:text-white">
              {site.email}
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
