import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { JepegomiLogo } from "@/components/logos";
import { ButtonLink, Eyebrow, Placeholder, SectionTitle } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Church",
  description:
    "Sunday services at Jesus People Gospel Ministries — the church in Kahawa, Nairobi that the academy, the college and the feeding program all belong to.",
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

      <section className="px-6 py-24">
        <div className="shell">
          <Eyebrow>{church.sectionEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">{church.sectionTitle}</SectionTitle>
          <div className="mt-8 max-w-3xl space-y-6 text-lg leading-relaxed text-smoke">
            {paragraphs(church.body).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>

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
