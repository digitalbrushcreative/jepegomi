import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { EnrolmentEnquiryForm } from "@/app/(site)/academy/enquiry-form";
import { EditorOnly } from "@/components/editor-only";
import { AcademyLogo } from "@/components/logos";
import { ClothEdge } from "@/components/pattern";
import { PhotoBand, PhotoStrip } from "@/components/photos";
import {
  ButtonLink,
  Eyebrow,
  Placeholder,
  SectionTitle,
} from "@/components/ui";

const graduation = {
  src: "/photos/academy/graduation.jpg",
  alt: "Two rows of young children in green graduation gowns and mortar boards, a teacher standing at either side",
  caption: "A graduating class, outside the classrooms they learned in.",
};

/*
  The growth story, in three photographs, oldest first.

  The first one is years old and was previously captioned as though it were the
  present — "the academy, as it stands on the road" — which quietly undersold
  the school by about a decade of work. It earns its place as the *start* of the
  sequence and nowhere else, so the captions carry the dates the photographs
  cannot.
*/
const growth = [
  {
    src: "/photos/academy/signboard.jpg",
    alt: "An iron-sheet building painted with the words Jepegomi Academy, Value Based Education, and Day Care Baby Class",
    caption:
      "Where it began. A row of iron-sheet rooms on the roadside, the name painted on by hand.",
  },
  {
    src: "/photos/academy/classroom-block.jpg",
    alt: "A long semi-permanent classroom block, stone to the window sills and iron sheet above, under a pitched roof with yellow fascia boards",
    caption:
      "Where it is now. Semi-permanent blocks — stone to the sill, iron sheet above, a proper roof over both.",
  },
  {
    src: "/photos/academy/classrooms.jpg",
    alt: "A man on the roof timbers of a half-built classroom block, iron sheets stacked on the grass below",
    caption:
      "And still going up. The bigger classrooms the government now requires.",
  },
];

const school = [
  {
    src: "/photos/academy/gate.jpg",
    alt: "The school gate from the road, under a painted board reading Jesus People Gospel Ministries and Jepegomi Academy",
    caption: "The gate, as it stands on the road today.",
  },
  {
    src: "/photos/academy/walkway.jpg",
    alt: "A child walking the concrete path between two classroom blocks, the church roof behind",
    caption: "The compound, with the church behind it.",
  },
  {
    src: "/photos/academy/assembly.jpg",
    alt: "A long line of children in green uniform standing outdoors at assembly, a teacher reading to them",
    caption: "Morning assembly.",
  },
];

/*
  Inside. The page above says the classrooms are semi-permanent; these are what
  that word means — iron sheets, timber trusses, a concrete floor and a
  blackboard. Shown plainly rather than framed flatteringly, because the case
  for better classrooms is made by the classrooms.
*/
const inside = [
  {
    src: "/photos/academy/classroom-inside.jpg",
    alt: "A classroom of iron sheets and timber roof trusses, charts pinned along the walls above metal desks",
    caption: "A classroom, mid-morning.",
  },
  {
    src: "/photos/academy/blackboard.jpg",
    alt: "A blackboard mounted on a rough plastered wall with a lesson written on it in chalk",
    caption: "The day's lesson, still on the board.",
  },
  {
    src: "/photos/academy/classroom-desks.jpg",
    alt: "A large empty classroom with a concrete floor, green metal desks, and blackboards on two walls under exposed timber trusses",
    caption: "A room built to hold a whole class, waiting for the morning.",
  },
];

export const metadata: Metadata = {
  title: "Jepegomi Academy",
  description:
    "Jepegomi Academy teaches children from kindergarten to Grade 6 in Kahawa Sukari — quality education with values, in classrooms the ministry built itself.",
};

export default async function AcademyPage() {
  const [academy, siteDetails] = await Promise.all([
    getContent("academy"),
    getContent("site"),
  ]);

  /*
    The school details started life as hard-coded "to be confirmed" chips.
    Now each is a field: filled ones become real facts, blank ones stay flagged.
    The "still to confirm" box disappears by itself once the last one is filled
    in — nobody has to remember to come back and delete it.
  */
  const details = [
    { label: "Ages / grades served", value: academy.ages },
    { label: "Pupils enrolled", value: academy.pupils },
    { label: "Teachers", value: academy.teachers },
    { label: "Administrative staff", value: academy.staff },
    { label: "Year founded", value: academy.founded },
  ];

  const confirmed = details.filter((detail) => detail.value !== "");
  const unconfirmed = details.filter((detail) => detail.value === "");

  return (
    <>
      <section className="bg-plum-deep px-6 pt-28 pb-20">
        <div className="shell">
          <AcademyLogo
            variant="mono"
            title="Jepegomi Academy"
            className="h-20 w-auto text-white"
          />
          <p className="eyebrow mt-8 text-white/45">{academy.eyebrow}</p>
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

      <PhotoBand photo={graduation} className="pt-16" />

      <section className="px-6 py-24">
        <div className="shell">
          <Eyebrow>{academy.sectionEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">{academy.sectionTitle}</SectionTitle>
          <div className="mt-8 max-w-3xl space-y-6 text-lg leading-relaxed text-smoke">
            {paragraphs(academy.body).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          {/*
            The arc goes above the facts rather than below them, because the
            counts in that table only read as an achievement once a reader has
            seen the roadside rooms they grew out of.
          */}
          <div className="mt-16">
            <Eyebrow>How it grew</Eyebrow>
            <SectionTitle className="mt-4">
              From iron sheet on the roadside to a school
            </SectionTitle>
            <PhotoStrip photos={growth} className="mt-10" />
          </div>

          <div className="mt-20">
            <Eyebrow>Where it stands</Eyebrow>
            <SectionTitle className="mt-4">The compound today</SectionTitle>
            <PhotoStrip photos={school} className="mt-10" />
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
                  The details below are still blank, so a donor reading this
                  page cannot see them. Fill them in and they join the table
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

          <div className="mt-20">
            <Eyebrow>Inside the school</Eyebrow>
            <SectionTitle className="mt-4">
              What a semi-permanent classroom looks like
            </SectionTitle>
            <PhotoStrip photos={inside} className="mt-10" />
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

      {/*
        The one thing this page was missing. Everything above it is a case for
        the school — the classrooms, the graduating class, how it grew — read
        mostly by two sorts of visitor: a donor, who has the giving page to go
        to, and a parent in Kahawa Sukari, who until now had nowhere at all. The
        form
        goes at the foot rather than in the hero because a parent who has just
        arrived is not ready to ask; one who has read this far is.
      */}
      <section className="relative bg-sand px-6 py-20 sm:py-24">
        <ClothEdge className="text-sand" />

        <div className="shell">
          <div className="mx-auto max-w-2xl">
            <Eyebrow>Admissions</Eyebrow>
            <SectionTitle className="mt-4">Ask about a place</SectionTitle>
            <p className="mt-6 leading-relaxed text-smoke">
              There is no form to download and no fee to ask. Tell us a little
              about your child and we will write back — and the best thing after
              that is to come and see the school on any ordinary school day.
            </p>

            <div className="mt-10 rounded-2xl bg-white p-8 shadow-warm sm:p-10">
              <EnrolmentEnquiryForm email={siteDetails.email} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
