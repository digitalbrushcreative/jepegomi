import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { JepegomiLogo } from "@/components/logos";
import { PhotoBand, PhotoStrip } from "@/components/photos";
import {
  ButtonLink,
  Eyebrow,
  Placeholder,
  SectionTitle,
} from "@/components/ui";
import { site } from "@/lib/site";

const sanctuary = {
  src: "/photos/church/sanctuary-wide.jpg",
  alt: "The semi-permanent sanctuary — a long iron-sheet building with a green roof and a cross above the door",
};

const life = [
  {
    src: "/photos/church/congregation.jpg",
    alt: "A full congregation seated on white plastic chairs under the sanctuary's timber roof trusses",
    caption: "A Sunday service, under the roof the church has now.",
  },
  {
    src: "/photos/church/service.jpg",
    alt: "A man standing at a lectern reading to rows of seated children",
    caption:
      "The pupils' service — one of the many uses the sanctuary is put to.",
  },
  {
    src: "/photos/church/building.jpg",
    alt: "Two men standing behind a stone foundation wall set with upright timber posts",
    caption: "Ground broken, and the first posts up.",
  },
];

/*
  The ground the ministry stands on — the gate people arrive through, the yard
  the children play in, and the empty plot the permanent sanctuary is meant for.
*/
const property = [
  {
    src: "/photos/church/signage.jpg",
    alt: "A weathered painted wall reading Jepegomi Family Church and Jepegomi Academy, Quality Education with Values, beneath a hand-lettered board",
    caption:
      "The sign at the gate — hand-painted, and long overdue a facelift.",
  },
  {
    src: "/photos/church/playground.jpg",
    alt: "The sanctuary's green roof and red walls behind a swing frame and a see-saw on bare ground",
    caption: "The yard between the sanctuary and the classrooms.",
  },
  {
    src: "/photos/church/plot.jpg",
    alt: "A cleared plot of bare ground enclosed by a stone perimeter wall, houses beyond it",
    caption: "The plot the permanent sanctuary is meant for.",
  },
];

export const metadata: Metadata = {
  title: "Church",
  description:
    "Sunday services at Jesus People Gospel Ministries — the church in Kahawa Sukari, Nairobi that the academy, the college and the feeding program all belong to.",
};

export default async function ChurchPage() {
  const church = await getContent("church");

  /*
    The church wears the Jepegomi mark rather than one of its own, because it is
    not an arm of the ministry so much as the ministry itself — the academy, the
    college and the program are what it does.
  */
  return (
    <>
      <section className="bg-plum-deep px-6 pt-28 pb-20">
        <div className="shell">
          <JepegomiLogo
            variant="mono"
            title={site.longName}
            className="h-20 w-auto text-white"
          />
          <p className="eyebrow mt-8 text-white/45">{church.eyebrow}</p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            {church.heading}
          </h1>
          {paragraphs(church.intro).map((text) => (
            <p
              key={text}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65"
            >
              {text}
            </p>
          ))}
        </div>
      </section>

      {/* The building itself, between the plum banner and the words about it. */}
      <PhotoBand photo={sanctuary} aspect="aspect-[21/9]" className="pt-16" />

      <section className="px-6 py-24">
        <div className="shell">
          <Eyebrow>{church.sectionEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">{church.sectionTitle}</SectionTitle>
          <div className="mt-8 max-w-3xl space-y-6 text-lg leading-relaxed text-smoke">
            {paragraphs(church.body).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

          <PhotoStrip photos={life} className="mt-12" />

          {/*
            A service time is the one thing a stranger comes to a church website
            for. So it is either real or it is visibly absent — there is no
            middle setting where the page quietly implies a Sunday morning that
            nobody has confirmed, and somebody drives to a locked gate.
          */}
          {church.services.length > 0 ? (
            <dl className="mt-12 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8 sm:grid-cols-2">
              {church.services.map((service) => (
                <div key={service.name + service.time} className="bg-white p-6">
                  <dt className="eyebrow text-plum">{service.name}</dt>
                  <dd className="mt-2 font-medium">{service.time}</dd>
                  {service.detail && (
                    <dd className="mt-1 text-sm leading-relaxed text-smoke">
                      {service.detail}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-12 rounded border border-dashed border-smoke/30 bg-sand p-8">
              <Eyebrow>Still to confirm</Eyebrow>
              <p className="mt-3 leading-relaxed text-smoke">
                Simon and Joyce still need to confirm when the services run
                before this page can invite anybody to one.
              </p>
              <ul className="mt-5 flex flex-wrap gap-3">
                <li>
                  <Placeholder>Service times</Placeholder>
                </li>
              </ul>
            </div>
          )}

          {church.address ? (
            <div className="mt-8 rounded border border-black/8 bg-white p-6">
              <p className="eyebrow text-plum">Where we meet</p>
              <p className="mt-2 leading-relaxed">{church.address}</p>
            </div>
          ) : null}

          {/*
            The property, and the one thing on it that is visibly asking for
            help. The sign is the first thing anybody sees and the cheapest
            thing on this site to put right — but there is no costing for it
            yet, so it is named without a figure. A guessed number here would
            be the only unaudited money on a site whose whole argument is that
            its figures are real.
          */}
          <div className="mt-20">
            <Eyebrow>The property</Eyebrow>
            <SectionTitle className="mt-4">
              A gate, a yard, and a plot waiting for a sanctuary
            </SectionTitle>

            <PhotoStrip photos={property} className="mt-10" />

            <div className="mt-8 rounded border border-dashed border-smoke/30 bg-sand p-8">
              <Eyebrow>Still to cost</Eyebrow>
              <p className="mt-3 max-w-2xl leading-relaxed text-smoke">
                The sign at the gate has been out in the weather for years and
                needs repainting — the first impression the ministry makes on
                anybody walking past. Simon still needs to get a price for the
                work before it can be put in front of anybody as an ask.
              </p>
              <ul className="mt-5 flex flex-wrap gap-3">
                <li>
                  <Placeholder>Cost of the signage facelift</Placeholder>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <ButtonLink href="/about" variant="secondary">
              About the ministry
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost" className="text-plum">
              Get in touch
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
