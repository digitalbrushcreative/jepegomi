import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { EditorOnly } from "@/components/editor-only";
import { BibleCollegeLogo } from "@/components/logos";
import { ClothEdge } from "@/components/pattern";
import { PhotoBand } from "@/components/photos";
import { ButtonLink, Eyebrow, Placeholder, SectionTitle } from "@/components/ui";

const seminar = {
  src: "/photos/college/seminar.jpg",
  alt: "About seventeen students standing together outside the iron-sheet sanctuary at a college seminar",
};

export const metadata: Metadata = {
  title: "Contextual Bible Training College",
  description:
    "The Contextual Bible Training College — Bible training from certificate to doctorate, with the monthly fee and length of every programme.",
};

/*
  The whole cost of a programme, worked out rather than typed in — a monthly fee
  and a number of months are two facts an editor can keep straight; their product
  is a third that would quietly go stale the next time either one changed.

  Both fields are free text, so anything that isn't a number is treated as no
  answer and the total is simply left off that row. A missing total costs the
  reader a little arithmetic; a wrong one costs them their trust in the page.
*/
function wholeCourse(fee: string, months: string) {
  const monthly = Number(fee.replace(/\D/g, ""));
  const length = Number(months.replace(/\D/g, ""));
  if (!monthly || !length) return null;
  return (monthly * length).toLocaleString("en-KE");
}

export default async function CollegePage() {
  const college = await getContent("college");

  /*
    The same shape as the Academy's four details: a filled field becomes a fact,
    a blank one is simply not there for a reader, and the "still to confirm" box
    — which only a signed-in editor sees, see components/editor-only.tsx — takes
    itself down once the last one is filled in.

    "What is taught" used to be one of these. The programmes below answer it
    better than a one-line summary could, so it went — everything left here is
    still genuinely unknown.
  */
  const details = [
    { label: "Students enrolled", value: college.students },
    { label: "When it meets", value: college.schedule },
    { label: "How to enrol", value: college.enrolment },
    { label: "Next intake", value: college.intake },
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

      {/*
        The page had no photograph of anybody in it — a college described only in
        fees and month counts. The students are the argument for the place.
      */}
      <PhotoBand photo={seminar} aspect="aspect-[21/9]" className="pt-16" />

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
            <EditorOnly>
              <div className="mt-12 rounded border border-dashed border-smoke/30 bg-sand p-8">
                <Eyebrow>Still to confirm</Eyebrow>
                <p className="mt-3 leading-relaxed text-smoke">
                  The details below are still blank, so somebody hoping to study
                  here cannot see them. Fill them in and they join the table
                  above. Only you see this note.
                </p>
                <ul className="mt-5 flex flex-wrap gap-3">
                  {unconfirmed.map((detail) => (
                    <li key={detail.label}>
                      <Placeholder>{detail.label}</Placeholder>
                    </li>
                  ))}
                </ul>
              </div>
            </EditorOnly>
          )}

        </div>
      </section>

      {/*
        The part of this page somebody actually came for. A prospective student
        wants two things before anything else — what it costs and how long it
        takes — and until now the page made them write in to find out.
      */}
      <section className="relative bg-sand px-6 py-20 sm:py-24">
        <ClothEdge className="text-sand" />

        <div className="shell">
          <Eyebrow>{college.feesEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">{college.feesTitle}</SectionTitle>
          <div className="mt-6 max-w-2xl space-y-6 leading-relaxed text-smoke">
            {paragraphs(college.feesBody).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          {college.programs.length > 0 && (
            <ul className="mt-10 divide-y divide-black/8 overflow-hidden rounded-2xl bg-white shadow-warm">
              {college.programs.map((program) => {
                const total = wholeCourse(program.fee, program.months);

                return (
                  <li
                    key={program.name}
                    className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 p-6 sm:p-8"
                  >
                    <div>
                      <p className="font-display text-lg font-bold">
                        {program.name}
                      </p>
                      <p className="mt-1 text-sm text-smoke">
                        {program.months} months
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-display text-xl font-bold text-plum">
                        Ksh {program.fee}
                        <span className="text-base font-normal text-smoke">
                          {" "}
                          a month
                        </span>
                      </p>
                      {total && (
                        <p className="mt-1 text-sm text-smoke">
                          Ksh {total} over the whole course
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/*
            The only account number published anywhere on this site — see the
            note above the college document in src/cms/schema.ts for why fees
            are the exception. Each line drops out on its own if it is cleared.
          */}
          <div className="mt-10 rounded-2xl border border-plum/15 bg-white p-8 sm:p-10">
            <h3 className="font-display text-2xl font-bold">
              {college.paymentsTitle}
            </h3>

            <dl className="mt-6 grid gap-6 sm:grid-cols-3">
              {[
                { label: "Bank", value: college.bank },
                { label: "Account number", value: college.account },
                { label: "M-Pesa paybill", value: college.paybill },
              ]
                .filter((line) => line.value !== "")
                .map((line) => (
                  <div key={line.label}>
                    <dt className="eyebrow text-plum">{line.label}</dt>
                    <dd className="font-display mt-2 text-xl font-bold">
                      {line.value}
                    </dd>
                  </div>
                ))}
            </dl>

            <div className="mt-8 space-y-4 leading-relaxed text-smoke">
              {paragraphs(college.paymentsNote).map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <ButtonLink href="/contact" variant="secondary">
              Ask about the college
            </ButtonLink>
            <ButtonLink href="/church" variant="ghost" className="text-plum">
              The church
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
