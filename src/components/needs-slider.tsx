"use client";

import { type ReactNode, useId, useRef, useState } from "react";
import { paragraphs } from "@/cms/prose";
import { Icon, type IconName } from "@/components/icons";
import { ClothEdge } from "@/components/pattern";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { areaForHref } from "@/lib/giving";

export type Need = {
  /** The short name on the button that switches to this need. */
  label: string;
  heading: string;
  body: string;
  /** Where it stands, for a need with no figures of its own yet. */
  status: string;
  cta: string;
  href: string;
  giveCta: string;
};

/**
 * `value` is a node rather than a string because a money figure on this slider
 * may be a blur rather than a number — see components/money.tsx. The slider does
 * not know or care which it got; it just puts it in the box.
 */
export type Figure = { label: string; value: ReactNode };

/**
 * The contents of the white card beside a need — not the card itself, which is
 * drawn here so that two needs can never end up in two different-looking cards.
 * Keyed by the need's link, the same way the hero keys its logos.
 */
export type NeedPanels = Record<string, ReactNode>;

/*
  A need with no panel of its own gets its icon and its status line instead. The
  icon follows the link, so Simon writes words in the CMS and never has to know
  a picture is attached to them; a need pointing somewhere new simply gets no
  icon, which is quiet rather than broken.
*/
/** Where the Give button goes, given what the panel links to. */
function giveHref(href: string) {
  const area = areaForHref(href);
  return area ? `/give?for=${area.id}#pledge` : "/give";
}

const needIcons: Record<string, IconName> = {
  "/projects/kitchen": "trowel",
  "/programs/transport": "bus",
  "/academy": "child",
  "/programs/food-at-school": "pot",
  "/church": "church",
  "/college": "book",
};

/**
 * The front page's appeal, once there was more than one thing to appeal for.
 *
 * Deliberately *not* on a timer, unlike the hero. The hero rotates because it is
 * an introduction and nobody reads an introduction twice; this is an ask with
 * figures in it, and pulling those out from under somebody mid-sentence is how
 * you lose the gift. It moves when a reader asks it to and not before — which is
 * also why the controls are named rather than a row of anonymous dots: "Academy
 * transport" tells you there is a second need before you click, and a dot does
 * not.
 */
export function NeedsSlider({
  eyebrow,
  needs,
  panels = {},
  figures = {},
}: {
  eyebrow: string;
  needs: Need[];
  panels?: NeedPanels;
  figures?: Record<string, Figure[]>;
}) {
  const [index, setIndex] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const count = needs.length;

  if (count === 0) return null;

  /* Arrow keys move the selection and take the focus with them — the tab
     pattern people already know from every other set of tabs they have used. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const offset =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const next =
      offset !== 0
        ? (index + offset + count) % count
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? count - 1
            : index;

    if (next === index) return;
    event.preventDefault();
    setIndex(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="relative overflow-hidden bg-plum-deep px-6 py-20 sm:py-24">
      <div className="grain-layer" />
      <ClothEdge className="text-plum-deep" />

      <div className="shell relative">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
          <p className="eyebrow text-marigold">{eyebrow}</p>

          {/* One need is an appeal, not a choice — the buttons only appear
              once there is genuinely something to choose between. */}
          {count > 1 && (
            <div
              role="tablist"
              aria-label={eyebrow}
              onKeyDown={onKeyDown}
              className="flex flex-wrap items-center gap-2.5"
            >
              {needs.map((need, needIndex) => {
                const active = needIndex === index;
                return (
                  <button
                    key={need.href + need.label}
                    ref={(node) => {
                      tabs.current[needIndex] = node;
                    }}
                    type="button"
                    role="tab"
                    id={`${id}-tab-${needIndex}`}
                    aria-selected={active}
                    aria-controls={`${id}-panel-${needIndex}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setIndex(needIndex)}
                    className={`cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                      active
                        ? "bg-marigold text-plum-deep shadow-warm"
                        : "border-2 border-white/25 text-white/70 hover:border-white/60 hover:text-white"
                    }`}
                  >
                    {need.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/*
          Every need is rendered into the same grid cell, so the section is as
          tall as the longest of them and switching needs never jolts the page
          under the reader's thumb.
        */}
        <div className="mt-12 grid">
          {needs.map((need, needIndex) => {
            const active = needIndex === index;
            const icon = needIcons[need.href];
            const needFigures = figures[need.href] ?? [];

            return (
              <div
                key={need.href + need.label}
                role="tabpanel"
                id={`${id}-panel-${needIndex}`}
                aria-labelledby={`${id}-tab-${needIndex}`}
                // Everything on a hidden need leaves the tab order with it, so
                // a keyboard never lands on a button nobody can see.
                inert={!active}
                className={`col-start-1 row-start-1 grid items-center gap-14 transition-opacity duration-500 lg:grid-cols-[1.15fr_1fr] lg:gap-20 ${
                  active ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="text-white">
                  <SectionTitle>{need.heading}</SectionTitle>

                  {paragraphs(need.body).map((text) => (
                    <p
                      key={text}
                      className="mt-6 max-w-xl leading-relaxed text-white/65"
                    >
                      {text}
                    </p>
                  ))}

                  {/* Figures are read from the budget, so a need that has no
                      settled costing yet shows none rather than a guess. */}
                  {needFigures.length > 0 && (
                    <dl
                      className={`mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/15 ${
                        needFigures.length > 2
                          ? "sm:grid-cols-3"
                          : "sm:grid-cols-2"
                      }`}
                    >
                      {needFigures.map((figure) => (
                        <div key={figure.label} className="bg-plum-deep px-6 py-5">
                          <dt className="eyebrow text-white/50">{figure.label}</dt>
                          <dd className="font-display tabular mt-1.5 text-3xl font-semibold text-marigold">
                            {figure.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <div className="mt-9 flex flex-wrap items-center gap-4">
                    {/*
                      "Give to the kitchen" landing on a form that asks what you
                      would like to give to is a question already answered. The
                      panel's link names the project — it is the same link the
                      icon above is chosen by — so where it names one the button
                      carries it into the form. Where it does not, the form opens
                      as it always did.
                    */}
                    <ButtonLink href={giveHref(need.href)} icon="give">
                      {need.giveCta}
                    </ButtonLink>
                    <ButtonLink
                      href={need.href}
                      variant="ghost"
                      className="text-white"
                    >
                      {need.cta}
                    </ButtonLink>
                  </div>
                </div>

                {/*
                  A panel draws itself, and gets no card to do it in.

                  The white box used to be the frame for everything on this
                  side, which was right when the contents were a single diagram
                  needing something to sit on. What goes here now is a collage
                  of photographs, and a white box around those is a frame around
                  a set of frames — it shrinks the pictures to make room for
                  nothing.

                  The card survives for the fallback below, where there is a
                  lone icon and a line of status that would look abandoned on
                  the plum with nothing holding it.
                */}
                {panels[need.href] ?? (
                  <div className="overflow-hidden rounded-2xl bg-white shadow-warm-lg">
                    <div className="flex flex-col items-center px-8 py-10 text-center">
                      {icon && <Icon name={icon} className="h-20 w-20 text-plum" />}
                      <p className="eyebrow mt-6 text-plum">{need.label}</p>
                      {need.status && (
                        <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-smoke">
                          {need.status}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
