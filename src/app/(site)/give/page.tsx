import type { Metadata } from "next";
import { Suspense } from "react";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Icon, type IconName } from "@/components/icons";
import { ClothEdge } from "@/components/pattern";
import { GivingDetailsForm } from "@/app/(site)/give/details-form";
import type { GiveChoice } from "@/components/give-form";
import { GivePanel } from "@/components/give-panel";
import { Money } from "@/components/money";
import { ButtonLink, PageHero, SectionTitle, Verse } from "@/components/ui";
import { isNeedArea, projectValue } from "@/lib/giving";
import {
  getGivingSummary,
  getParts,
  getProjects,
  getPublishedNeeds,
} from "@/lib/needs";
import { buildProjects, projectTitle, readyParts } from "@/lib/projects";
import { isPesapalConfigured } from "@/lib/pesapal";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [content, details] = await Promise.all([
    getContent("giving"),
    getContent("site"),
  ]);
  return pageMeta({
    title: "Give",
    description: `Support ${details.longName} in ${details.location} — ${paragraphs(content.intro)[0]}`,
    path: "/give",
  });
}

/*
  Which icon sits on which card is design, not content — so it is decided here
  by position rather than being a field an editor has to fill in. An area added
  in the CMS beyond this list simply gets no icon; the card still reads.
*/
const wayIcons: IconName[] = ["church", "book", "child", "trowel"];

/**
 * The form, once the address bar has been read.
 *
 * `?for=` is how a project page hands its own project over — "Give to the
 * playground" should not open a form that asks which. Reading a search
 * parameter makes this part of the page dynamic, so it streams in behind a
 * boundary and the case for giving above it stays prerendered; the same shape
 * /needs/[slug] uses for its slug.
 */
async function Pledge({
  searchParams,
  choices,
  contactEmail,
  canPay,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  choices: GiveChoice[];
  contactEmail: string;
  canPay: boolean;
}) {
  const asked = (await searchParams).for;
  const project =
    typeof asked === "string" && isNeedArea(asked) ? projectValue(asked) : "";

  return (
    <GivePanel
      choices={choices}
      initialTowards={project}
      contactEmail={contactEmail}
      canPay={canPay}
    />
  );
}

export default async function GivePage(props: PageProps<"/give">) {
  const [giving, site, ledger, needs, parts, allProjects] = await Promise.all([
    getContent("giving"),
    getContent("site"),
    getGivingSummary(),
    getPublishedNeeds(),
    getParts(),
    getProjects(),
  ]);

  /* Published only, for the reason set out on /needs. */
  const projectRows = allProjects.filter((project) => project.published);

  /*
    Read once, and used by both the form and the words around it. Asking twice
    is how a page ends up promising that nothing is taken beside a button that
    takes it: two calls are two chances for one of them to be edited later.
  */
  const canPay = isPesapalConfigured();

  /*
    Only what somebody can actually still give to, in the order the work has to
    be done in.

    Three filters, and each one is a door that does not open. A closed item or a
    fully claimed one is worth showing on /needs — that is the record of work
    being paid for — but on a form it is a dead radio button. And a part of the
    build that is waiting on an earlier part is not an ask yet: offering the
    paint while the walls are still an open line takes real money for something
    that cannot be bought for months. Those stay on /needs too, listed under
    what they are waiting for, so nothing is hidden — it is simply not being
    asked for today. The rule itself lives in lib/projects.ts.

    Flattened in project-then-part order because the picker draws its headings
    off the seams in this list; see the note in the form.
  */
  /*
    Each project's own lines, with "all of it" at the head of them.

    The whole projects used to be a group of their own at the top of the picker,
    under the heading "A whole project", because they were the ones nobody had
    itemised — the bus and the kit had no lines to list, so the only thing to
    offer was the job. Now every project has both, and a separate group asks
    somebody to find the playground twice: once as a whole and once as eight
    swings, with nothing on either to say they are the same money.

    So the whole sits inside its project, first, above the lines it is the sum
    of. A giver who came for the bus meets the bus; a giver who wants to buy one
    swing scrolls two inches. The picker draws its headings off the seams in
    this list, so project-then-part order is what makes the groups come out
    right — see the note in the form.

    No `partSummary` on the whole-project row. It used to explain the figures
    underneath it, which is a sentence the form already says twice: once in the
    picker's own words above the list, and again in the hint under the amount
    box once one of these is picked.
  */
  const choices: GiveChoice[] = buildProjects(needs, parts, projectRows).flatMap((project) => {
    const areaLabel = projectTitle(project);

    /*
      What is still open across the whole project, not what the job originally
      cost. The two are the same until somebody gives, and after that only this
      one can be handed over without charging a giver for a swing that is
      already bought. Same source as the figure on /needs, so the two pages
      cannot come to different sums.
    */
    const whole: GiveChoice[] =
      project.stillAskingCents > 0
        ? [
            {
              value: projectValue(project.area.id),
              title: "All of it — the whole project",
              areaLabel,
              costCents: project.stillAskingCents,
            },
          ]
        : [];

    const items: GiveChoice[] = readyParts(project).flatMap((group) =>
      group.needs
        .filter((need) => !need.closed && need.ledger.openCents > 0)
        .map((need) => ({
          value: need.slug,
          title: need.title,
          areaLabel,
          partTitle: group.part?.title,
          partSummary: group.part?.summary || undefined,
          openCents: need.ledger.openCents,
        })),
    );

    return [...whole, ...items];
  });

  return (
    <>
      <PageHero
        title={giving.heading}
        intro={giving.intro}
      />

      {/*
        Here, and deliberately not above the pledge form further down. A verse
        about the cheerful giver placed directly over a payment field reads as
        leverage; placed at the top it frames the page, which is what it is for.
      */}
      <Verse text={giving.verse} reference={giving.verseRef} />

      <section className="px-6 py-20 sm:py-24">
        <div className="shell">
          <SectionTitle>{giving.waysHeading}</SectionTitle>

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
                <SectionTitle className="mt-3">
                  Or pick something, and see it through
                </SectionTitle>
                <p className="mt-6 max-w-xl leading-relaxed text-smoke">
                  Every item is one thing the ministry is short of, with the
                  price on it. Take all of one or part of one, and watch the work
                  it pays for.
                </p>
                <ButtonLink href="/needs" icon="give" className="mt-8">
                  See what&apos;s needed
                </ButtonLink>
              </div>

              <dl className="grid gap-px overflow-hidden rounded-2xl bg-sand-deep sm:grid-cols-2 lg:grid-cols-1">
                <div className="bg-white px-8 py-7">
                  <dt className="eyebrow text-smoke">Still open</dt>
                  <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-plum">
                    <Money cents={ledger.totalOpenCents} />
                  </dd>
                  <p className="mt-2 text-sm text-smoke">
                    across {ledger.openCount}{" "}
                    {ledger.openCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="bg-white px-8 py-7">
                  <dt className="eyebrow text-smoke">Received so far</dt>
                  <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-green">
                    <Money cents={ledger.totalReceivedCents} />
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
            <SectionTitle className="mt-3">
              Put your name to something
            </SectionTitle>

            <p className="mt-6 leading-relaxed text-smoke">
              {choices.length > 0
                ? `Choose a project or one of its costs, take all of it or part, or tell us in your own words what you would like to support. ${
                    canPay
                      ? "Then pay by M-Pesa or card, or ask for the account details."
                      : "It goes on the ledger straight away, so the ministry knows to expect it."
                  }`
                : /*
                    True of an empty ledger and of a full one whose next step is
                    still waiting on the one before it — both end up here, and
                    "there is nothing costed" would be a lie in the second case.
                  */
                  `Nothing on the list is ready to be picked up just now, so tell us in your own words what you would like to support. ${
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
                        Pay now, or send it later.
                      </strong>{" "}
                      Card details go to Pesapal&apos;s own page, never here.
                    </>
                  ) : (
                    <>
                      <strong className="font-medium text-charcoal">
                        Nothing is taken here.
                      </strong>{" "}
                      This records what you intend to give, and sends you the
                      account details.
                    </>
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="give" className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                <span>
                  <strong className="font-medium text-charcoal">
                    You can give part of the cost.
                  </strong>
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="give" className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                <span>
                  <strong className="font-medium text-charcoal">
                    You will get updates and photos as the work goes on.
                  </strong>
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-7 shadow-warm-lg sm:p-9">
            <Suspense
              fallback={
                <p className="py-10 text-center text-smoke">Loading the form…</p>
              }
            >
              <Pledge
                searchParams={props.searchParams}
                choices={choices}
                contactEmail={site.email}
                canPay={canPay}
              />
            </Suspense>
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

            <p className="measure mt-10 border-t border-white/15 pt-8 text-sm leading-relaxed text-white/55">
              {giving.designationNote}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
