import type { Metadata } from "next";
import { FoodAtSchoolLogo } from "@/components/logos";
import { ButtonLink, Eyebrow, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Food at School",
  description:
    "Morning porridge and a hot lunch, every school day, for children at Jepegomi Academy.",
};

const sections = [
  {
    eyebrow: "What it is",
    title: "Morning porridge. A hot lunch. Every school day.",
    body: "Children at Jepegomi Academy are fed twice a day — porridge when they arrive, and a cooked lunch in the middle of the day. More than 50 children eat this way, every day the school is open.",
  },
  {
    eyebrow: "Why it matters",
    title: "For many, this is the meal they can count on.",
    body: "A number of the children come from homes that cannot reliably put food on the table. The meal at school is the one they know is coming. A fed child can learn; a hungry one cannot.",
  },
  {
    eyebrow: "The challenge today",
    title: "It is all cooked outdoors, on open fires.",
    body: "There is no kitchen. Meals are cooked over open flames in the open air — slow, unsafe in bad weather, smoky, and hard to keep clean. There is nowhere proper to store food and nowhere for the children to sit and eat.",
  },
];

export default function FoodAtSchoolPage() {
  return (
    <>
      <section className="bg-plum-deep px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <FoodAtSchoolLogo
            variant="mono"
            title="Food at School"
            className="h-24 w-auto text-white"
          />
          <p className="label-mono mt-8 text-white/45">
            A program of Jepegomi Academy
          </p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            A hot meal, every school day
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
            Food at School gives children at Jepegomi Academy morning porridge
            and a cooked lunch — for many of them, the most reliable meal of
            their day.
          </p>
        </div>
      </section>

      <div className="divide-y divide-sand">
        {sections.map((section) => (
          <section key={section.eyebrow} className="px-6 py-20">
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[220px_1fr]">
              <Eyebrow className="md:pt-2">{section.eyebrow}</Eyebrow>
              <div>
                <SectionTitle>{section.title}</SectionTitle>
                <p className="mt-5 text-lg leading-relaxed text-smoke">
                  {section.body}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="bg-green px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="label-mono text-white/50">What&apos;s changing</p>
          <h2 className="font-display mt-4 text-3xl leading-tight font-bold text-white sm:text-4xl">
            A proper kitchen is being built
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/80">
            With Encounter Church of Palmyra, Pennsylvania, we are building a
            real kitchen — with a store room and a dining area — to replace the
            open fires. The walls are up and the roof is on.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ButtonLink
              href="/projects/kitchen"
              className="bg-white !text-green hover:bg-white/90"
            >
              Follow the build
            </ButtonLink>
            <ButtonLink
              href="/give"
              variant="ghost"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Give
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
