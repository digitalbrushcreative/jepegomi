import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Icon } from "@/components/icons";
import { NeedMeter } from "@/components/need-meter";
import { ClothEdge } from "@/components/pattern";
import { ButtonLink, PageHero, SectionTitle } from "@/components/ui";
import { usd } from "@/lib/money";
import { type NeedWithLedger, areaOf } from "@/lib/giving";
import { getPublishedNeeds } from "@/lib/needs";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent("needs");
  return {
    title: content.heading,
    description: paragraphs(content.intro)[0],
  };
}

/**
 * A need, as a card in the list.
 *
 * The card leads with the meter rather than with the words, which is the wrong
 * way round for almost any other card on this site and the right way round
 * here: somebody scanning this page is looking for the thing they can finish,
 * and the number that answers that is "still open".
 */
function NeedCard({ need }: { need: NeedWithLedger }) {
  const area = areaOf(need.area);
  const settled = need.closed || need.ledger.openCents === 0;

  return (
    <Link
      href={`/needs/${need.slug}`}
      className={`group flex flex-col rounded-2xl bg-white p-8 shadow-warm transition-all hover:-translate-y-1 hover:shadow-warm-lg ${
        settled ? "opacity-75 hover:opacity-100" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <Icon
          name={area.icon}
          className="h-9 w-9 shrink-0 text-plum transition-transform group-hover:scale-110"
        />
        <span className="eyebrow rounded-full bg-sand px-3 py-1.5 text-smoke">
          {area.label}
        </span>
      </div>

      <h3 className="font-display mt-5 text-2xl leading-snug font-semibold text-balance">
        {need.title}
      </h3>
      {need.summary && (
        <p className="mt-3 flex-1 leading-relaxed text-smoke">{need.summary}</p>
      )}

      <NeedMeter ledger={need.ledger} closed={need.closed} className="mt-7" />

      <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-plum">
        {settled ? "See what it paid for" : "Choose an amount"}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}

export default async function NeedsPage() {
  const [content, site, needs] = await Promise.all([
    getContent("needs"),
    getContent("site"),
    getPublishedNeeds(),
  ]);

  const open = needs.filter((need) => !need.closed && need.ledger.openCents > 0);
  const covered = needs.filter((need) => need.closed || need.ledger.openCents === 0);
  const stillNeeded = open.reduce((sum, need) => sum + need.ledger.openCents, 0);

  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.heading}
        intro={paragraphs(content.intro)[0]}
      >
        {/*
          The total is in the hero because it is the one figure that decides
          whether somebody reads any further — and because a list of nine items
          with no sum at the top makes a reader do the arithmetic themselves.
        */}
        {open.length > 0 && (
          <dl className="mt-12 flex flex-wrap gap-x-14 gap-y-6">
            <div>
              <dt className="eyebrow text-white/50">Still open</dt>
              <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-marigold">
                {usd(stillNeeded)}
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-white/50">
                {open.length === 1 ? "Item" : "Items"} waiting
              </dt>
              <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-white">
                {open.length}
              </dd>
            </div>
            {covered.length > 0 && (
              <div>
                <dt className="eyebrow text-white/50">Fully covered</dt>
                <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-white">
                  {covered.length}
                </dd>
              </div>
            )}
          </dl>
        )}
      </PageHero>

      <section className="px-6 py-20 sm:py-24">
        <div className="shell">
          {paragraphs(content.intro)
            .slice(1)
            .map((text) => (
              <p key={text} className="max-w-2xl leading-relaxed text-smoke">
                {text}
              </p>
            ))}

          {needs.length === 0 ? (
            /*
              Not an error state. The database being empty and the database
              being unreachable look the same from here, and in both cases the
              honest thing to show a would-be giver is the same sentence.
            */
            <div className="mt-10 max-w-2xl rounded-2xl border border-dashed border-smoke/30 bg-sand p-8">
              {paragraphs(content.emptyNote).map((text) => (
                <p key={text} className="leading-relaxed text-smoke">
                  {text}
                </p>
              ))}
              <ButtonLink href="/give" variant="secondary" className="mt-7">
                About giving
              </ButtonLink>
            </div>
          ) : (
            <>
              {open.length > 0 && (
                <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {open.map((need) => (
                    <NeedCard key={need.id} need={need} />
                  ))}
                </div>
              )}

              {covered.length > 0 && (
                <div className="mt-20">
                  <p className="eyebrow text-plum">Already covered</p>
                  <SectionTitle className="mt-3">
                    Paid for, and being done
                  </SectionTitle>
                  <p className="mt-5 max-w-2xl leading-relaxed text-smoke">
                    These are closed to new giving. They stay on the page because
                    the point of showing you the ledger is showing you all of it.
                  </p>

                  <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {covered.map((need) => (
                      <NeedCard key={need.id} need={need} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-plum-deep px-6 py-20 sm:py-24">
        <div className="grain-layer" />
        <ClothEdge className="text-plum-deep" />

        <div className="shell relative">
          <p className="eyebrow text-marigold">{content.howEyebrow}</p>
          <SectionTitle className="mt-3 text-white">
            {content.howHeading}
          </SectionTitle>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
            {content.steps.map((step, index) => (
              <li key={step.title} className="bg-plum-deep p-8">
                <span className="font-display tabular text-3xl font-semibold text-marigold">
                  {index + 1}
                </span>
                <h3 className="font-display mt-4 text-xl font-semibold text-white">
                  {step.title}
                </h3>
                {paragraphs(step.body).map((text) => (
                  <p key={text} className="mt-3 text-sm leading-relaxed text-white/60">
                    {text}
                  </p>
                ))}
              </li>
            ))}
          </ol>

          <div className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-6 border-t border-white/15 pt-10">
            <div className="max-w-xl">
              <p className="eyebrow text-marigold">For partner churches</p>
              {paragraphs(content.partnerNote).map((text) => (
                <p key={text} className="mt-3 leading-relaxed text-white/65">
                  {text}
                </p>
              ))}
            </div>
            <ButtonLink href="/partners" variant="ghost" className="text-white">
              Partner sign in
            </ButtonLink>
          </div>

          <p className="mt-10 text-sm text-white/45">
            Questions about any of this?{" "}
            <a
              href={`mailto:${site.email}`}
              className="underline underline-offset-4 hover:text-white"
            >
              {site.email}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
