import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Icon, type IconName } from "@/components/icons";
import { ClothEdge } from "@/components/pattern";
import { ButtonLink, PageHero, SectionTitle, buttonClass } from "@/components/ui";
import { usd } from "@/lib/money";
import { getGivingSummary } from "@/lib/needs";
import { giving as givingLinks } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const [content, details] = await Promise.all([
    getContent("giving"),
    getContent("site"),
  ]);
  return {
    title: "Give",
    description: `Support ${details.longName} in ${details.location} — ${paragraphs(content.intro)[0]}`,
  };
}

/*
  Which icon sits on which card is design, not content — so it is decided here
  by position rather than being a field an editor has to fill in. An area added
  in the CMS beyond this list simply gets no icon; the card still reads.
*/
const wayIcons: IconName[] = ["church", "book", "child", "trowel"];

export default async function GivePage() {
  const [giving, site, ledger] = await Promise.all([
    getContent("giving"),
    getContent("site"),
    getGivingSummary(),
  ]);

  const mailto = `mailto:${site.email}?subject=${encodeURIComponent(givingLinks.subject)}`;

  return (
    <>
      <PageHero
        eyebrow={giving.eyebrow}
        title={giving.heading}
        intro={giving.intro}
      />

      <section className="px-6 py-20 sm:py-24">
        <div className="shell">
          <p className="eyebrow text-plum">{giving.waysEyebrow}</p>
          <SectionTitle className="mt-3">{giving.waysHeading}</SectionTitle>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {giving.ways.map((way, index) => (
              <div
                key={way.title}
                className="flex flex-col rounded-2xl bg-white p-8 shadow-warm"
              >
                {wayIcons[index] && (
                  <Icon name={wayIcons[index]} className="h-9 w-9 text-plum" />
                )}
                <h3 className="font-display mt-5 text-2xl font-semibold">
                  {way.title}
                </h3>
                {paragraphs(way.body).map((text) => (
                  <p key={text} className="mt-3 leading-relaxed text-smoke">
                    {text}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        The other way to give: not "wherever it is needed most" but one costed
        item with a price on it.

        This sits between the four areas and the ask because it is the more
        specific of the two and the more specific one should come second — a
        reader who has just been told the ministry has four arms is ready to be
        told that one of them needs a water tank, and not the other way round.
        The section is absent entirely when nothing is listed, so the page never
        promises a list it cannot show.
      */}
      {ledger.openCount > 0 && (
        <section className="relative bg-sand px-6 py-20 sm:py-24">
          <ClothEdge className="text-sand" />

          <div className="shell">
            <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
              <div>
                <p className="eyebrow text-plum">Transparent giving</p>
                <SectionTitle className="mt-3">
                  Or pick something, and see it through
                </SectionTitle>
                <p className="mt-6 max-w-xl leading-relaxed text-smoke">
                  Every item on the list is one thing the ministry is short of,
                  with the price on it and the ledger beside it. Take all of one
                  or part of one — whatever you leave stays open for somebody
                  else — and then watch the work it paid for, in photographs.
                </p>
                <ButtonLink href="/needs" icon="give" className="mt-8">
                  See what&apos;s needed
                </ButtonLink>
              </div>

              <dl className="grid gap-px overflow-hidden rounded-2xl bg-sand-deep sm:grid-cols-2 lg:grid-cols-1">
                <div className="bg-white px-8 py-7">
                  <dt className="eyebrow text-smoke">Still open</dt>
                  <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-plum">
                    {usd(ledger.totalOpenCents)}
                  </dd>
                  <p className="mt-2 text-sm text-smoke">
                    across {ledger.openCount}{" "}
                    {ledger.openCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="bg-white px-8 py-7">
                  <dt className="eyebrow text-smoke">Received so far</dt>
                  <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-green">
                    {usd(ledger.totalReceivedCents)}
                  </dd>
                  <p className="mt-2 text-sm text-smoke">
                    reconciled by hand, item by item
                  </p>
                </div>
              </dl>
            </div>
          </div>
        </section>
      )}

      {/*
        The ask itself. There is no account number on this page and there is not
        meant to be one: the details are sent by reply, to the person giving.
      */}
      <section className="relative overflow-hidden bg-plum-deep px-6 py-20 sm:py-24">
        <div className="grain-layer" />
        <ClothEdge className="text-plum-deep" />

        <div className="shell relative">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-marigold">{giving.howEyebrow}</p>
            <h2 className="font-display mt-4 text-3xl leading-[1.15] font-semibold text-balance text-white sm:text-[2.6rem]">
              {giving.howHeading}
            </h2>

            {paragraphs(giving.howBody).map((text) => (
              <p key={text} className="mt-5 leading-relaxed text-white/65">
                {text}
              </p>
            ))}

            <a href={mailto} className={buttonClass("primary", "mt-9")}>
              <Icon name="give" className="h-[1.15em] w-[1.15em]" />
              Email us about giving
            </a>

            <p className="mt-5 text-sm text-white/50">
              <a
                href={mailto}
                className="underline underline-offset-4 hover:text-white"
              >
                {site.email}
              </a>
            </p>

            <p className="mt-10 border-t border-white/15 pt-8 text-sm leading-relaxed text-white/55">
              {giving.designationNote}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
