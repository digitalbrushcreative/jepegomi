import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { ButtonLink } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const [about, site] = await Promise.all([
    getContent("about"),
    getContent("site"),
  ]);

  return {
    title: about.heading,
    description: `${site.longName} — a church and academy in Nairobi led by ${site.leaders}.`,
  };
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
      <section className="relative overflow-hidden bg-plum-deep px-6 pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-[480px] w-[480px] rounded-full bg-plum/35"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 sm:flex-row sm:items-end sm:gap-12">
          <div className="flex-1 pb-20">
            <p className="label-mono text-white/45">{about.eyebrow}</p>
            <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
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
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-6 text-lg leading-relaxed text-smoke">
            {paragraphs(about.body).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          {about.facts.length > 0 && (
            <dl className="mt-16 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8 sm:grid-cols-2">
              {about.facts.map((fact) => (
                <div key={fact.label} className="bg-white p-6">
                  <dt className="label-mono text-plum">{fact.label}</dt>
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
    </>
  );
}
