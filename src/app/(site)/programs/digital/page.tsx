import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { EditorOnly } from "@/components/editor-only";
import { Icon } from "@/components/icons";
import { JepegomiLogo } from "@/components/logos";
import { PhotoStrip } from "@/components/photos";
import {
  ButtonLink,
  Eyebrow,
  Placeholder,
  SectionTitle,
} from "@/components/ui";
import { LatestVideos } from "@/components/videos";
import { latestVideos } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Jepegomi Digital",
  description:
    "Sunday services and weekday fellowships from Kahawa Sukari, streamed on YouTube and Facebook — and what it takes to keep them going out.",
};

/*
  The one photograph of the work itself rather than of what the work films. It
  is in the hero because everything the page goes on to ask for — a laptop that
  can edit, a camera, a light, a connection that holds — is visible in it.
*/
const stream = {
  src: "/photos/digital/streaming-desk.jpg",
  alt: "A laptop running OBS Studio on a stand at the back of the church, its screen showing the live sermon being mixed, while Pastor Simon preaches from the pulpit behind it",
};

const streams = [
  {
    src: "/photos/digital/preaching.jpg",
    alt: "Pastor Simon Nderitu preaching from a lectern with an open Bible, a projector screen beside him reading Preaching the Gospel in Kenya and Beyond",
    caption: "A message going out from the sanctuary at Kahawa Sukari.",
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
    The channel's own recent uploads, read from YouTube's public feed. Empty
    until the address is in the CMS, and empty again if the feed will not answer
    — the section below simply goes back to being a heading and two buttons. See
    lib/youtube.ts.
  */
  const videos = await latestVideos(digital.youtubeUrl);

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
        <div className="shell grid items-center gap-12 lg:grid-cols-[1fr_20rem]">
          <div>
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

          {/*
            The photograph that explains the page in one look: the whole studio
            is a laptop on a stand at the back of the church, and the service it
            is mixing is happening ten feet in front of it.

            Portrait, and given a portrait frame rather than being cropped into
            a band — the preacher is at the top of the shot and the desk is at
            the bottom, so any wide crop of it loses one or the other.
          */}
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-white/5 shadow-warm lg:mx-0">
            <Image
              src={stream.src}
              alt={stream.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 320px"
              priority
              className="object-cover"
            />
          </div>
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

          {videos.length > 0 && (
            <>
              <p className="mt-6 max-w-2xl leading-relaxed text-smoke">
                The most recent messages, straight from the channel. Nothing
                loads from YouTube until you press play.
              </p>
              <div className="mt-8">
                <LatestVideos videos={videos} />
              </div>
            </>
          )}

          {live.length > 0 && (
            <div
              className={`flex flex-wrap gap-4 ${videos.length > 0 ? "mt-12" : "mt-8"}`}
            >
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
            The same bargain the Academy and the college pages strike: a link
            nobody has confirmed is left off rather than guessed at, because a
            wrong one here does not merely fail — it sends somebody to a
            stranger's channel with this ministry's name attached. The reminder
            to go and get it is for the editor who can, and nobody else. See
            components/editor-only.tsx.
          */}
          {missing.length > 0 && (
            <EditorOnly>
              <div className="mt-8 rounded border border-dashed border-smoke/30 bg-white p-8">
                <Eyebrow>Still to confirm</Eyebrow>
                {/*
                  Written for whichever is still missing rather than for both,
                  because the YouTube channel is now confirmed and on the page
                  above.
                */}
                <p className="mt-3 max-w-2xl leading-relaxed text-smoke">
                  {missing.length === 1
                    ? "The address below is still missing, so the page offers no way to watch there."
                    : "The addresses below are still missing, so the page offers no way to watch there."}{" "}
                  Add the real one and the button appears. Only you see this
                  note.
                </p>
                <ul className="mt-5 flex flex-wrap gap-3">
                  {missing.map((channel) => (
                    <li key={channel.label}>
                      <Placeholder>{channel.label} link</Placeholder>
                    </li>
                  ))}
                </ul>
              </div>
            </EditorOnly>
          )}
        </div>
      </section>

      {/* How to support. */}
      <section className="px-6 py-24">
        <div className="shell">
          <Eyebrow>{digital.supportEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">{digital.supportHeading}</SectionTitle>
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
