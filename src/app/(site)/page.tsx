import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Eyebrow } from "@/components/ui";
import { getChildrenFed } from "@/lib/enrolment";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * The front page's own head.
 *
 * It had none, which was nearly harmless and not quite: the title and the
 * description fell through to the root layout, which is what they should say
 * anyway — but nothing declared a canonical, and this is the one address on the
 * site people reach two ways. The apex redirects to www (see lib/site.ts), and
 * every inbound link written on paper, in an email signature or on the side of
 * the van says the bare domain.
 *
 * No `title`, deliberately. The root layout's default is "Jepegomi — Jesus
 * People Gospel Ministries", untemplated, and the front page is the one page
 * that wants exactly that rather than something with " · Jepegomi" bolted on
 * the end.
 */
export const metadata: Metadata = pageMeta({
  description: site.tagline,
  path: "/",
});

/**
 * A quiet text link with an arrow — the only kind of action this page offers.
 *
 * Not a ButtonLink. A pill button is a request, and the front page's job is to
 * introduce the ministry before it asks anybody for anything. Giving is still
 * one click away in the header on every screen.
 */
function ArrowLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 border-b border-current/30 pb-1 text-[0.95rem] font-bold transition-colors hover:border-current ${className}`}
    >
      {children}
      <span
        aria-hidden="true"
        className="transition-transform group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}

/** Prose from the CMS, one <p> per paragraph, with the spacing between them. */
function Prose({ text, className = "" }: { text: string; className?: string }) {
  return (
    <>
      {paragraphs(text).map((block, index) => (
        <p key={block} className={`${index > 0 ? "mt-4" : ""} ${className}`}>
          {block}
        </p>
      ))}
    </>
  );
}

/*
  The order of this page is the argument it makes: purpose, people, work,
  evidence, partnership. Who the ministry is comes before what it does, what it
  does comes before what it has done, and the invitation to stand with it comes
  last — after a reader has had every reason to trust it.

  What it leaves out is deliberate too. No icons, no shadows, no cloth edges, no
  rotating slides and no figure behind a blur: photographs carry the weight,
  and the type and the white space do the rest. The rest of the site keeps its
  warmer furniture; the front page is the institution's front door, and it is
  dressed for that.

  The appeals that used to fill the middle of this page — the kitchen's pot, the
  bus — are on /projects and /needs, one link away from the partnership section.
*/
export default async function HomePage() {
  const [home, childrenFed] = await Promise.all([
    getContent("home"),
    getChildrenFed(),
  ]);

  /*
    The children-fed figure leads the row, read from the academy's enrolment
    rather than typed here. If that field is blank or not a number, the figure
    drops out rather than printing a confident zero.
  */
  const figures = [
    ...(childrenFed
      ? [{ value: String(childrenFed), label: home.childrenFedLabel }]
      : []),
    ...home.figures,
  ];

  return (
    <>
      {/*
        One photograph, not five. The header is transparent over it and its
        links are white, so the top of the picture carries a dark band whatever
        is in it — the promise every hero on this site makes to the header (see
        components/site-header.tsx). The words sit at the bottom-left over a
        second, heavier shade, which is what keeps them readable on whatever
        photograph an editor chooses later.
      */}
      <section className="relative isolate flex h-[78svh] max-h-[56rem] min-h-[34rem] items-end overflow-hidden bg-charcoal px-6 text-white">
        <Image
          src={home.heroPhoto}
          alt={home.heroPhotoAlt}
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-black/60 via-black/25 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/0" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />

        <div className="shell w-full pb-14 sm:pb-20">
          <h1 className="font-display max-w-4xl text-[2.75rem] leading-[1.02] font-medium text-balance sm:text-6xl lg:text-[5.25rem]">
            {home.heroHeading}
          </h1>

          {/*
            The place line goes under the headline, not over it. A tracked
            uppercase label perched on an oversized headline is the hero every
            template ships with; a reader still wants to know where this is, and
            here it reads as a place rather than a badge.
          */}
          <p className="mt-5 text-sm font-medium tracking-wide text-white/80">
            {site.longName} · {site.location}
          </p>

          <div className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/90 sm:text-xl">
            <Prose text={home.heroBody} />
          </div>

          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-4">
            <ArrowLink href="/about">Discover our story</ArrowLink>
            <ArrowLink href="#ministries">Explore our ministries</ArrowLink>
          </div>
        </div>
      </section>

      {/* Who we are: the ministry as one thing, before it is four. */}
      <section className="px-6 py-20 sm:py-28">
        <div className="shell grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Eyebrow>{home.introLabel}</Eyebrow>
            <h2 className="font-display mt-4 text-4xl leading-[1.08] font-medium text-balance sm:text-5xl">
              {home.introHeading}
            </h2>
            <div className="mt-7 text-lg leading-relaxed text-pretty text-smoke sm:text-xl">
              <Prose text={home.introBody} />
            </div>
            <ArrowLink href="/about" className="mt-9 text-plum">
              Our story and leadership
            </ArrowLink>
          </div>

          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-sand lg:col-span-5 lg:col-start-8">
            <Image
              src={home.introPhoto}
              alt={home.introPhotoAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/*
        The four ministries, all the same size, two to a row. Photographs rather
        than icons: the argument that no arm is a footnote to another is made by
        showing the people in each.
      */}
      <section
        id="ministries"
        className="scroll-mt-20 border-t border-charcoal/10 px-6 py-20 sm:py-28"
      >
        <div className="shell">
          <h2 className="font-display max-w-2xl text-4xl leading-[1.08] font-medium text-balance sm:text-5xl">
            {home.ministriesHeading}
          </h2>

          <ul className="mt-14 grid gap-x-10 gap-y-16 md:grid-cols-2">
            {home.ministries.map((ministry) => (
              <li key={ministry.href + ministry.title}>
                <Link href={ministry.href} className="group block">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-sm bg-sand">
                    {ministry.photo && (
                      <Image
                        src={ministry.photo}
                        alt={ministry.photoAlt}
                        fill
                        sizes="(max-width: 768px) 100vw, 560px"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <Eyebrow className="mt-6">{ministry.name}</Eyebrow>
                  <h3 className="font-display mt-2 text-2xl leading-snug font-medium text-balance sm:text-[1.75rem]">
                    {ministry.title}
                  </h3>
                  <div className="mt-3 max-w-lg leading-relaxed text-smoke">
                    <Prose text={ministry.body} />
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-plum">
                    {ministry.cta}
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/*
        The evidence. Modest numbers, set large and left alone — no counters,
        no icons, nothing animated. A figure that has to be dressed up to
        impress is the wrong figure.
      */}
      <section className="bg-sand px-6 py-20 sm:py-28">
        <div className="shell">
          <Eyebrow>{home.evidenceLabel}</Eyebrow>
          <h2 className="font-display mt-4 max-w-2xl text-4xl leading-[1.08] font-medium text-balance sm:text-5xl">
            {home.evidenceHeading}
          </h2>

          <dl className="mt-14 grid gap-10 sm:grid-cols-3">
            {figures.map((figure) => (
              <div
                key={figure.label}
                className="flex flex-col-reverse justify-end border-t border-charcoal/20 pt-6"
              >
                <dt className="mt-3 max-w-[16rem] leading-snug text-smoke">
                  {figure.label}
                </dt>
                <dd className="font-display tabular text-6xl leading-none font-medium text-plum sm:text-7xl">
                  {figure.value}
                </dd>
              </div>
            ))}
          </dl>

          {home.figuresAsOf.trim() && (
            <p className="mt-8 text-sm text-smoke">
              Figures as of {home.figuresAsOf}.
            </p>
          )}

          <div className="mt-12 flex flex-col gap-6 border-t border-charcoal/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display max-w-xl text-xl leading-snug text-pretty italic">
              {home.evidenceNote}
            </p>
            <ArrowLink href="/projects" className="shrink-0 text-plum">
              See our work
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* A featured story — asymmetric, the way a magazine lays out a feature. */}
      <section className="px-6 py-20 sm:py-28">
        <div className="shell grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-sand lg:col-span-6">
            <Image
              src={home.storyPhoto}
              alt={home.storyPhotoAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover"
            />
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <Eyebrow>{home.storyLabel}</Eyebrow>
            <h2 className="font-display mt-4 text-3xl leading-[1.12] font-medium text-balance sm:text-[2.6rem]">
              {home.storyHeading}
            </h2>
            <div className="mt-6 text-lg leading-relaxed text-pretty text-smoke">
              <Prose text={home.storyBody} />
            </div>
            <ArrowLink href={home.storyHref} className="mt-9 text-plum">
              {home.storyCta}
            </ArrowLink>
          </div>
        </div>
      </section>

      {/*
        The leadership, given a section of its own and the page's one dark
        ground. Plum-deep rather than black: the portrait was taken against a
        violet backdrop, and the two are close enough to read as one surface.

        The pastors' own words appear only once they have written them. The
        section stands without them; a quotation written on their behalf would
        not.
      */}
      <section className="bg-plum-deep px-6 py-20 text-white sm:py-28">
        <div className="shell grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-sm bg-plum lg:col-span-5 lg:max-w-none">
            <Image
              src={home.leadershipPhoto}
              alt={home.leadershipPhotoAlt}
              fill
              sizes="(max-width: 1024px) 28rem, 460px"
              className="object-cover object-top"
            />
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <Eyebrow className="text-marigold-light!">
              {home.leadershipLabel}
            </Eyebrow>
            <h2 className="font-display mt-4 text-4xl leading-[1.08] font-medium text-balance sm:text-5xl">
              {home.leadershipHeading}
            </h2>
            <p className="mt-4 text-sm font-medium tracking-wide text-white/70">
              {site.leaders}
            </p>
            <div className="mt-7 text-lg leading-relaxed text-pretty text-white/85">
              <Prose text={home.leadershipBody} />
            </div>

            {home.leadershipMessage.trim() && (
              <figure className="mt-10 border-l-2 border-marigold pl-6">
                <blockquote className="font-display text-xl leading-snug text-pretty italic sm:text-2xl">
                  <Prose text={home.leadershipMessage} />
                </blockquote>
                <figcaption className="mt-4 text-sm text-white/70">
                  — {site.leaders}
                </figcaption>
              </figure>
            )}

            <ArrowLink href="/about" className="mt-10 text-white">
              Meet our leadership
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* Partnership: the first and only invitation to give on the page. */}
      <section className="px-6 py-20 sm:py-28">
        <div className="shell grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Eyebrow>{home.partnerLabel}</Eyebrow>
            <h2 className="font-display mt-4 text-4xl leading-[1.08] font-medium text-balance sm:text-5xl">
              {home.partnerHeading}
            </h2>
            <div className="mt-7 text-lg leading-relaxed text-pretty text-smoke">
              <Prose text={home.partnerBody} />
            </div>
            <ArrowLink href="/projects" className="mt-9 text-plum">
              {home.partnerCta}
            </ArrowLink>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-sand lg:col-span-6">
            <Image
              src={home.partnerPhoto}
              alt={home.partnerPhotoAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* A simple, human closing, full-width. */}
      <section className="relative isolate overflow-hidden bg-charcoal px-6 py-28 text-white sm:py-36">
        <Image
          src={home.welcomePhoto}
          alt={home.welcomePhotoAlt}
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/60" />

        <div className="shell">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl leading-[1.08] font-medium text-balance sm:text-5xl">
              {home.welcomeHeading}
            </h2>
            <div className="mt-6 text-lg leading-relaxed text-pretty text-white/85">
              <Prose text={home.welcomeBody} />
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
              <ArrowLink href="/church">Visit Jepegomi</ArrowLink>
              <ArrowLink href="/contact">Get in touch</ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
