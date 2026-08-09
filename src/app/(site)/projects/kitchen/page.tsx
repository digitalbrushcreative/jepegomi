import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/cms/content";
import { Icon, type IconName } from "@/components/icons";
import { KitchenAccounts } from "@/components/kitchen-accounts";
import { FoodAtSchoolLogo } from "@/components/logos";
import { ClothEdge } from "@/components/pattern";
import { PhotoGallery } from "@/components/photo-gallery";
import { ProgressPot } from "@/components/progress-pot";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { showsAccounts } from "@/lib/disclosure";
import { areaOf } from "@/lib/giving";
import { getChildrenFed } from "@/lib/enrolment";
import { accountSet, visibilityOf } from "@/lib/project-accounts";
import { getKitchenReport, kitchenStats } from "@/lib/kitchen";
import {
  getProjectBudget,
  getPublishedNeeds,
  getStillNeededCents,
} from "@/lib/needs";
import {
  getBeforeAfterSources,
  getGalleryCategories,
  getGalleryPhotos,
} from "@/lib/photos";
import { site } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { RelatedLinks } from "@/components/related-links";

const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;

export const metadata: Metadata = pageMeta({
  title: "Kitchen Build",
  description:
    "From open fires to a proper kitchen — the Jepegomi Academy kitchen a partner church built, cooking daily, with the dining area still to finish.",
  path: "/projects/kitchen",
});

function BeforeAfterCard({
  card,
  src,
  tone,
}: {
  card: { heading: string; alt: string; bullets: string[] };
  src: string;
  tone: "before" | "after";
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-warm">
      <p
        className={`eyebrow px-6 py-3.5 text-white ${
          tone === "before" ? "bg-smoke" : "bg-green"
        }`}
      >
        {card.heading}
      </p>
      <div className="relative flex aspect-[16/10] items-center justify-center bg-sand">
        {src ? (
          <Image
            src={src}
            alt={card.alt}
            fill
            sizes="(max-width: 768px) 100vw, 470px"
            className="object-cover"
          />
        ) : (
          <p className="text-sm text-smoke/60">Photo to be added</p>
        )}
      </div>
      <ul className="space-y-2 px-6 py-5">
        {card.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2.5 text-sm text-smoke">
            <span
              aria-hidden="true"
              className={tone === "before" ? "text-clay" : "text-green"}
            >
              ●
            </span>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function KitchenPage() {
  const [
    photos,
    beforeAfterSrc,
    childrenFed,
    accounts,
    stillNeededCents,
    report,
    published,
    categories,
  ] = await Promise.all([
      getGalleryPhotos(),
      getBeforeAfterSources(),
      getChildrenFed(),
      getContent("projectAccounts"),
      /*
        What finishing the kitchen costs, summed from the published items still
        open in the ledger rather than from a constant in a source file. Simon
        marks the water tank received in /app and this figure moves on the next
        page load, on this page and on the front page both.
      */
      getStillNeededCents("kitchen"),
      getKitchenReport(),
      getPublishedNeeds(),
      getGalleryCategories(),
    ]);


  /*
    The story of the build, in five lines. Built here rather than at module
    scope because who gave and where they are now come out of the CMS, and a
    constant computed at import time would be whatever was saved when the
    process started.
  */
  const storyPoints = [
    <>
      Meals were cooked{" "}
      <strong className="font-bold text-charcoal">
        outdoors over open fires
      </strong>
      , without a kitchen or a store room
    </>,
    <>
      {report.donorTitled} in {report.donorLocation}{" "}
      <strong className="font-bold text-charcoal">partnered with us</strong> to
      change that
    </>,
    <>
      The kitchen is{" "}
      <strong className="font-bold text-charcoal">built and cooking</strong>. Every
      meal comes out of it now
    </>,
    <>
      Next is the room the children eat in. See &ldquo;Still to complete&rdquo;
      below
    </>,
  ];

  /*
    The three things the gift could not reach, read off the ledger rather than
    out of a list beside it. These are rows in `needs` — the same rows /needs
    asks for and a partner claims against — so the cards here cannot go on
    describing a water tank somebody has already paid for.
  */
  const remaining = published.filter(
    (need) => areaOf(need.area).id === "kitchen" && !need.closed,
  );


  /*
    Whether the reconciliation is printed here or only invited to.

    `disclosure: null` because nobody is signed in on a public page — so this is
    true only when Simon has set the switch in /app to "Anyone", which is him
    deliberately putting the ministry's own books back on the open web. The
    default is the other thing, and the section below says so either way.
  */
  const publishAccounts = showsAccounts({
    visibility: visibilityOf(accounts, "kitchen"),
    disclosure: null,
    areaId: accountSet("kitchen").area,
  });

  // Only read when it is about to be drawn — a public page should not pay for
  // the accounts on every visit to keep them hidden.
  const budget = publishAccounts
    ? await getProjectBudget(accountSet("kitchen").area)
    : null;

  /*
    Every mention of how many children eat here comes from the same enrolment
    figure, so the hero, the headline number and the academy card can never
    quote three different totals at each other.
  */
  const fed = childrenFed ? `${childrenFed} children` : "every child";
  const stats = kitchenStats(report, childrenFed);

  const academyFacts: { icon: IconName; text: string }[] = [
    { icon: "church", text: `${site.leaders}, ${site.longName}` },
    { icon: "pin", text: site.location },
    { icon: "pot", text: "Daily meals: porridge (morning) + cooked lunch" },
    {
      icon: "child",
      text: `Fed daily: ${fed}, every child the school teaches`,
    },
    {
      icon: "globe",
      text: "Also runs: church, Bible school, digital outreach, school transport",
    },
  ];

  return (
    <>
      {/* The hero: who gave, what for, and how far it has got. */}
      <section className="relative overflow-hidden bg-plum-deep">
        <div className="grain-layer" />

        <div className="shell relative flex flex-col gap-12 px-6 pt-28 pb-24 sm:flex-row sm:items-start sm:pb-28">
          <div className="flex-1">
            <p className="eyebrow flex items-center gap-3 text-marigold">
              <span aria-hidden="true" className="h-px w-7 bg-marigold" />
              Funded by {report.donor} in {report.donorLocation}
            </p>

            <FoodAtSchoolLogo
              variant="mono"
              title="Food at School"
              className="mt-7 h-28 w-auto text-white"
            />

            <h1 className="sr-only">
              Food at School: Kitchen Build progress at Jepegomi Academy
            </h1>

            <ul className="mt-8 max-w-xl">
              {[
                <>
                  Partner:{" "}
                  <strong className="font-bold text-white">
                    {report.donor} in {report.donorLocation}
                  </strong>
                </>,
                <>
                  Built:{" "}
                  <strong className="font-bold text-white">
                    a kitchen and store room
                  </strong>
                  , with a dining area beside it
                </>,
                <>Location: Jepegomi Academy, Nairobi, Kenya</>,
                <>
                  Impact: Hot meals daily for{" "}
                  <strong className="font-bold text-white">{fed}</strong>
                </>,
                <>
                  Status:{" "}
                  <strong className="font-bold text-white">Built and cooking</strong>
                  . The dining area is still to finish
                </>,
              ].map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 border-b border-white/10 py-2.5 text-sm text-white/70"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.7em] h-px w-3.5 shrink-0 bg-marigold"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start sm:items-center">
            <ProgressPot
              percent={report.percentComplete}
              className="h-28 w-auto text-white/80"
            />
            <p className="font-display mt-4 text-6xl leading-none font-semibold text-white">
              {report.percentComplete}%
            </p>
            <p className="eyebrow mt-2 text-marigold">Of the build done</p>
            <p className="mt-2 max-w-[13rem] text-sm text-white/50 sm:text-center">
              {report.progressCaption}
            </p>
          </div>
        </div>

        <ClothEdge anchor="inside-bottom" className="text-cream" />
      </section>

      {/* The three headline numbers, on cloth rather than in a plum strip. */}
      <section className="bg-cream px-6">
        <dl className="shell grid gap-5 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="overflow-hidden rounded-2xl bg-white text-center shadow-warm"
            >
              <div className="px-6 py-7">
                <dd className="font-display tabular text-4xl leading-none font-semibold text-plum">
                  {stat.value}
                </dd>
                <dt className="eyebrow mt-3 text-smoke">{stat.label}</dt>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* The story, and who the academy is. */}
      <section className="bg-cream px-6 py-20 sm:py-24">
        <div className="shell grid gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionTitle className="mt-3">
              {report.donorTitled} in {report.donorLocation}
              <br />
              <span className="text-plum">→</span> Jepegomi Academy, Nairobi
            </SectionTitle>
            <ul className="mt-7">
              {storyPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 border-b border-sand-deep py-3 leading-relaxed text-smoke"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.7em] h-px w-3.5 shrink-0 bg-marigold"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="overflow-hidden rounded-2xl bg-green shadow-warm">
            <div className="p-8 sm:p-9">
              <p className="eyebrow text-white/60">About Jepegomi Academy</p>
              <p className="font-display mt-4 text-2xl leading-snug font-semibold text-white">
                &ldquo;Quality Education With Values&rdquo;
              </p>
              <div className="mt-7">
                {academyFacts.map((fact) => (
                  <div
                    key={fact.text}
                    className="flex gap-4 border-t border-white/20 py-4 first:border-t-0 first:pt-0"
                  >
                    <Icon
                      name={fact.icon}
                      className="h-6 w-6 shrink-0 text-marigold-light"
                    />
                    <p className="text-sm leading-relaxed text-white/85">
                      {fact.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Then & now. */}
      <section className="relative bg-sand px-6 py-20 sm:py-24">
        <ClothEdge className="text-sand" />

        <div className="shell">
          <div className="flex flex-col items-center text-center">
            <SectionTitle className="mt-3 flex flex-col items-center">
              From open fires to a proper kitchen
            </SectionTitle>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <BeforeAfterCard
              card={report.before}
              src={beforeAfterSrc.before}
              tone="before"
            />
            <BeforeAfterCard
              card={report.after}
              src={beforeAfterSrc.after}
              tone="after"
            />
          </div>
        </div>
      </section>

      {/* The photo journal. */}
      <section className="relative overflow-hidden bg-plum-deep px-6 py-20 sm:py-24">
        <div className="grain-layer" />
        <ClothEdge className="text-plum-deep" />

        <div className="shell relative">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-[2.6rem]">
              Watching it come together
            </h2>
            <p className="mt-3 mb-10 text-sm text-white/45">
              {photos.length} photos · tap any to view full size
            </p>
          </div>
          <PhotoGallery photos={photos} categories={categories} />
        </div>
      </section>

      {/* What is left to build. */}
      <section className="relative bg-cream px-6 py-20 sm:py-24">
        <ClothEdge className="text-cream" />

        <div className="shell">
          <div className="flex flex-col items-center text-center">
            <SectionTitle className="mt-3 flex flex-col items-center">
              What would finish it
            </SectionTitle>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-smoke">
              The gift did everything it was given for, and the kitchen is
              cooking. These three things would complete the room beside it.
            </p>
          </div>

          {/*
            Dashed and unfilled, where everything that was actually built is
            solid. These are the holes in the building, and they should look
            like holes.

            Each card used to carry its own price. Three named fixtures with a
            figure against each — a water tank, stone for a floor, the wiring
            for a hall — is a delivery schedule for a compound in Nairobi, which
            is not what anybody meant to publish. The descriptions stay, because
            they are what the ask is; the itemised costs went behind the partner
            door with the rest of the accounts. See lib/disclosure.ts. The total
            below is the figure a reader can act on and the only one they need.
          */}
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {remaining.map((need) => (
              <div
                key={need.id}
                className="flex flex-col rounded-2xl border-2 border-dashed border-clay/35 bg-clay/5 px-6 py-7"
              >
                <Icon
                  name={(need.icon || areaOf(need.area).icon) as IconName}
                  className="h-8 w-8 text-clay"
                />
                <p className="mt-4 flex-1 text-sm leading-relaxed text-charcoal">
                  {need.summary || need.title}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-plum px-8 py-7 shadow-warm">
            <p className="eyebrow text-white/70">Still needed to finish</p>
            <p className="font-display tabular text-4xl font-semibold text-marigold">
              {usd(stillNeededCents / 100)}
            </p>
          </div>
        </div>
      </section>

      {/*
        The accounts, or the invitation to them.

        This was a button reading "See where it went" that opened Simon's whole
        reconciliation to anybody who pressed it. The willingness is the thing
        worth keeping and it is kept in both branches — the section says the
        books are open whether or not it prints them. What changed is that where
        they are printed is now Simon's to set, in /app under Giving → Project
        accounts, because a line-by-line account of what a ministry in Nairobi
        bought and what it is still short of is not only a comfort to donors.

        Deliberately not phrased as a wall in the closed branch. A reader who is
        not a partner should come away knowing the accounts exist and are shown,
        which is the whole point of having them.
      */}
      <div className="relative bg-sand px-6 py-20">
        <ClothEdge className="text-sand" />

        <div className="shell">
          {budget ? (
            <>
              <div className="text-center">
                <SectionTitle className="mt-3">
                  Every shilling of the gift, accounted for
                </SectionTitle>
                <p className="mx-auto mt-5 max-w-xl leading-relaxed text-smoke">
                  Pastor Simon reconciled the build line by line: what each
                  thing was estimated at, what it actually cost, and where it ran
                  over.
                </p>
              </div>

              <div className="mx-auto mt-12 max-w-3xl">
                <KitchenAccounts budget={budget} report={report} />
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="font-display mx-auto max-w-lg text-2xl leading-snug font-semibold text-balance">
                Every shilling of the gift is accounted for.
              </p>
              <p className="mx-auto mt-5 max-w-xl leading-relaxed text-smoke">
                Pastor Simon reconciled the build line by line: what each thing
                was estimated at, what it actually cost, and where it ran over.
                Partners who gave towards this work read it in full when they
                sign in.
              </p>
              <ButtonLink href="/partners" className="mt-8">
                Partner sign-in
              </ButtonLink>
            </div>
          )}
        </div>
      </div>

      {/* The ask. */}
      <section className="relative overflow-hidden bg-plum-deep px-6 py-20 text-center sm:py-24">
        <div className="grain-layer" />
        <ClothEdge className="text-plum-deep" />

        <div className="shell relative">
          <div className="mx-auto max-w-md">
            <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-[2.6rem]">
              Help us finish the kitchen
            </h2>

            {/*
            No account number here — the giving page explains how the details
            are sent, and it is the one place that explanation lives.
          */}
            <p className="mt-6 leading-relaxed text-white/65">
              {usd(stillNeededCents / 100)} finishes it. Gifts can be marked
              for the kitchen, and we will send you the giving details
              ourselves.
            </p>

            <ButtonLink href="/give" icon="give" className="mt-9">
              How to give
            </ButtonLink>
          </div>
        </div>
      </section>

      <RelatedLinks
        links={[
          {
            href: "/programs/food-at-school",
            label: "Food at School",
            blurb:
              "The porridge and hot lunch this kitchen cooks, every school day, for every child at the academy.",
          },
          {
            href: "/academy",
            label: "Jepegomi Academy",
            blurb:
              "The school the kitchen feeds — kindergarten to Grade 6 in Kahawa Sukari.",
          },
          {
            href: "/needs",
            label: "What's needed",
            blurb:
              "Every remaining cost on the kitchen, itemised, alongside everything else the ministry is short of.",
          },
        ]}
      />
    </>
  );
}
