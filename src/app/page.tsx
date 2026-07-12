import Link from "next/link";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { FoodAtSchoolLogo } from "@/components/logos";
import { ButtonLink, Eyebrow, SectionTitle } from "@/components/ui";
import { progress } from "@/content/kitchen";

export default async function HomePage() {
  const home = await getContent("home");

  return (
    <>
      <section className="relative overflow-hidden bg-plum-deep px-6 py-24 sm:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-[480px] w-[480px] rounded-full bg-plum/35"
        />
        <div className="relative mx-auto max-w-4xl">
          <FoodAtSchoolLogo
            variant="mono"
            title="Food at School"
            className="h-24 w-auto text-white"
          />
          <h1 className="font-display mt-8 text-4xl leading-[1.1] font-bold text-white sm:text-6xl">
            {home.heading}
          </h1>
          {paragraphs(home.intro).map((text) => (
            <p
              key={text}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65"
            >
              {text}
            </p>
          ))}
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink href="/projects/kitchen">
              See the Kitchen Build
            </ButtonLink>
            <ButtonLink
              href="/give"
              variant="ghost"
              className="border-white/25 text-white hover:bg-white/10"
            >
              Give
            </ButtonLink>
          </div>
          {/* Derived from the real budget, not typed by hand — so it cannot
              drift out of step with the figures on the Kitchen Build page. */}
          <p className="label-mono mt-12 text-white/40">
            Kitchen {progress.percentComplete}% complete · {progress.caption}
          </p>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {home.cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded border border-black/8 bg-white p-8 transition-shadow hover:shadow-lg"
            >
              <h2 className="font-display text-2xl font-bold">{card.title}</h2>
              {paragraphs(card.body).map((text) => (
                <p key={text} className="mt-3 leading-relaxed text-smoke">
                  {text}
                </p>
              ))}
              <span className="mt-6 inline-block text-sm font-medium text-plum">
                {card.cta}{" "}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-sand px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="!text-plum">{home.closingEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">{home.closingHeading}</SectionTitle>
          {paragraphs(home.closingBody).map((text) => (
            <p key={text} className="mt-5 leading-relaxed text-smoke">
              {text}
            </p>
          ))}
          <ButtonLink href="/give" className="mt-8">
            Give
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
