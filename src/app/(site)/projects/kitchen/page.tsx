import type { Metadata } from "next";
import Image from "next/image";
import { BudgetPanel } from "@/components/budget-panel";
import { Icon, type IconName } from "@/components/icons";
import { FoodAtSchoolLogo } from "@/components/logos";
import { ClothEdge } from "@/components/pattern";
import { PhotoGallery } from "@/components/photo-gallery";
import { ProgressPot } from "@/components/progress-pot";
import { ButtonLink, SectionTitle } from "@/components/ui";
import {
  beforeAfter,
  budgetTotals,
  donation,
  progress,
  remainingNeeds,
  statsFor,
} from "@/content/kitchen";
import { getChildrenFed } from "@/lib/enrolment";
import { getBeforeAfterSources, getGalleryPhotos } from "@/lib/photos";
import { site } from "@/lib/site";

const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;

export const metadata: Metadata = {
  title: "Kitchen Build",
  description:
    "From open fires to a proper kitchen — progress on the Jepegomi Academy kitchen, funded by a partner church.",
};

const storyPoints = [
  <>
    Children were eating meals cooked{" "}
    <strong className="font-bold text-charcoal">outdoors over open fires</strong>
  </>,
  <>No proper kitchen, store room, or dining space</>,
  <>
    {donation.donorTitled} donated{" "}
    <strong className="font-bold text-charcoal">
      {usd(donation.amountUsd)}
    </strong>{" "}
    to fix that
  </>,
  <>
    Kitchen now{" "}
    <strong className="font-bold text-charcoal">
      {progress.percentComplete}% complete
    </strong>{" "}
    — walls up, roof on
  </>,
  <>Final finishes in progress — see &ldquo;Still to complete&rdquo; below</>,
];

const academyFacts = (fed: string): { icon: IconName; text: string }[] => [
  { icon: "church", text: `${site.leaders} — ${site.longName}` },
  { icon: "pin", text: site.location },
  { icon: "pot", text: "Daily meals: porridge (morning) + cooked lunch" },
  { icon: "child", text: `Fed daily: ${fed} — many can't afford meals at home` },
  {
    icon: "globe",
    text: "Also runs: church, Bible school, digital outreach, school transport",
  },
];

function BeforeAfterCard({
  card,
  src,
  tone,
}: {
  card: typeof beforeAfter.before | typeof beforeAfter.after;
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
  const [photos, beforeAfterSrc, childrenFed] = await Promise.all([
    getGalleryPhotos(),
    getBeforeAfterSources(),
    getChildrenFed(),
  ]);

  /*
    Every mention of how many children eat here comes from the same enrolment
    figure, so the hero, the headline number and the academy card can never
    quote three different totals at each other.
  */
  const fed = childrenFed ? `${childrenFed} children` : "every child";
  const stats = statsFor(childrenFed);

  return (
    <>
      {/* The hero: who gave, what for, and how far it has got. */}
      <section className="relative overflow-hidden bg-plum-deep">
        <div className="grain-layer" />

        <div className="shell relative flex flex-col gap-12 px-6 pt-28 pb-24 sm:flex-row sm:items-start sm:pb-28">
          <div className="flex-1">
            <p className="eyebrow flex items-center gap-3 text-marigold">
              <span aria-hidden="true" className="h-px w-7 bg-marigold" />
              Funded by {donation.donor} in {donation.donorLocation}
            </p>

            <FoodAtSchoolLogo
              variant="mono"
              title="Food at School"
              className="mt-7 h-28 w-auto text-white"
            />

            <h1 className="sr-only">
              Food at School — Kitchen Build progress, Jepegomi Academy
            </h1>

            <ul className="mt-8 max-w-xl">
              {[
                <>
                  Donor:{" "}
                  <strong className="font-bold text-white">
                    {donation.donor} in {donation.donorLocation}
                  </strong>
                </>,
                <>
                  Gift:{" "}
                  <strong className="font-bold text-white">
                    {usd(donation.amountUsd)}
                  </strong>{" "}
                  to build a dedicated kitchen
                </>,
                <>Location: Jepegomi Academy, Nairobi, Kenya</>,
                <>
                  Impact: Hot meals daily for{" "}
                  <strong className="font-bold text-white">{fed}</strong>
                </>,
                <>
                  Status:{" "}
                  <strong className="font-bold text-white">
                    {progress.percentComplete}% complete
                  </strong>{" "}
                  — structure done, finishing underway
                </>,
              ].map((item, index) => (
                <li
                  key={index}
                  className="flex items-baseline gap-3 border-b border-white/10 py-2.5 text-sm text-white/70"
                >
                  <span aria-hidden="true" className="text-marigold">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start sm:items-center">
            <ProgressPot
              percent={progress.percentComplete}
              className="h-28 w-auto text-white/80"
            />
            <p className="font-display mt-4 text-6xl leading-none font-semibold text-white">
              {progress.percentComplete}%
            </p>
            <p className="eyebrow mt-2 text-marigold">Kitchen complete</p>
            <p className="mt-2 max-w-[13rem] text-sm text-white/50 sm:text-center">
              {progress.caption}
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
            <p className="eyebrow text-plum">The Story</p>
            <SectionTitle className="mt-3">
              {donation.donorTitled} in {donation.donorLocation}
              <br />
              <span className="text-plum">→</span> Jepegomi Academy, Nairobi
            </SectionTitle>
            <ul className="mt-7">
              {storyPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex items-baseline gap-3 border-b border-sand-deep py-3 leading-relaxed text-smoke"
                >
                  <span aria-hidden="true" className="text-marigold">
                    —
                  </span>
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
                {academyFacts(fed).map((fact) => (
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
            <p className="eyebrow text-plum">Then &amp; Now</p>
            <SectionTitle className="mt-3 flex flex-col items-center">
              From open fires to a proper kitchen
            </SectionTitle>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <BeforeAfterCard
              card={beforeAfter.before}
              src={beforeAfterSrc.before}
              tone="before"
            />
            <BeforeAfterCard
              card={beforeAfter.after}
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
            <p className="eyebrow text-marigold">Photo Journal</p>
            <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-[2.6rem]">
              Watching it come together
            </h2>
            <p className="mt-3 mb-10 text-sm text-white/45">
              {photos.length} photos · tap any to view full size
            </p>
          </div>
          <PhotoGallery photos={photos} />
        </div>
      </section>

      {/* What the money could not reach. */}
      <section className="relative bg-cream px-6 py-20 sm:py-24">
        <ClothEdge className="text-cream" />

        <div className="shell">
          <div className="flex flex-col items-center text-center">
            <p className="eyebrow text-clay">Still to Complete</p>
            <SectionTitle className="mt-3 flex flex-col items-center">
              What the {usd(budgetTotals.given)} could not reach
            </SectionTitle>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-smoke">
              The gift is fully spent, and the building stands. These three
              things ran out of money before they were reached.
            </p>
          </div>

          {/*
            Dashed and unfilled, where everything that was actually built is
            solid. These are the holes in the building, and they should look
            like holes.
          */}
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {remainingNeeds.map((need) => (
              <div
                key={need.text}
                className="flex flex-col rounded-2xl border-2 border-dashed border-clay/35 bg-clay/5 px-6 py-7"
              >
                <Icon name={need.icon} className="h-8 w-8 text-clay" />
                <p className="mt-4 flex-1 text-sm leading-relaxed text-charcoal">
                  {need.text}
                </p>
                <p className="font-display tabular mt-5 text-3xl font-semibold text-clay">
                  {usd(need.costUsd)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-plum px-8 py-7 shadow-warm">
            <p className="eyebrow text-white/70">Still needed to finish</p>
            <p className="font-display tabular text-4xl font-semibold text-marigold">
              {usd(budgetTotals.stillNeeded)}
            </p>
          </div>
        </div>
      </section>

      <BudgetPanel />

      {/* The ask. */}
      <section className="relative overflow-hidden bg-plum-deep px-6 py-20 text-center sm:py-24">
        <div className="grain-layer" />
        <ClothEdge className="text-plum-deep" />

        <div className="shell relative">
          <div className="mx-auto max-w-md">
          <p className="eyebrow text-marigold">Partner With Us</p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-[2.6rem]">
            Help us finish the kitchen
          </h2>

          {/*
            No account number here — the giving page explains how the details
            are sent, and it is the one place that explanation lives.
          */}
          <p className="mt-6 leading-relaxed text-white/65">
            {usd(budgetTotals.stillNeeded)} finishes it. Gifts can be marked for
            the kitchen, and we will send you the giving details ourselves.
          </p>

          <ButtonLink href="/give" icon="give" className="mt-9">
            How to give
          </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
