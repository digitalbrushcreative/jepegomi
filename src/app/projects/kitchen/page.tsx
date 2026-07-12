import type { Metadata } from "next";
import Image from "next/image";
import { BudgetPanel } from "@/components/budget-panel";
import { PhotoGallery } from "@/components/photo-gallery";
import { ButtonLink } from "@/components/ui";
import {
  beforeAfter,
  donation,
  photos,
  progress,
  remainingNeeds,
  stats,
} from "@/content/kitchen";
import { giving, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kitchen Build",
  description:
    "From open fires to a proper kitchen — progress on the Jepegomi Academy kitchen, funded by Encounter Church.",
};

const storyPoints = [
  <>
    Children were eating meals cooked{" "}
    <strong className="text-charcoal">outdoors over open fires</strong>
  </>,
  <>No proper kitchen, store room, or dining space</>,
  <>
    Encounter Church donated{" "}
    <strong className="text-charcoal">
      ${donation.amountUsd.toLocaleString("en-US")}
    </strong>{" "}
    to fix that
  </>,
  <>
    Kitchen now{" "}
    <strong className="text-charcoal">
      {progress.percentComplete}% complete
    </strong>{" "}
    — walls up, roof on
  </>,
  <>Final finishes in progress — see &ldquo;Still to complete&rdquo; below</>,
];

const academyFacts = [
  { icon: "🙏", text: `${site.leaders} — ${site.longName}` },
  { icon: "📍", text: site.location },
  { icon: "🍲", text: "Daily meals: porridge (morning) + cooked lunch" },
  { icon: "👦", text: "50+ children fed — many can't afford meals at home" },
  {
    icon: "🌍",
    text: "Also runs: church, Bible school, digital outreach, school transport",
  },
];

/** Pot filled to the completion percentage — the report's progress indicator. */
function ProgressPot({ percent }: { percent: number }) {
  const potTop = 28;
  const potBottom = 88;
  const fillY = potTop + (potBottom - potTop) * (1 - percent / 100);

  return (
    <svg
      width="88"
      height="96"
      viewBox="0 0 88 96"
      role="img"
      aria-label={`Kitchen ${percent}% complete`}
    >
      <defs>
        <clipPath id="pot-shape">
          <path d="M14 28 Q11 31 11 39 L15 80 Q15 88 24 88 L64 88 Q73 88 73 80 L77 39 Q77 31 74 28 Z" />
        </clipPath>
        <linearGradient id="pot-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(74,124,42,0.6)" />
          <stop offset="100%" stopColor="rgba(74,124,42,0.25)" />
        </linearGradient>
      </defs>
      <rect
        x="0"
        y={fillY}
        width="88"
        height={potBottom - fillY}
        fill="url(#pot-fill)"
        clipPath="url(#pot-shape)"
      />
      <path
        d="M14 28 Q11 31 11 39 L15 80 Q15 88 24 88 L64 88 Q73 88 73 80 L77 39 Q77 31 74 28 Z"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2"
      />
      <rect
        x="9"
        y="24"
        width="70"
        height="8"
        rx="4"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
      />
      <path
        d="M9 32 Q2 32 2 24 Q2 16 9 16"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
      />
      <path
        d="M79 32 Q86 32 86 24 Q86 16 79 16"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
      />
      <path
        d="M34 20 Q36 13 34 6"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M44 18 Q46 10 44 2"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M54 20 Q56 13 54 6"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BeforeAfterCard({
  card,
  tone,
}: {
  card: typeof beforeAfter.before | typeof beforeAfter.after;
  tone: "before" | "after";
}) {
  return (
    <div className="overflow-hidden rounded-sm">
      <p
        className={`label-mono px-5 py-3 text-white ${
          tone === "before" ? "bg-[#7a6a72]" : "bg-plum"
        }`}
      >
        {card.heading}
      </p>
      <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-[#d8cfd4] to-[#c4b8be]">
        {card.src ? (
          <Image
            src={card.src}
            alt={card.alt}
            fill
            sizes="(max-width: 768px) 100vw, 470px"
            className="object-cover"
          />
        ) : (
          <p className="px-5 text-center text-sm leading-relaxed text-black/25">
            📷 Photo to be added
          </p>
        )}
      </div>
      <ul className="space-y-1.5 bg-white px-5 py-4">
        {card.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2 text-sm text-smoke">
            <span aria-hidden="true" className="font-bold text-plum">
              ·
            </span>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-plum-deep px-6 py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-[480px] w-[480px] rounded-full bg-plum/35"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 sm:flex-row sm:items-start">
          <div className="flex-1">
            <p className="label-mono flex items-center gap-3 text-white/45">
              <span aria-hidden="true" className="h-px w-7 bg-plum-light" />
              Funded by {donation.donor} · {donation.donorLocation}
            </p>

            <Image
              src="/logos/food-at-school.png"
              alt="Food at School"
              width={287}
              height={163}
              priority
              className="mt-6 h-32 w-auto"
            />

            <h1 className="sr-only">
              Food at School — Kitchen Build progress, Jepegomi Academy
            </h1>

            <ul className="mt-8 max-w-xl">
              {[
                <>
                  Donor:{" "}
                  <strong className="font-medium text-white">
                    {donation.donor}, {donation.donorLocation}
                  </strong>
                </>,
                <>
                  Gift:{" "}
                  <strong className="font-medium text-white">
                    ${donation.amountUsd.toLocaleString("en-US")}
                  </strong>{" "}
                  to build a dedicated kitchen
                </>,
                <>Location: Jepegomi Academy, Nairobi, Kenya</>,
                <>
                  Impact: Hot meals daily for{" "}
                  <strong className="font-medium text-white">
                    50+ children
                  </strong>
                </>,
                <>
                  Status:{" "}
                  <strong className="font-medium text-white">
                    {progress.percentComplete}% complete
                  </strong>{" "}
                  — structure done, finishing underway
                </>,
              ].map((item, index) => (
                <li
                  key={index}
                  className="flex items-baseline gap-2.5 border-b border-white/10 py-2 text-sm font-light text-white/70"
                >
                  <span aria-hidden="true" className="text-green-light">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <ProgressPot percent={progress.percentComplete} />
            <p className="label-mono mt-3 text-white/35">Kitchen complete</p>
            <p className="font-display text-6xl leading-none font-bold text-white">
              {progress.percentComplete}%
            </p>
            <p className="mt-1 text-sm text-white/40">{progress.caption}</p>
          </div>
        </div>
      </section>

      <div className="grid bg-plum sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-b border-white/10 px-8 py-10 text-center last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
          >
            <p className="font-display text-4xl leading-none font-bold text-white">
              {stat.value}
            </p>
            <p className="label-mono mt-2.5 text-white/45">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2">
          <div>
            <p className="label-mono text-plum">The Story</p>
            <h2 className="font-display mt-4 text-3xl leading-tight font-bold sm:text-4xl">
              {donation.donor} · Palmyra PA
              <br />→ Jepegomi Academy · Nairobi
            </h2>
            <ul className="mt-7">
              {storyPoints.map((point, index) => (
                <li
                  key={index}
                  className="flex items-baseline gap-2.5 border-b border-sand py-2.5 leading-relaxed text-smoke"
                >
                  <span aria-hidden="true" className="text-plum">
                    —
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-sm bg-green p-9">
            <p className="label-mono text-white/45">About Jepegomi Academy</p>
            <p className="font-display mt-5 text-xl leading-snug font-bold text-white">
              &ldquo;Quality Education With Values&rdquo;
            </p>
            <div className="mt-7">
              {academyFacts.map((fact) => (
                <div
                  key={fact.text}
                  className="flex gap-3.5 border-t border-white/15 py-4 first:border-t-0 first:pt-0"
                >
                  <span aria-hidden="true" className="text-xl">
                    {fact.icon}
                  </span>
                  <p className="text-sm leading-relaxed text-white/80">
                    {fact.text}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-sand px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="label-mono text-center text-plum">Then &amp; Now</p>
          <h2 className="font-display mt-3 text-center text-3xl font-bold sm:text-4xl">
            From open fires to a proper kitchen
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <BeforeAfterCard card={beforeAfter.before} tone="before" />
            <BeforeAfterCard card={beforeAfter.after} tone="after" />
          </div>
        </div>
      </section>

      <section className="bg-charcoal px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="label-mono text-center text-white/35">Photo Journal</p>
          <h2 className="font-display mt-3 text-center text-3xl font-bold text-white sm:text-4xl">
            Watching it come together
          </h2>
          <p className="mt-3 mb-10 text-center text-sm text-white/35">
            {photos.length} photos · tap any to view full size
          </p>
          <PhotoGallery photos={photos} />
        </div>
      </section>

      <section className="bg-plum px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <p className="label-mono text-center text-white/40">
            Still to Complete
          </p>
          <h2 className="font-display mt-3 text-center text-3xl font-bold text-white sm:text-4xl">
            What the final stretch looks like
          </h2>
          <div className="mt-12 grid gap-3.5 sm:grid-cols-2">
            {remainingNeeds.map((need) => (
              <div
                key={need.text}
                className="flex gap-3.5 rounded-sm border border-white/15 bg-white/8 px-5 py-6"
              >
                <span aria-hidden="true" className="text-xl">
                  {need.icon}
                </span>
                <p className="text-sm leading-relaxed text-white/80">
                  {need.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BudgetPanel />

      <section className="bg-charcoal px-6 py-20 text-center">
        <p className="label-mono text-white/30">Partner With Us</p>
        <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl">
          Help us finish the kitchen
        </h2>
        <p className="mt-3 text-sm text-white/40">
          {giving.bank} · {giving.accountName}
        </p>

        <div className="mx-auto mt-10 max-w-sm rounded-sm border border-white/10 bg-white/5 p-8 text-left">
          <p className="label-mono text-white/30">Bank</p>
          <p className="mt-1.5 text-xl font-semibold text-white">
            {giving.bank}
          </p>
          <div className="mt-5">
            <p className="label-mono text-white/30">Account name</p>
            <p className="mt-1 font-medium text-white">{giving.accountName}</p>
          </div>
          <div className="mt-4">
            <p className="label-mono text-white/30">Account number</p>
            <p className="font-mono mt-1 font-medium text-white">
              {giving.accountNumber}
            </p>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-white/30">
            {giving.reference}
          </p>
        </div>

        <ButtonLink href="/give" className="mt-8">
          Full giving details
        </ButtonLink>
      </section>
    </>
  );
}
