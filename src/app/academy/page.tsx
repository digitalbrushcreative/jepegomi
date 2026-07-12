import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { AcademyLogo } from "@/components/logos";
import { ButtonLink, Eyebrow, Placeholder, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Jepegomi Academy",
  description:
    "Jepegomi Academy educates children in the Kahawa community and anchors the Food at School feeding program.",
};

export default async function AcademyPage() {
  const academy = await getContent("academy");

  /*
    The four school details started life as hard-coded "to be confirmed" chips.
    Now each is a field: filled ones become real facts, blank ones stay flagged.
    The "still to confirm" box disappears by itself once the last one is filled
    in — nobody has to remember to come back and delete it.
  */
  const details = [
    { label: "Ages / grades served", value: academy.ages },
    { label: "Pupils enrolled", value: academy.pupils },
    { label: "Teachers", value: academy.teachers },
    { label: "Year founded", value: academy.founded },
  ];

  const confirmed = details.filter((detail) => detail.value !== "");
  const unconfirmed = details.filter((detail) => detail.value === "");

  return (
    <>
      <section className="bg-plum-deep px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <AcademyLogo
            variant="mono"
            title="Jepegomi Academy"
            className="h-20 w-auto text-white"
          />
          <p className="label-mono mt-8 text-white/45">{academy.eyebrow}</p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            {academy.heading}
          </h1>
          {paragraphs(academy.intro).map((text) => (
            <p
              key={text}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65"
            >
              {text}
            </p>
          ))}
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>{academy.sectionEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">{academy.sectionTitle}</SectionTitle>
          <div className="mt-8 space-y-6 text-lg leading-relaxed text-smoke">
            {paragraphs(academy.body).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          {confirmed.length > 0 && (
            <dl className="mt-12 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8 sm:grid-cols-2">
              {confirmed.map((detail) => (
                <div key={detail.label} className="bg-white p-6">
                  <dt className="label-mono text-plum">{detail.label}</dt>
                  <dd className="mt-2 font-medium">{detail.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {unconfirmed.length > 0 && (
            <div className="mt-12 rounded border border-dashed border-smoke/30 bg-sand p-8">
              <Eyebrow>Still to confirm</Eyebrow>
              <p className="mt-3 leading-relaxed text-smoke">
                Simon and Joyce still need to confirm the details below before
                this page goes in front of donors.
              </p>
              <ul className="mt-5 flex flex-wrap gap-3">
                {unconfirmed.map((detail) => (
                  <li key={detail.label}>
                    <Placeholder>{detail.label}</Placeholder>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
