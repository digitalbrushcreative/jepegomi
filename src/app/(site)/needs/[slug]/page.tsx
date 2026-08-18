import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { GivePanel } from "@/components/give-panel";
import { Icon } from "@/components/icons";
import { Money } from "@/components/money";
import { NeedMeter } from "@/components/need-meter";
import { NeedUpdates } from "@/components/need-updates";
import { ButtonLink, PageHero, SectionTitle } from "@/components/ui";
import { areaOf } from "@/lib/giving";
import { getNeedBySlug, getNeedUpdates } from "@/lib/needs";
import { isPesapalConfigured } from "@/lib/pesapal";
import { pageMeta } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const need = await getNeedBySlug(slug);

  if (!need) return { title: "Not found" };

  /*
    No figures in the fallback description, and that is the point of the change
    rather than an oversight. A meta description is served to anybody who asks
    for the page and reprinted verbatim in search results and link previews —
    which would have made it the one place on the site where the ledger stayed
    public after everything else went behind the door, and the easiest place of
    all to scrape.
  */
  return pageMeta({
    title: need.title,
    description:
      need.summary ||
      `One of the costed items the ministry is asking for. Sign in to see what it comes to and how much of it is still open.`,
    path: `/needs/${need.slug}`,
  });
}

/**
 * The right-hand card: the figures, and the way to act on them.
 *
 * Which of the two it leads with depends entirely on whether there is anything
 * left to give. A fully claimed item showing a form is a page that wastes
 * somebody's afternoon, so it shows the thanks and points at the list instead.
 */
function ClaimPanel({
  need,
  contactEmail,
}: {
  need: NonNullable<Awaited<ReturnType<typeof getNeedBySlug>>>;
  contactEmail: string;
}) {
  const settled = need.closed || need.ledger.openCents === 0;
  const area = areaOf(need.area);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-warm-lg">
      <div className="border-b border-sand-deep bg-sand px-8 py-7">
        <NeedMeter ledger={need.ledger} closed={need.closed} />
      </div>

      <div className="px-8 py-8">
        {settled ? (
          <div className="text-center">
            <Icon name="give" className="mx-auto h-12 w-12 text-green" />
            <p className="font-display mt-5 text-2xl font-semibold">
              {need.closed ? "This one is done" : "Fully claimed"}
            </p>
            <p className="mt-3 leading-relaxed text-smoke">
              {need.closed
                ? "The work on this is finished. Thank you to everyone who put money towards it."
                : "Every part of this has been claimed. Nothing more is needed here — but there are other things that still are."}
            </p>
            <ButtonLink href="/needs" variant="secondary" className="mt-7">
              See what else is needed
            </ButtonLink>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold">
              Take part of this
            </h2>
            <p className="mt-2 mb-7 leading-relaxed text-smoke">
              Any amount up to <Money cents={need.ledger.openCents} />.
            </p>
            {/*
              The same form /give uses, with the choosing already done: this
              page is *about* one item, so it hands the form that one item and
              the picker never appears.
            */}
            <GivePanel
              fixed
              choices={[
                {
                  value: need.slug,
                  title: need.title,
                  areaLabel: area.label,
                  openCents: need.ledger.openCents,
                  costCents: need.costCents,
                  isItem: true,
                },
              ]}
              contactEmail={contactEmail}
              canPay={isPesapalConfigured()}
            />
          </>
        )}
      </div>
    </div>
  );
}

async function NeedBody({ params }: { params: Params }) {
  const { slug } = await params;

  const [need, updates, site] = await Promise.all([
    getNeedBySlug(slug),
    getNeedUpdates(slug),
    getContent("site"),
  ]);

  if (!need) notFound();

  const area = areaOf(need.area);

  return (
    <>
      <PageHero eyebrow={area.label} title={need.title} intro={need.summary}>
        <p className="mt-8">
          <Link
            href="/needs"
            className="text-sm font-bold text-marigold underline underline-offset-4 hover:text-marigold-light"
          >
            ← Everything that&apos;s needed
          </Link>
        </p>
      </PageHero>

      <section className="px-6 py-20 sm:py-24">
        <div className="shell grid items-start gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div>
            {need.detail ? (
              paragraphs(need.detail).map((text) => (
                <p key={text} className="mb-5 leading-relaxed text-smoke">
                  {text}
                </p>
              ))
            ) : (
              <p className="leading-relaxed text-smoke">
                This is one of the things the ministry is short of. The figures
                beside it are the whole of what we know — what it costs, what has
                been given towards it, and what is left.
              </p>
            )}

            <p className="mt-8">
              <Link
                href={area.href}
                className="inline-flex items-center gap-2.5 text-sm font-bold text-plum"
              >
                <Icon name={area.icon} className="h-5 w-5" />
                About {area.label.toLowerCase()}
                <span aria-hidden="true">→</span>
              </Link>
            </p>

            <div className="mt-16">
              <SectionTitle className="mt-3">What has happened so far</SectionTitle>
              <div className="mt-10">
                <NeedUpdates updates={updates} />
              </div>
            </div>
          </div>

          {/* Sticky so the figures and the form stay with the reader through a
              long list of updates — the ask should never scroll away. */}
          <div className="lg:sticky lg:top-8">
            <ClaimPanel need={need} contactEmail={site.email} />
          </div>
        </div>
      </section>
    </>
  );
}

function Loading() {
  return (
    <div className="px-6 py-32">
      <div className="shell">
        <p className="text-smoke">Loading…</p>
      </div>
    </div>
  );
}

/*
  The slug is runtime data, so everything that depends on it streams in behind a
  boundary rather than blocking the shell. There is no generateStaticParams here
  on purpose: the set of needs is not known at build time and grows whenever
  Simon adds one, and a build-time list would quietly serve a stale page for
  every need created after the last deploy.
*/
export default function NeedPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Loading />}>
      <NeedBody params={params} />
    </Suspense>
  );
}
