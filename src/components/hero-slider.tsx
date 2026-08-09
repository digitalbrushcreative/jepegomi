"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  AcademyLogo,
  BibleCollegeLogo,
  FoodAtSchoolLogo,
  JepegomiLogo,
} from "@/components/logos";
import { ClothEdge } from "@/components/pattern";
import { ButtonLink } from "@/components/ui";

export type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

/**
 * The photograph a slide is built around, filling it edge to edge.
 *
 * Passed as a path rather than a rendered node, because it has to sit under the
 * colour block, under the grain and beneath the text; a caller handed that job
 * would have to know the stacking order to get it right.
 *
 * Decorative by definition: whatever it shows is said again in the slide's own
 * words a few pixels to the left, so it is rendered with an empty alt rather
 * than making a screen reader listen to the same thing twice.
 */
export type SlideBackdrops = Record<string, string>;

/*
  Which mark and which colour a slide wears follows the arm of the ministry it
  points at. Simon writes the words in the CMS; he does not have to know that a
  logo or a background is attached to them. A slide pointing somewhere new falls
  back to plum with no mark, which is plain rather than broken.
*/
const brands: Record<
  string,
  {
    Mark: typeof FoodAtSchoolLogo;
    label: string;
    background: string;
    /**
     * The gradient laid over the backdrop photograph, in the slide's own
     * colour. It runs left to right: near-solid under the words, thinning
     * across the picture.
     *
     * This is the one thing on the slide that is not negotiable. White type on
     * a photograph is unreadable wherever the photograph happens to be pale,
     * and "happens to be" is not a contrast strategy — every one of these keeps
     * the text half of the slide at or near the flat colour it used to be.
     */
    scrim: string;
    /**
     * Green is the giving colour everywhere on this site — but a green button on
     * the academy's green slide is a button nobody can see. There it inverts to
     * white with green text, which keeps giving green without hiding the ask.
     */
    give?: string;
  }
> = {
  /*
    Four arms, four marks, four colours — and each colour is taken from the mark
    it sits behind rather than picked: the Jepegomi logo is plum, the academy's
    is green, the college crest is navy, and the Food at School lettering is a
    dark brown. The church gets the plum because the church *is* Jepegomi; the
    feeding program moved off it and onto its own brown, which is the only way
    four slides can each look like themselves.
  */
  "/church": {
    Mark: JepegomiLogo,
    label: "Jesus People Gospel Ministries",
    background: "bg-plum-deep",
    scrim: "from-plum-deep via-plum-deep/92 to-plum-deep/80",
  },
  "/academy": {
    Mark: AcademyLogo,
    label: "Jepegomi Academy",
    background: "bg-green-deep",
    scrim: "from-green-deep via-green-deep/92 to-green-deep/80",
    give: "!bg-white !text-green hover:!bg-cream",
  },
  "/college": {
    Mark: BibleCollegeLogo,
    label: "Contextual Bible Training College",
    background: "bg-charcoal",
    scrim: "from-charcoal via-charcoal/92 to-charcoal/80",
  },
  "/programs/food-at-school": {
    Mark: FoodAtSchoolLogo,
    label: "Food at School",
    background: "bg-brown",
    scrim: "from-brown via-brown/92 to-brown/80",
  },
};

const INTERVAL_MS = 7000;

export function HeroSlider({
  slides,
  backdrops = {},
}: {
  slides: Slide[];
  backdrops?: SlideBackdrops;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const id = useId();
  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  /*
    Autoplay stops while the pointer is over the slider, while focus is inside
    it, and entirely for anyone who has asked their system for reduced motion —
    a carousel that keeps yanking the content away is the usual reason people
    hate carousels.
  */
  const reducedMotion = usePrefersReducedMotion();

  /*
    `index` is a dependency on purpose: choosing a slide restarts the clock.
    Without it the timer keeps its own rhythm, and a slide you just picked can be
    yanked away a moment later — which is maddening, and exactly what happened
    the first time this shipped.
  */
  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % count),
      INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [paused, reducedMotion, count, index]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Jesus People Gospel Ministries"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(index - 1);
        if (event.key === "ArrowRight") go(index + 1);
      }}
      className="relative overflow-hidden"
    >
      {/*
        The torn edge the colour hands over to the photograph on, declared once
        for all four slides. `objectBoundingBox` units mean the same path fits
        whatever the slide is sized to, and one definition avoids four elements
        fighting over a single id.

        It leans out to about 62% and back to 59% down the height. The words end
        near 49% of the viewport at every width the split is on, so the wobble
        never reaches them.
      */}
      <svg aria-hidden="true" className="absolute h-0 w-0" focusable="false">
        <defs>
          <clipPath id="hero-split" clipPathUnits="objectBoundingBox">
            <path d="M0,0 L0.605,0 C0.578,0.17 0.628,0.34 0.596,0.5 C0.564,0.66 0.614,0.83 0.588,1 L0,1 Z" />
          </clipPath>
        </defs>
      </svg>

      {/*
        Every slide is rendered into the same grid cell, so the hero is as tall
        as its tallest slide and never jolts the page as it turns over.
      */}
      <div className="grid">
        {slides.map((slide, slideIndex) => {
          const brand = brands[slide.href];
          const active = slideIndex === index;
          const backdrop = backdrops[slide.href];

          return (
            <div
              key={slide.href + slide.title}
              id={`${id}-slide-${slideIndex}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${count}: ${slide.eyebrow}`}
              aria-hidden={!active}
              // Everything on a hidden slide leaves the tab order with it, so a
              // keyboard never lands on a button it cannot see.
              inert={!active}
              className={`relative col-start-1 row-start-1 overflow-hidden transition-opacity duration-700 ${
                brand?.background ?? "bg-plum-deep"
              } ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              {/*
                The photograph, at full strength and filling the slide. Only the
                first is `priority` — it is the largest thing above the fold on
                the front page, and the other three are behind an opacity
                transition nobody is waiting on.
              */}
              {backdrop && (
                <div aria-hidden="true" className="absolute inset-0">
                  <Image
                    src={backdrop}
                    alt=""
                    fill
                    sizes="100vw"
                    priority={slideIndex === 0}
                    className="object-cover"
                  />

                  {/*
                    Narrow screens have no room to put words beside a picture,
                    so there the colour goes over the whole photograph and the
                    slide reads as it did before — type on a tinted image.
                  */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${brand?.scrim ?? "from-plum-deep via-plum-deep/92 to-plum-deep/80"} lg:hidden`}
                  />

                  {/*
                    Wide screens get the split: the colour holds the left of the
                    slide at full opacity and hands over to the photograph along
                    a torn edge, the same motif as the cloth edges between
                    sections. The words never touch the picture, which is what
                    lets the picture be shown at full strength instead of dimmed
                    to a backdrop.
                  */}
                  <div
                    className={`absolute inset-0 hidden lg:block ${brand?.background ?? "bg-plum-deep"}`}
                    style={{ clipPath: "url(#hero-split)" }}
                  />

                  {/* Keeps the controls off whatever the photo does at the foot. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

                  {/*
                    The header is transparent and sits on this, and on wide
                    screens the torn split hands the right of the slide over to
                    the photograph at full strength — so the nav's outer links,
                    and on narrow screens the Give pill and the menu button,
                    have nothing but the picture behind them. This is the band
                    that gives them one.

                    It is its own element rather than a stronger stop on the
                    gradient above, because that one runs the whole height: any
                    top stop dark enough to carry white nav type also greys the
                    top half of every photograph. Eight rems clears the 4rem
                    header and fades out well above the eyebrow, which starts
                    around 11rem.
                  */}
                  <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
                </div>
              )}

              <div className="grain-layer" />

              {/*
                The header is transparent and sits on top of this, so the top
                padding has to clear it. The deep bottom padding leaves the
                controls and the cloth edge somewhere to sit.
              */}
              {/*
                Taller than it was, and the picture column is now the wider of
                the two. The old split gave the words 1.15 against the panel's
                1, which was right when the panel held a small diagram and
                wrong now that it holds photographs of the people the slide is
                about.
              */}
              <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pt-28 pb-40 sm:pt-32 sm:pb-44 lg:min-h-[41rem] lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
                <div
                  className={`transition-transform duration-700 ${
                    active ? "translate-y-0" : "translate-y-3"
                  }`}
                >
                  {brand && (
                    <brand.Mark
                      variant="mono"
                      title={brand.label}
                      className="h-20 w-auto text-white sm:h-24"
                    />
                  )}

                  {/*
                    marigold is only 4.3:1 against the academy slide's green
                    scrim; the lighter tint clears AA on all four backgrounds.
                  */}

                  <h2 className="font-display mt-3 text-[2.4rem] leading-[1.05] font-semibold text-balance text-white sm:text-[3.25rem]">
                    {slide.title}
                  </h2>

                  {/*
                    /85 rather than /70. On narrow screens this paragraph sits
                    directly on the photograph, and at 70% over the lighter end
                    of the tint it measured 3.6:1 — under AA for the one line
                    that explains what the slide is.
                  */}
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
                    {slide.body}
                  </p>

                  <div className="mt-9 flex flex-wrap items-center gap-4">
                    <ButtonLink
                      href="/give"
                      icon="give"
                      className={brand?.give ?? ""}
                    >
                      Give
                    </ButtonLink>
                    <ButtonLink
                      href={slide.href}
                      variant="ghost"
                      className="text-white"
                    >
                      {slide.cta}
                    </ButtonLink>
                  </div>
                </div>

                {/*
                  On a slide with a photograph this column is deliberately
                  empty. The picture is already filling it, behind everything,
                  and anything placed on top would cover the thing the split
                  exists to show. The column still claims its width, which is
                  what holds the words clear of the torn edge.

                  A slide without one — today, only the college — fills it with
                  its own mark at the opacity of a watermark, so that the
                  absence reads as a decision rather than as something that
                  failed to load. It is still the honest answer: the mark is the
                  college's own and is not pretending to be a photograph.
                */}
                {!backdrop && brand && (
                  <div
                    aria-hidden="true"
                    className={`hidden items-center justify-center transition-opacity duration-700 lg:flex ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <brand.Mark
                      variant="mono"
                      title={brand.label}
                      className="h-64 w-auto text-white/[0.06]"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* The controls sit above the slides, and never turn over with them. */}
      <div className="absolute inset-x-0 bottom-16 z-10 sm:bottom-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2.5">
            {slides.map((slide, slideIndex) => {
              const active = slideIndex === index;
              return (
                <button
                  key={slide.href + slide.title}
                  type="button"
                  onClick={() => go(slideIndex)}
                  aria-label={`Show ${slide.eyebrow}`}
                  aria-current={active}
                  aria-controls={`${id}-slide-${slideIndex}`}
                  className={`h-2.5 cursor-pointer rounded-full transition-all ${
                    active
                      ? "w-9 bg-marigold"
                      : "w-2.5 bg-white/35 hover:bg-white/60"
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <SliderButton label="Previous slide" onClick={() => go(index - 1)}>
              ←
            </SliderButton>
            <SliderButton label="Next slide" onClick={() => go(index + 1)}>
              →
            </SliderButton>
          </div>
        </div>
      </div>

      <ClothEdge anchor="inside-bottom" className="z-10 text-cream" />
    </section>
  );
}

function SliderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-white/25 text-white transition-colors hover:border-white/70 hover:bg-white/10"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

/**
 * Read once on mount and then watched, because someone can turn reduced motion
 * on while the page is open and should not have to reload to be listened to.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  const query = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    query.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.current.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.current.addEventListener("change", onChange);
    return () => query.current?.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
