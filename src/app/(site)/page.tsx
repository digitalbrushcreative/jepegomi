import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { HeroSlider } from "@/components/hero-slider";
import { Icon, type IconName } from "@/components/icons";
import { Money } from "@/components/money";
import { NeedsSlider } from "@/components/needs-slider";
import { ClothEdge } from "@/components/pattern";
import { PhotoStrip } from "@/components/photos";
import { ProgressPot } from "@/components/progress-pot";
import { SchoolBus } from "@/components/school-bus";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { getChildrenFed } from "@/lib/enrolment";
import { getKitchenReport, kitchenStats } from "@/lib/kitchen";
import { busPrice } from "@/lib/money";
import { getGivingSummary, getStillNeededCents } from "@/lib/needs";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * The front page's own head.
 *
 * It had none, which was nearly harmless and not quite: the title and the
 * description fell through to the root layout, which is what they should say
 * anyway — but nothing declared a canonical, and this is the one address on the
 * site people reach two ways. The apex redirects to www (see lib/site.ts), and
 * every inbound link written on paper, in an email signature or on the side of
 * the van says the bare domain.
 *
 * No `title`, deliberately. The root layout's default is "Jepegomi — Jesus
 * People Gospel Ministries", untemplated, and the front page is the one page
 * that wants exactly that rather than something with " · Jepegomi" bolted on
 * the end.
 */
export const metadata: Metadata = pageMeta({
  description: site.tagline,
  path: "/",
});

/*
  The photograph each hero slide is built around. It fills the whole slide, and
  the slide's own colour is clipped back over the left of it — so these are not
  backdrops in the dimmed sense, they are the picture, shown at full strength.

  The college has none. There is no photograph of it — not a bad one, none — and
  the lookup is per-slide, so it falls back to the flat charcoal slide the design
  already had, with its own mark held behind at watermark opacity. A stand-in of
  somebody else's lecture room would fill the space and say something untrue.

  Each shows the thing its slide is actually about: the church, a service inside
  the sanctuary; the academy, its children; the feeding program, children eating.
  The first pass reached for whatever was widest and highest-resolution — an
  empty yard, a building site with a pile of stones, a queue of backs — and a
  hero that large has to earn its size with a subject, not a texture.

  All three share one property, and it is the one that matters at this size: the
  subject fills the frame. Only the right of a picture survives the split, so a
  photograph with its interest in the middle arrives as whatever happened to be
  standing on the right. An interior of an empty classroom was tried here and
  came through as a wall chart and a blurred elbow.

  The church pays for that in sharpness. Its only interior photographs are 636px
  crops out of the slide deck, so this one is enlarged more than twice over. It
  is still the right picture: nobody looking at a church wants the car park.
  A better one, taken on a phone at a Sunday service, is the single cheapest
  upgrade available to this page.
*/
const heroBackdrops: Record<string, string> = {
  "/church": "/photos/church/congregation.jpg",
  "/academy": "/photos/academy/graduation.jpg",
  "/programs/food-at-school": "/photos/school/lunch-classroom-01.jpg",
};

/*
  Three photographs under the four cards, one for each arm the cards describe
  that has people in it. The cards make the argument that no arm is a footnote
  to another; these stop that argument being made entirely in prose.
*/
const arms = [
  {
    src: "/photos/church/service.jpg",
    alt: "A man standing at a lectern reading to rows of seated children",
    caption: "The pupils' service, in the sanctuary at Kahawa Sukari.",
  },
  {
    src: "/photos/academy/assembly.jpg",
    alt: "A long line of children in green uniform standing outdoors at assembly, a teacher reading to them",
    caption: "Morning assembly at the academy.",
  },
  {
    src: "/photos/school/lunch-queue-01.jpg",
    alt: "Children in green uniform queueing along a wall, plates in hand",
    caption: "The Food at School lunch queue, every school day.",
  },
];

/*
  The photographs in each need's collage.

  The kitchen's are referenced by slot number, the same names the Kitchen Build
  gallery reads out of that folder — so replacing one on the report replaces it
  here too, and the front page cannot end up showing a kitchen the report has
  moved past.
*/
const kitchenCollage = [
  {
    src: "/photos/kitchen/11.jpg",
    alt: "The finished kitchen — plastered walls, a tiled roof and a chimney, standing in the school yard",
  },
  {
    src: "/photos/kitchen/16.jpg",
    alt: "A wood fire burning in the new jiko, a pot on the plate above it",
  },
  {
    src: "/photos/kitchen/17.jpg",
    alt: "Rows of red plates filled with rice and beans, laid out ready for the children",
  },
];

const transportCollage = [
  {
    src: "/photos/transport/van.jpg",
    alt: "The academy's yellow school van parked on grass beside the church",
  },
  {
    src: "/photos/transport/van-lettering.jpg",
    alt: "The van's side, lettered Jepegomi Academy School, Kahawa, Church — a stone chocked against the wheel",
  },
  {
    src: "/photos/transport/van-off-road.jpg",
    alt: "The same van standing at the edge of the school field, out of service",
  },
];

/** One tile of a collage: a photograph, cropped square. */
function PhotoTile({ src, alt }: { src: string; alt: string }) {
  return (
    <li className="relative aspect-square overflow-hidden rounded-xl bg-plum/40">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 45vw, 180px"
        className="object-cover"
      />
    </li>
  );
}

/**
 * The odd tile out: the one carrying the figure.
 *
 * Cream rather than white, and cream rather than plum — a plum tile on the
 * plum-deep section would sink into it, and the whole job of this tile is to be
 * the thing the eye stops on.
 */
function StatTile({ children }: { children: ReactNode }) {
  return (
    <li className="flex aspect-square flex-col items-center justify-center rounded-xl bg-cream px-3 text-plum">
      {children}
    </li>
  );
}

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
  const [
    home,
    about,
    siteContent,
    transport,
    giving,
    childrenFed,
    kitchenStillNeeded,
    kitchen,
  ] =
    await Promise.all([
      getContent("home"),
      getContent("about"),
      getContent("site"),
      getContent("transport"),
      getGivingSummary(),
      getChildrenFed(),
      getStillNeededCents("kitchen"),
      getKitchenReport(),
    ]);

  const bus = busPrice(transport.busPriceKes, siteContent.kesPerUsd);

  const stats = kitchenStats(kitchen, childrenFed);

  /*
    What the kitchen brings to the needs slider that the CMS cannot: figures and
    a pot, both read from the budget and never typed here, so they cannot drift
    out of step with the Kitchen page. Keyed by the need's link — a need with no
    entry here shows its icon and its status line instead, which is what every
    need that has not been costed yet has to do.
  */
  const needFigures = {
    /* What a bus costs, and nothing about what is banked against it. The tile
       used to carry "Held in the bank" alongside — see the bus fields in
       cms/schema.ts. */
    "/programs/transport": [
      {
        label: `A ${transport.busSeats}-seater bus`,
        value: <Money cents={bus.usdCents} />,
      },
    ],
    /*
      The middle tile was the size of the gift that built it. What a partner
      church gave is that church's business and the ministry's, not a figure for
      the front page to advertise — so the tile says what the kitchen does, and
      the accounts themselves are behind the partner door. See
      lib/disclosure.ts, and the note on the gift field in cms/schema.ts.
    */
    "/projects/kitchen": [
      { label: stats[0].label, value: stats[0].value },
      { label: stats[1].label, value: stats[1].value },
      {
        label: "Still needed to finish",
        value: <Money cents={kitchenStillNeeded} />,
      },
    ],
  };

  const needPanels = {
    /*
      What the school has, and what it is raising for — three photographs of the
      van and the bus it is raising for.

      The bus tile is a 26-seater of the kind the school has been quoted for,
      not a vehicle it owns. The prose on /programs/transport is what carries
      that distinction now; the tile itself is just the bus.
    */
    "/programs/transport": (
      <ul className="grid w-full grid-cols-2 gap-3">
        <PhotoTile {...transportCollage[0]} />
        <StatTile>
          <SchoolBus percent={0} className="w-full" />
        </StatTile>
        <PhotoTile {...transportCollage[1]} />
        <PhotoTile {...transportCollage[2]} />
      </ul>
    ),
    /*
      Four tiles: the build, the fire it lit, the meal it cooks — and the pot,
      which is a tile now rather than the whole card.

      The kitchen is the one need on this page with a year of photographs behind
      it, and a single figure was spending none of them. The three pictures run
      in the order the build did, so the collage is a sequence and not a mosaic:
      a finished building, the fire lit inside it, and the food coming off it.
    */
    "/projects/kitchen": (
      <ul className="grid w-full grid-cols-2 gap-3">
        <StatTile>
          <ProgressPot
            percent={kitchen.percentComplete}
            className="h-[4.5rem] w-auto"
          />
          <p className="font-display mt-2.5 text-[2rem] leading-none font-semibold">
            {kitchen.percentComplete}%
          </p>
        </StatTile>
        {kitchenCollage.map((photo) => (
          <PhotoTile key={photo.src} {...photo} />
        ))}
      </ul>
    ),
  };

  return (
    <>
      {/* One slide per arm: the church, the academy, the college, the program. */}
      <HeroSlider slides={home.slides} backdrops={heroBackdrops} />

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
          {/* A centred lead reads best on a tight measure — the frame is shared,
              the line length is not. */}
          <h1 className="font-display mx-auto max-w-3xl text-[2.4rem] leading-[1.05] font-semibold text-balance sm:text-[3.25rem]">
            {home.heading}
          </h1>

          {/*
            Under the heading rather than over it. Where it is now is a place
            line; where it was, it was a tracked uppercase label sitting on top
            of an oversized headline, which is the one hero shape every
            generated site arrives wearing. The words are worth keeping — a
            reader wants to know where this is — the position was not.
          */}
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-smoke">
            <Icon name="pin" className="h-4 w-4 text-plum" />
            {site.location}
          </p>

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

        <div className="shell">
          <PhotoStrip photos={arms} className="mt-12" />
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

      {/* The people behind it. */}
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
            <SectionTitle className="mt-3">{site.leaders}</SectionTitle>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-smoke">
              {about.intro}
            </p>
            <ButtonLink
              href="/about"
              variant="ghost"
              className="mt-7 text-plum"
            >
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

                The total used to be in the label — "see what's needed, $4,200
                open" — and it has come off rather than gone behind a blur. A
                button is a place for one clear instruction, and "see what's
                needed — $•,••• open" is a button apologising for itself at the
                exact moment somebody is deciding whether to press it.
              */}
              {giving.openCount > 0 && (
                <ButtonLink href="/needs" variant="ghost" className="text-plum">
                  See what&apos;s needed
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
