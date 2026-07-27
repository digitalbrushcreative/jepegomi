import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { BibleCollegeLogo } from "@/components/logos";
import { ButtonLink, Eyebrow, Placeholder, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contextual Bible Training College",
  description:
    "The Contextual Bible Training College — the training arm of Jesus People Gospel Ministries, alongside the church and Jepegomi Academy.",
};

export default async function CollegePage() {
  const college = await getContent("college");

  /*
    The same shape as the Academy's four details: a filled field becomes a fact,
    a blank one stays flagged, and the "still to confirm" box takes itself down
    once the last one is filled in. The college has the most blanks of any page
    on the site — which is the honest state of it, and better said out loud than
    papered over with invented copy.
  */
  const details = [
    { label: "What is taught", value: college.courses },
    { label: "Students enrolled", value: college.students },
    { label: "When it meets", value: college.schedule },
    { label: "How to enrol", value: college.enrolment },
  ];

  const confirmed = details.filter((detail) => detail.value !== "");
  const unconfirmed = details.filter((detail) => detail.value === "");

  return (
    <>
      <section className="bg-charcoal px-6 pt-28 pb-20">
        <div className="shell">
          <BibleCollegeLogo
            variant="mono"
            title="Contextual Bible Training College"
            className="h-20 w-auto text-white"
          />
          <p className="eyebrow mt-8 text-white/45">{college.eyebrow}</p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            {college.heading}
          </h1>
          {paragraphs(college.intro).map((text) => (
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
        <div className="shell">
          <Eyebrow>{college.sectionEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">{college.sectionTitle}</SectionTitle>
          <div className="mt-8 max-w-3xl space-y-6 text-lg leading-relaxed text-smoke">
            {paragraphs(college.body).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          {confirmed.length > 0 && (
            <dl className="mt-12 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8 sm:grid-cols-2">
              {confirmed.map((detail) => (
                <div key={detail.label} className="bg-white p-6">
                  <dt className="eyebrow text-plum">{detail.label}</dt>
                  <dd className="mt-2 font-medium">{detail.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {unconfirmed.length > 0 && (
            <div className="mt-12 rounded border border-dashed border-smoke/30 bg-sand p-8">
              <Eyebrow>Still to confirm</Eyebrow>
              <p className="mt-3 leading-relaxed text-smoke">
                Simon still needs to confirm the details below before this page
                goes in front of anybody hoping to study here.
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
            <ButtonLink href="/church" variant="secondary">
              The church
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost" className="text-plum">
              Ask about the college
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
