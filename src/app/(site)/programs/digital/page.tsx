import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Icon } from "@/components/icons";
import { JepegomiLogo } from "@/components/logos";
import { PhotoStrip } from "@/components/photos";
import {
  ButtonLink,
  Eyebrow,
  Placeholder,
  SectionTitle,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Jepegomi Digital",
  description:
    "Sunday services and weekday fellowships from Kahawa, streamed on YouTube and Facebook — and what it takes to keep them going out.",
};

const streams = [
  {
    src: "/photos/digital/preaching.jpg",
    alt: "Pastor Simon Nderitu preaching from a lectern with an open Bible, a projector screen beside him reading Preaching the Gospel in Kenya and Beyond",
    caption: "A message going out from the sanctuary at Kahawa.",
  },
  {
    src: "/photos/digital/teaching.jpg",
    alt: "Joyce Nderitu speaking to camera in front of draped yellow and lilac curtains",
    caption: "Joyce teaching — one of the weekday recordings.",
  },
];

export default async function DigitalPage() {
  const digital = await getContent("digital");

  /*
    A channel with no address is still worth naming — "Jepegomi Africa" is
    searchable, and a reader who wants it can find it. What the page will not do
    is invent the link. See the note on `youtubeUrl` in the CMS schema.
  */
  const channels = [
    { label: "YouTube", url: digital.youtubeUrl, icon: "globe" as const },
    { label: "Facebook", url: digital.facebookUrl, icon: "globe" as const },
  ];
  const live = channels.filter((channel) => channel.url !== "");
  const missing = channels.filter((channel) => channel.url === "");

  return (
    <>
      <section className="bg-charcoal px-6 pt-28 pb-20">
        <div className="shell">
          <JepegomiLogo
            variant="mono"
            title="Jepegomi Digital"
            className="h-20 w-auto text-white"
          />
          <p className="eyebrow mt-8 text-white/45">{digital.eyebrow}</p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            {digital.heading}
          </h1>
          {paragraphs(digital.intro).map((text) => (
            <p
              key={text}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65"
            >
              {text}
            </p>
          ))}
        </div>
      </section>

      <section className="px-6 pt-16">
        <div className="shell">
          <PhotoStrip photos={streams} />
        </div>
      </section>

      <div className="divide-y divide-sand">
        {digital.sections.map((section) => (
          <section key={section.eyebrow} className="px-6 py-20">
            <div className="shell grid gap-8 md:grid-cols-[220px_1fr]">
              <Eyebrow className="md:pt-2">{section.eyebrow}</Eyebrow>
              <div>
                <SectionTitle>{section.title}</SectionTitle>
                {paragraphs(section.body).map((text) => (
                  <p
                    key={text}
                    className="mt-5 max-w-2xl text-lg leading-relaxed text-smoke"
                  >
                    {text}
                  </p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Where to watch. */}
      <section className="bg-sand px-6 py-20">
        <div className="shell">
          <Eyebrow>Where to watch</Eyebrow>
          <SectionTitle className="mt-4">
            The channel is called {digital.youtubeName}
          </SectionTitle>

          {live.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-4">
              {live.map((channel) => (
                <ButtonLink
                  key={channel.label}
                  href={channel.url}
                  variant="secondary"
                  icon={channel.icon}
                >
                  Watch on {channel.label}
                </ButtonLink>
              ))}
            </div>
          )}

          {/*
            The same bargain the Academy and the college pages strike: an
            unconfirmed fact is shown as unconfirmed rather than guessed at. A
            wrong link here does not merely fail — it sends somebody to a
            stranger's channel with this ministry's name attached.
          */}
          {missing.length > 0 && (
            <div className="mt-8 rounded border border-dashed border-smoke/30 bg-white p-8">
              <Eyebrow>Still to confirm</Eyebrow>
              <p className="mt-3 max-w-2xl leading-relaxed text-smoke">
                Search {digital.youtubeName} and you will find the messages. The
                exact addresses below still need to come from Simon, and this
                page would rather say so than send you somewhere wrong.
              </p>
              <ul className="mt-5 flex flex-wrap gap-3">
                {missing.map((channel) => (
                  <li key={channel.label}>
                    <Placeholder>{channel.label} link</Placeholder>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* How to support. */}
      <section className="px-6 py-24">
        <div className="shell">
          <Eyebrow>{digital.supportEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">
            {digital.supportHeading}
          </SectionTitle>
          {paragraphs(digital.supportIntro).map((text) => (
            <p
              key={text}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-smoke"
            >
              {text}
            </p>
          ))}

          <ul className="mt-12 grid gap-6 sm:grid-cols-2">
            {digital.support.map((way) => (
              <li
                key={way.title}
                className="rounded-2xl bg-white p-7 shadow-warm"
              >
                <Icon name="give" className="h-8 w-8 text-plum" />
                <h3 className="font-display mt-4 text-xl font-semibold">
                  {way.title}
                </h3>
                {paragraphs(way.body).map((text) => (
                  <p key={text} className="mt-3 leading-relaxed text-smoke">
                    {text}
                  </p>
                ))}
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-wrap gap-4">
            <ButtonLink href="/give" icon="give">
              Give
            </ButtonLink>
            <ButtonLink href="/church" variant="ghost" className="text-plum">
              The church behind it
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
