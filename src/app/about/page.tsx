import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.longName} — a church and academy in Nairobi led by ${site.leaders}.`,
};

export default function AboutPage() {
  return (
    <>
      {/*
        Not PageHero: this one stands the founders' cut-out on the hero's bottom
        edge, so the section can't have bottom padding. Everything else matches
        PageHero's plum-deep treatment so the page still reads as part of the set.
      */}
      <section className="relative overflow-hidden bg-plum-deep px-6 pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-[480px] w-[480px] rounded-full bg-plum/35"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-10 sm:flex-row sm:items-end sm:gap-12">
          <div className="flex-1 pb-20">
            <p className="label-mono text-white/45">The Ministry</p>
            <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
              The church &amp; the Nderitus
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
              {site.longName} is a church and academy in Nairobi led by{" "}
              {site.leaders}.
            </p>
          </div>

          <Image
            src="/photos/founders/simon-and-joyce.png"
            alt={`${site.leaders}, who lead ${site.longName}`}
            width={438}
            height={924}
            priority
            sizes="(max-width: 640px) 60vw, 224px"
            className="w-44 shrink-0 sm:w-56"
          />
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-6 text-lg leading-relaxed text-smoke">
            <p>
              Their work joins the spiritual and the practical: a place to
              worship, a school to learn in, and a daily meal for children who
              need one. Everything on this site flows from that mission.
            </p>
            <p>
              Alongside the church and Jepegomi Academy, the ministry runs a
              Bible school, digital outreach, and school transport for children
              in the community.
            </p>
          </div>

          <dl className="mt-16 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8 sm:grid-cols-2">
            <div className="bg-white p-6">
              <dt className="label-mono text-plum">Led by</dt>
              <dd className="mt-2 font-medium">{site.leaders}</dd>
            </div>
            <div className="bg-white p-6">
              <dt className="label-mono text-plum">Location</dt>
              <dd className="mt-2 font-medium">{site.location}</dd>
            </div>
            <div className="bg-white p-6">
              <dt className="label-mono text-plum">The Academy</dt>
              <dd className="mt-2 font-medium">
                &ldquo;Quality Education With Values&rdquo;
              </dd>
            </div>
            <div className="bg-white p-6">
              <dt className="label-mono text-plum">Feeding</dt>
              <dd className="mt-2 font-medium">
                Porridge and hot lunch, every school day
              </dd>
            </div>
          </dl>

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
