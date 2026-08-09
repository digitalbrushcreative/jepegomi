import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { ClothEdge } from "@/components/pattern";
import { ButtonLink } from "@/components/ui";
import { pageMeta } from "@/lib/seo";
import { RelatedLinks } from "@/components/related-links";

export async function generateMetadata(): Promise<Metadata> {
  const [about, site] = await Promise.all([
    getContent("about"),
    getContent("site"),
  ]);

  return pageMeta({
    title: about.heading,
    description: `${site.longName} — a church and academy in Nairobi led by ${site.leaders}.`,
    path: "/about",
  });
}

export default async function AboutPage() {
  const about = await getContent("about");

  return (
    <>
      {/*
        Not PageHero: this one runs the founders' cut-out off the hero's bottom
        edge, so the section can't have bottom padding. It's a waist-up portrait,
        so it bleeds rather than stands. Everything else matches PageHero's
        plum-deep treatment so the page still reads as part of the set.
      */}
      <section className="relative overflow-hidden bg-plum-deep">
        <div className="grain-layer" />

        <div className="shell relative flex flex-col items-center gap-10 px-6 pt-28 sm:flex-row sm:items-end sm:gap-12">
          <div className="flex-1 pb-20">
            <h1 className="font-display mt-4 text-4xl leading-[1.1] font-semibold text-balance text-white sm:text-[3.25rem]">
              {about.heading}
            </h1>
            {paragraphs(about.intro).map((text) => (
              <p
                key={text}
                className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65"
              >
                {text}
              </p>
            ))}
          </div>

          {about.portrait && (
            <Image
              src={about.portrait}
              alt={about.portraitAlt}
              width={800}
              height={1034}
              priority
              sizes="(max-width: 640px) 70vw, 288px"
              className="w-60 shrink-0 sm:w-72"
            />
          )}
        </div>

        {/*
          The cream page rises over the foot of the portrait, so Simon & Joyce
          stand *in* the page rather than being cropped by a ruled line across
          their knees.
        */}
        <ClothEdge anchor="inside-bottom" className="text-cream" />
      </section>

      <section className="px-6 py-24">
        <div className="shell">
          <div className="measure space-y-6 text-lg leading-relaxed text-smoke">
            {paragraphs(about.body).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          {about.facts.length > 0 && (
            <dl className="mt-16 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8 sm:grid-cols-2">
              {about.facts.map((fact) => (
                <div key={fact.label} className="bg-white p-6">
                  <dt className="eyebrow text-plum">{fact.label}</dt>
                  <dd className="mt-2 font-medium">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-12 flex flex-wrap gap-4">
            <ButtonLink href="/academy" variant="secondary">
              Jepegomi Academy
            </ButtonLink>
            <ButtonLink href="/give">Give</ButtonLink>
          </div>
        </div>
      </section>

      <RelatedLinks
        links={[
          {
            href: "/church",
            label: "The church",
            blurb:
              "The congregation in Kahawa Sukari, and the oldest thing the ministry does.",
          },
          {
            href: "/education",
            label: "Education",
            blurb:
              "The academy for children and the Bible college for adults — one teaching arm with two ends.",
          },
          {
            href: "/needs",
            label: "What's needed",
            blurb:
              "What the ministry is short of right now, costed and open to anyone who wants to take part of it.",
          },
        ]}
      />
    </>
  );
}
