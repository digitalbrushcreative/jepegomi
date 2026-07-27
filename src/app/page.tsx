import Image from "next/image";
import Link from "next/link";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { HeroSlider } from "@/components/hero-slider";
import { Icon, type IconName } from "@/components/icons";
import { NeedsSlider } from "@/components/needs-slider";
import { ClothEdge } from "@/components/pattern";
import { ProgressPot } from "@/components/progress-pot";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { budgetTotals, donation, progress, stats } from "@/content/kitchen";
import { usd } from "@/lib/money";
import { getGivingSummary } from "@/lib/needs";
import { site } from "@/lib/site";

/*
  The cards are written by Simon & Joyce in the CMS, so the words are theirs.
  The icon is the design's job, not theirs — it is matched to wherever the card
  points. A card pointing somewhere new simply gets no icon, which is a quiet
  omission rather than a broken page.
*/
const cardIcons: Record<string, IconName> = {
  "/church": "church",
  "/academy": "child",
  "/college": "book",
  "/programs/food-at-school": "pot",
  "/projects/kitchen": "trowel",
  "/about": "church",
};

/*
  This page used to be the feeding program with a ministry attached. That was the
  honest result of how the site was built — it grew out of the Kitchen Build
  report — but it had stopped being an honest picture of the ministry: the
  kitchen held the headline, the pot, the numbers *and* the closing ask, while
  the church the whole thing belongs to was a card at the bottom.

  So the kitchen has been gathered into one section it owns outright, and the
  four arms — the church, the academy, the college, the program — take the hero
  and the cards on equal terms. The appeal did not get quieter. It got a room of
  its own instead of leaking into every other one.
*/
export default async function HomePage() {
  const [home, about, giving] = await Promise.all([
    getContent("home"),
    getContent("about"),
    getGivingSummary(),
  ]);

  /*
    What the kitchen brings to the needs slider that the CMS cannot: figures and
    a pot, both read from the budget and never typed here, so they cannot drift
    out of step with the Kitchen page. Keyed by the need's link — a need with no
    entry here shows its icon and its status line instead, which is what every
    need that has not been costed yet has to do.
  */
  const needFigures = {
    "/projects/kitchen": [
      { label: stats[0].label, value: stats[0].value },
      {
        label: `Given by ${donation.donor}`,
        value: `$${donation.amountUsd.toLocaleString("en-US")}`,
      },
      {
        label: "Still needed to finish",
        value: `$${budgetTotals.stillNeeded.toLocaleString("en-US")}`,
      },
    ],
  };

  const needPanels = {
    "/projects/kitchen": (
      <>
        <ProgressPot
          percent={progress.percentComplete}
          className="h-32 w-auto text-plum"
        />
        <p className="font-display mt-5 text-6xl leading-none font-semibold text-plum">
          {progress.percentComplete}%
        </p>
        <p className="eyebrow mt-3 text-smoke">The kitchen, so far</p>
        <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-smoke">
          {progress.caption}
        </p>
      </>
    ),
  };

  return (
    <>
      {/* One slide per arm: the church, the academy, the college, the program. */}
      <HeroSlider slides={home.slides} />

      {/*
        Who Jepegomi is, as a whole. The slider speaks for each arm in turn; this
        speaks for all four at once, and it carries the page's one <h1>. The
        slides can't: there are four of them, and a page has one heading, not one
        per rotation.

        The pot used to share this space, which meant the first thing the page
        said after the hero was "the kitchen is 75% done" — a fine thing to say,
        but not the first thing, and not before the ministry had introduced
        itself.
      */}
      <section className="bg-cream px-6 py-16 text-center sm:py-24">
        <div className="shell">
          <p className="eyebrow flex items-center justify-center gap-2.5 text-plum">
            <Icon name="pin" className="h-4 w-4" />
            {site.location}
          </p>

          {/* A centred lead reads best on a tight measure — the frame is shared,
              the line length is not. */}
          <h1 className="font-display mx-auto mt-5 max-w-3xl text-[2.4rem] leading-[1.05] font-semibold text-balance sm:text-[3.25rem]">
            {home.heading}
          </h1>

          {paragraphs(home.intro).map((text) => (
            <p
              key={text}
              className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-smoke"
            >
              {text}
            </p>
          ))}
        </div>
      </section>

      {/*
        The four arms, all the same size. Four equal cards is the whole argument
        of this page: not one of them is a footnote to another.
      */}
      <section className="relative bg-sand px-6 py-20 sm:py-24">
        <ClothEdge className="text-sand" />

        <div className="shell grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {home.cards.map((card) => {
            const icon = cardIcons[card.href];
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-warm transition-all hover:-translate-y-1 hover:shadow-warm-lg"
              >
                <div className="flex flex-1 flex-col p-7">
                  {icon && (
                    <Icon
                      name={icon}
                      className="mb-5 h-9 w-9 text-plum transition-transform group-hover:scale-110"
                    />
                  )}
                  <h2 className="font-display text-xl font-semibold">
                    {card.title}
                  </h2>
                  {paragraphs(card.body).map((text) => (
                    <p
                      key={text}
                      className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-smoke"
                    >
                      {text}
                    </p>
                  ))}
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-plum">
                    {card.cta}
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/*
        The appeal, in one place. It used to be three sections (the pot up in the
        welcome, a band of numbers, and the closing ask) and then one — the
        kitchen — because the kitchen was the only thing being asked for. It now
        holds every current need in turn, so the second one does not have to
        fight the kitchen for a section of its own.
      */}
      <NeedsSlider
        eyebrow={home.needsEyebrow}
        needs={home.needs}
        panels={needPanels}
        figures={needFigures}
      />

      {/* The people behind it — and the only real photograph the site has. */}
      <section className="relative bg-cream px-6 py-20 sm:py-24">
        <ClothEdge className="text-cream" />

        <div className="shell grid items-center gap-12 sm:grid-cols-[auto_1fr] sm:gap-14">
          <div className="relative mx-auto h-44 w-44 shrink-0 overflow-hidden rounded-full bg-sand ring-8 ring-marigold/20 sm:h-56 sm:w-56">
            <Image
              src={about.portrait}
              alt={about.portraitAlt}
              fill
              sizes="224px"
              className="object-cover object-top"
            />
          </div>

          <div>
            <p className="eyebrow text-plum">The people</p>
            <SectionTitle className="mt-3">{site.leaders}</SectionTitle>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-smoke">
              {about.intro}
            </p>
            <ButtonLink href="/about" variant="ghost" className="mt-7 text-plum">
              Meet them
            </ButtonLink>
          </div>
        </div>
      </section>

      {/*
        The ask — for the ministry, not for the kitchen. The kitchen made its own
        case above, in its own section, with its own numbers and its own button.
        Asking for it twice on one page is how the page came to sound like the
        ministry did nothing else.
      */}
      <section className="relative overflow-hidden bg-sand px-6 pt-20 pb-16 text-center sm:pt-24">
        <ClothEdge className="text-sand" />

        {/* Frame shared with every other section; the ask itself stays on a
            tight centred measure, the way a closing ask wants to read. */}
        <div className="shell">
          <div className="mx-auto max-w-2xl">
            <p className="eyebrow text-plum">{home.closingEyebrow}</p>
            <h2 className="font-display mt-4 text-3xl leading-[1.15] font-semibold text-balance sm:text-[2.6rem]">
              {home.closingHeading}
            </h2>
            {paragraphs(home.closingBody).map((text) => (
              <p key={text} className="mt-5 leading-relaxed text-smoke">
                {text}
              </p>
            ))}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <ButtonLink href="/give" icon="give">
                Give
              </ButtonLink>

              {/*
                Only once there is a costed item to point at. An empty ledger
                behind a button promising "what's needed" is the one thing this
                whole feature exists not to do.
              */}
              {giving.openCount > 0 && (
                <ButtonLink href="/needs" variant="ghost" className="text-plum">
                  See what&apos;s needed — {usd(giving.totalOpenCents)} open
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
