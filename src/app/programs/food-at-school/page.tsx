import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { FoodAtSchoolLogo } from "@/components/logos";
import { ButtonLink, Eyebrow, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Food at School",
  description:
    "Morning porridge and a hot lunch, every school day, for children at Jepegomi Academy.",
};

export default async function FoodAtSchoolPage() {
  const program = await getContent("foodAtSchool");

  return (
    <>
      <section className="bg-plum-deep px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <FoodAtSchoolLogo
            variant="mono"
            title="Food at School"
            className="h-24 w-auto text-white"
          />
          <p className="label-mono mt-8 text-white/45">{program.eyebrow}</p>
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

      <div className="divide-y divide-sand">
        {program.sections.map((section) => (
          <section key={section.eyebrow} className="px-6 py-20">
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[220px_1fr]">
              <Eyebrow className="md:pt-2">{section.eyebrow}</Eyebrow>
              <div>
                <SectionTitle>{section.title}</SectionTitle>
                {paragraphs(section.body).map((text) => (
                  <p key={text} className="mt-5 text-lg leading-relaxed text-smoke">
                    {text}
                  </p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="bg-green px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="label-mono text-white/50">{program.closingEyebrow}</p>
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
      </section>
    </>
  );
}
