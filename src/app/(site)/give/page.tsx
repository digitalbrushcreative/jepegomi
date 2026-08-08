import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Icon, type IconName } from "@/components/icons";
import { ClothEdge } from "@/components/pattern";
import { GivingDetailsForm } from "@/app/(site)/give/details-form";
import { GiveForm } from "@/components/give-form";
import { ButtonLink, PageHero, SectionTitle } from "@/components/ui";
import { areaOf } from "@/lib/giving";
import { usd } from "@/lib/money";
import { getGivingSummary, getPublishedNeeds } from "@/lib/needs";
import { isPesapalConfigured } from "@/lib/pesapal";

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
  const [giving, site, ledger, needs] = await Promise.all([
    getContent("giving"),
    getContent("site"),
    getGivingSummary(),
    getPublishedNeeds(),
  ]);

  /*
    Read once, and used by both the form and the words around it. Asking twice
    is how a page ends up promising that nothing is taken beside a button that
    takes it: two calls are two chances for one of them to be edited later.
  */
  const canPay = isPesapalConfigured();

  /*
    Only what somebody can actually still give to. A closed item, or one that is
    already fully claimed, is worth showing on /needs — that is a record of work
    being paid for — but on a form it is a door that does not open.
  */
  const choices = needs
    .filter((need) => !need.closed && need.ledger.openCents > 0)
    .map((need) => ({
      slug: need.slug,
      title: need.title,
      areaLabel: areaOf(need.area).label,
      openCents: need.ledger.openCents,
    }));

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
        The form.

        Everything above this point is the case for giving; this is the place to
        actually do it, and it comes before the plum band because "tell me how"
        is the fallback for somebody the form did not suit — not the main road.

        Its words are here rather than in the CMS on purpose, and for the same
        reason the section above's are: they describe how the thing works, and
        what it does changes with whether Pesapal is configured. Copy that
        promises "nothing is taken" sitting over a button that takes payment is
        not a wording slip, it is a broken promise — so these sentences follow
        `canPay` in code, where they cannot drift from the buttons. What Simon
        can change is the list itself, which is the part that is his.
      */}
      <section id="pledge" className="px-6 py-20 sm:py-24">
        <div className="shell grid items-start gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-8">
            <p className="eyebrow text-plum">Tell us what you would like to do</p>
            <SectionTitle className="mt-3">
              Put your name to something
            </SectionTitle>

            <p className="mt-6 leading-relaxed text-smoke">
              {choices.length > 0
                ? `Choose one of the costed items and take all of it or part of it, or tell us in your own words what you would like to support. ${
                    canPay
                      ? "Then pay it now by M-Pesa or card, or ask for the account details and send it another way."
                      : "Either way it goes on the ledger straight away, so the ministry knows to expect it."
                  }`
                : `There is nothing costed on the list at the moment, so tell us in your own words what you would like to support. ${
                    canPay
                      ? "You can pay it now by M-Pesa or card, or ask for the account details and send it another way."
                      : "It goes on the ledger straight away, so the ministry knows to expect it."
                  }`}
            </p>

            <ul className="mt-8 space-y-4 text-sm leading-relaxed text-smoke">
              <li className="flex gap-3">
                <Icon name="give" className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                <span>
                  {canPay ? (
                    <>
                      <strong className="font-medium text-charcoal">
                        Two ways, and both are fine.
                      </strong>{" "}
                      Pay now by M-Pesa or card and it is done in a minute — your
                      card details are entered on Pesapal&apos;s own page, never
                      here. Or record what you intend to give and Pastor Simon
                      sends you the account details for wherever you are giving
                      from, which suits a bank transfer better.
                    </>
                  ) : (
                    <>
                      <strong className="font-medium text-charcoal">
                        Nothing is taken here.
                      </strong>{" "}
                      No card details are asked for. This records what you intend
                      to give and sends you the account details for wherever you
                      are giving from.
                    </>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="give" className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                <span>
                  <strong className="font-medium text-charcoal">
                    A part is a real answer.
                  </strong>{" "}
                  Whatever you leave on an item stays open for somebody else, and
                  the page says so honestly.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="give" className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                <span>
                  <strong className="font-medium text-charcoal">
                    You will see what it did.
                  </strong>{" "}
                  Gifts against an item are followed up with progress and
                  photographs as the work goes on.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-warm-lg sm:p-9">
            <GiveForm
              choices={choices}
              contactEmail={site.email}
              canPay={canPay}
            />
          </div>
        </div>
      </section>

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

            {/*
              This was a `mailto:` and nothing else, which asks a visitor to
              have a mail client set up, to compose from a blank page, and to
              know what to write. The form asks for one thing and sends the
              details itself; the address stays inside it for anyone who would
              still rather use their own mail.
            */}
            <GivingDetailsForm email={site.email} />

            <p className="mt-10 border-t border-white/15 pt-8 text-sm leading-relaxed text-white/55">
              {giving.designationNote}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
