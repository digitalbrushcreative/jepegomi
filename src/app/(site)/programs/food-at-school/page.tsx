import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { FoodAtSchoolLogo } from "@/components/logos";
import { PhotoBand, PhotoStrip } from "@/components/photos";
import { ButtonLink, Eyebrow, SectionTitle } from "@/components/ui";

const meal = {
  src: "/photos/meals/lunch.jpg",
  alt: "Five children in green uniform eating rice and beans from red plates at a wooden desk",
  caption: "Lunch, at the desks the children spend the morning at.",
};

/*
  The last of these three is the only photograph on the page of how the food used
  to be cooked. It stays because the kitchen appeal two clicks away makes no
  sense without it — a pot on three stones in the open is the thing the kitchen
  replaced, and nobody gives towards a problem they have only read about.
*/
const day = [
  {
    src: "/photos/school/lunch-queue-01.jpg",
    alt: "Children in green uniform queueing along a wall, plates in hand",
    caption: "The queue, every school day.",
  },
  {
    src: "/photos/school/lunch-classroom-01.jpg",
    alt: "Children eating from plates at their desks in an iron-sheet classroom",
    caption: "Eaten where they are taught.",
  },
  {
    src: "/photos/meals/open-fire.jpg",
    alt: "A large cooking pot balanced on stones over a wood fire on bare ground",
    caption: "How every meal was cooked before the kitchen was built.",
  },
];

export const metadata: Metadata = {
  title: "Food at School",
  description:
    "Morning porridge and a hot lunch, every school day, for children at Jepegomi Academy.",
};

export default async function FoodAtSchoolPage() {
  const program = await getContent("foodAtSchool");

  return (
    <>
      <section className="bg-plum-deep px-6 pt-28 pb-20">
        <div className="shell">
          <FoodAtSchoolLogo
            variant="mono"
            title="Food at School"
            className="h-24 w-auto text-white"
          />
          <p className="eyebrow mt-8 text-white/45">{program.eyebrow}</p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            {program.heading}
          </h1>
          {paragraphs(program.intro).map((text) => (
            <p
              key={text}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65"
            >
              {text}
            </p>
          ))}
        </div>
      </section>

      <PhotoBand photo={meal} className="pt-16" />

      <div className="divide-y divide-sand">
        {program.sections.map((section) => (
          <section key={section.eyebrow} className="px-6 py-20">
            <div className="shell grid gap-8 md:grid-cols-[220px_1fr]">
              <Eyebrow className="md:pt-2">{section.eyebrow}</Eyebrow>
              <div>
                <SectionTitle>{section.title}</SectionTitle>
                {paragraphs(section.body).map((text) => (
                  <p key={text} className="mt-5 max-w-2xl text-lg leading-relaxed text-smoke">
                    {text}
                  </p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="px-6 pb-20">
        <div className="shell">
          <PhotoStrip photos={day} />
        </div>
      </section>

      <section className="bg-green px-6 py-24">
        <div className="shell text-center">
          <div className="mx-auto max-w-2xl">
            <p className="eyebrow text-white/50">{program.closingEyebrow}</p>
            <h2 className="font-display mt-4 text-3xl leading-tight font-bold text-white sm:text-4xl">
              {program.closingHeading}
            </h2>
            {paragraphs(program.closingBody).map((text) => (
              <p key={text} className="mt-5 text-lg leading-relaxed text-white/80">
                {text}
              </p>
            ))}
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
        </div>
      </section>
    </>
  );
}
