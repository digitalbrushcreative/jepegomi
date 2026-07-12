import type { Metadata } from "next";
import { AcademyLogo } from "@/components/logos";
import { ButtonLink, Eyebrow, Placeholder, SectionTitle } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Jepegomi Academy",
  description:
    "Jepegomi Academy educates children in the Kahawa community and anchors the Food at School feeding program.",
};

export default function AcademyPage() {
  return (
    <>
      <section className="bg-plum-deep px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <AcademyLogo
            variant="mono"
            title="Jepegomi Academy"
            className="h-20 w-auto text-white"
          />
          <p className="label-mono mt-8 text-white/45">The School</p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            Quality education with values
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
            Jepegomi Academy educates children in the Kahawa community and
            anchors the Food at School program — the reason a hot meal reaches
            50+ children every school day.
          </p>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>What we know</Eyebrow>
          <SectionTitle className="mt-4">The school today</SectionTitle>
          <div className="mt-8 space-y-6 text-lg leading-relaxed text-smoke">
            <p>
              The Academy sits in {site.location}, run by the same hands as the
              church — Pastor Simon and Joyce Nderitu. Children come from
              families across the neighbourhood, many of whom cannot reliably
              provide meals at home.
            </p>
            <p>
              Because the school feeds the children it teaches, the two are hard
              to separate: attendance, attention, and learning all move together
              with the meal.
            </p>
          </div>

          <div className="mt-12 rounded border border-dashed border-smoke/30 bg-sand p-8">
            <Eyebrow>Still to confirm</Eyebrow>
            <p className="mt-3 leading-relaxed text-smoke">
              Simon and Joyce still need to confirm the details below before
              this page goes in front of donors.
            </p>
            <ul className="mt-5 flex flex-wrap gap-3">
              <li>
                <Placeholder>Ages / grades served</Placeholder>
              </li>
              <li>
                <Placeholder>Number of pupils enrolled</Placeholder>
              </li>
              <li>
                <Placeholder>Number of teachers</Placeholder>
              </li>
              <li>
                <Placeholder>Year founded</Placeholder>
              </li>
            </ul>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <ButtonLink href="/programs/food-at-school" variant="secondary">
              Food at School
            </ButtonLink>
            <ButtonLink href="/projects/kitchen" variant="ghost">
              The Kitchen Build
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
