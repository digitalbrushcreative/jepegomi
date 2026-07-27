"use client";

import Link from "next/link";
import {
  type ReactNode,
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
 * The panel each slide carries on its right — the Kitchen's progress pot, the
 * Academy's details, the college's card.
 *
 * They are built on the server and handed in, rather than assembled here,
 * because the Academy's panel needs its own CMS document and this component
 * runs on the client. Keyed by the slide's link, the same way its logo and
 * colour are.
 */
export type SlidePanels = Record<string, ReactNode>;

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
  },
  "/academy": {
    Mark: AcademyLogo,
    label: "Jepegomi Academy",
    background: "bg-green-deep",
    give: "!bg-white !text-green hover:!bg-cream",
  },
  "/college": {
    Mark: BibleCollegeLogo,
    label: "Contextual Bible Training College",
    background: "bg-charcoal",
  },
  "/programs/food-at-school": {
    Mark: FoodAtSchoolLogo,
    label: "Food at School",
    background: "bg-brown",
  },
};

const INTERVAL_MS = 7000;

export function HeroSlider({
  slides,
  panels = {},
}: {
  slides: Slide[];
  panels?: SlidePanels;
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
        Every slide is rendered into the same grid cell, so the hero is as tall
        as its tallest slide and never jolts the page as it turns over.
      */}
      <div className="grid">
        {slides.map((slide, slideIndex) => {
          const brand = brands[slide.href];
          const active = slideIndex === index;

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
              className={`col-start-1 row-start-1 transition-opacity duration-700 ${
                brand?.background ?? "bg-plum-deep"
              } ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <div className="grain-layer" />

              {/*
                The header is transparent and sits on top of this, so the top
                padding has to clear it. The deep bottom padding leaves the
                controls and the cloth edge somewhere to sit.
              */}
              <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pt-28 pb-36 sm:pt-32 sm:pb-40 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
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

                  <p className="eyebrow mt-8 text-marigold">{slide.eyebrow}</p>

                  <h2 className="font-display mt-3 text-[2.4rem] leading-[1.05] font-semibold text-balance text-white sm:text-[3.25rem]">
                    {slide.title}
                  </h2>

                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
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

                {/* Each arm of the ministry brings its own thing to show. */}
                {panels[slide.href] && (
                  <div
                    className={`hidden transition-all duration-700 lg:block ${
                      active
                        ? "translate-y-0 opacity-100"
                        : "translate-y-4 opacity-0"
                    }`}
                  >
                    {panels[slide.href]}
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
