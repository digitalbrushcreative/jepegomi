import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Icon } from "@/components/icons";
import { PhotoStrip } from "@/components/photos";
import { SchoolBus } from "@/components/school-bus";
import { ButtonLink, Eyebrow, SectionTitle } from "@/components/ui";
import { getKitchenReport } from "@/lib/kitchen";
import { busPrice, usd } from "@/lib/money";

export const metadata: Metadata = {
  title: "School Transport",
  description:
    "The Jepegomi Academy school van, the repair that is bringing it back, and the 26-seater bus the school is raising for.",
};

const vehicle = [
  {
    src: "/photos/transport/van.jpg",
    alt: "A yellow Toyota school van lettered Jepegomi Academy School, Kahawa, Church — parked on grass beside the church",
    caption: "The academy's van, lettered for the school.",
  },
  {
    src: "/photos/transport/van-off-road.jpg",
    alt: "The same yellow school van standing on grass at the edge of the school field, out of service",
    caption:
      "Standing since it broke down — the repair is what brings it back.",
  },
];

export default async function TransportPage() {
  const [transport, site, kitchen] = await Promise.all([
    getContent("transport"),
    getContent("site"),
    getKitchenReport(),
  ]);

  const bus = busPrice(transport.busPriceKes, site.kesPerUsd);

  /*
    One figure, because there is only one a stranger has any business reading:
    what a bus costs. A dealer's price is public and it is the thing the page is
    asking for.

    What used to sit beside it was "Held in the bank" and a percentage meter
    reading off it — a running statement of the cash this ministry had on hand,
    updating itself as gifts arrived. See the note on the bus fields in
    cms/schema.ts. A partner who has given toward the bus sees what has come in
    on their own dashboard, where the answer belongs.
  */
  const figures = [
    {
      value: usd(bus.usdCents),
      label: `A ${transport.busSeats}-seater bus`,
      detail: `${bus.shillings} — converted at today's rate, rounded`,
    },
  ];

  return (
    <>
      <section className="bg-charcoal px-6 pt-28 pb-20">
        <div className="shell">
          <Icon name="bus" className="h-16 w-16 text-marigold" />
          <p className="eyebrow mt-8 text-white/45">{transport.eyebrow}</p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            {transport.heading}
          </h1>
          {paragraphs(transport.intro).map((text) => (
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
          <PhotoStrip photos={vehicle} />

          {/*
            The van's money is not the appeal and must not be mistaken for it.
            The purchase and the repair are both money already given, for this
            vehicle, to a different end — so they get their own quiet note
            rather than figures in the row below, where they would read as
            progress toward the bus.
          */}
          <p className="mt-6 max-w-2xl leading-relaxed text-smoke">
            This van was bought with money{" "}
            <strong className="font-semibold text-charcoal">
              given toward a school vehicle
            </strong>
            , and {kitchen.donorTitled} has since given toward{" "}
            <strong className="font-semibold text-charcoal">
              repairing it and returning it to the road
            </strong>
            . Both gifts are for the van, not the bus, and neither is counted in
            the figure below.
          </p>
        </div>
      </section>

      <div className="divide-y divide-sand">
        {transport.sections.map((section) => (
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

      {/* The ask: the bus on one side, what it costs on the other. */}
      <section className="bg-sand px-6 py-20 sm:py-24">
        <div className="shell grid items-center gap-12 lg:grid-cols-[auto_1fr] lg:gap-16">
          {/*
            The bus faces left, so its back end runs into the figure panel. The
            negative margin is larger than the gap it is cancelling, which pulls
            the panel over the rear of the bus by the difference and lets it sit
            in front — the two read as one object rather than a picture next to
            a table. Side-by-side only; stacked, there is nothing to tuck under.
          */}
          {/*
            An empty bus, and it stays empty. The meter used to fill as money
            came in, which is a picture of a bank balance — see the note in
            the bus fields in cms/schema.ts.
          */}
          <div className="relative z-0 mx-auto w-full max-w-sm text-center lg:mr-[-5rem] lg:max-w-md">
            <SchoolBus percent={0} className="w-full" />
          </div>

          <dl className="relative z-10 grid gap-px overflow-hidden rounded-2xl bg-black/8 shadow-warm">
            {figures.map((figure) => (
              <div key={figure.label} className="bg-white p-7">
                <dt className="eyebrow text-plum">{figure.label}</dt>
                <dd className="font-display mt-3 text-3xl font-semibold">
                  {figure.value}
                </dd>
                <dd className="mt-2 text-sm leading-relaxed text-smoke">
                  {figure.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How to support. */}
      <section className="px-6 py-24">
        <div className="shell">
          <Eyebrow>{transport.supportEyebrow}</Eyebrow>
          <SectionTitle className="mt-4">
            {transport.supportHeading}
          </SectionTitle>
          {paragraphs(transport.supportIntro).map((text) => (
            <p
              key={text}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-smoke"
            >
              {text}
            </p>
          ))}

          <ul className="mt-12 grid gap-6 sm:grid-cols-3">
            {transport.support.map((way) => (
              <li
                key={way.title}
                className="rounded-2xl bg-white p-7 shadow-warm"
              >
                <Icon name="bus" className="h-8 w-8 text-plum" />
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
            <ButtonLink href="/academy" variant="ghost" className="text-plum">
              The school it serves
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
