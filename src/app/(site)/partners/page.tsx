import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Icon, type IconName } from "@/components/icons";
import { ButtonLink, PageHero } from "@/components/ui";
import { CODE_LIFETIME } from "@/lib/partner-codes";
import { currentPartner, isPartnerAreaConfigured } from "@/lib/partners";
import { PartnerLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Partner sign in",
  description:
    "Anyone who has given can sign in to see everything they have supported, and the progress on it.",
  // Nothing here is for a search engine, and a church's giving is nobody's
  // business but theirs.
  robots: { index: false, follow: false },
};

const promises: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "globe",
    title: "A code, not a password",
    body: "We email a code to the address on your gift. Type it in — that is the whole of it.",
  },
  {
    icon: "give",
    title: "Everything you have given",
    body: "Every item you supported, what you put towards it, and what has been received against it.",
  },
  {
    icon: "trowel",
    title: "The work you paid for",
    body: "Progress on the items you backed, posted from Nairobi with photographs.",
  },
  {
    icon: "church",
    title: "Yours, and only yours",
    body: "Nobody else sees your giving, and you never see theirs.",
  },
];

async function PartnerEntrance() {
  const [content, site] = await Promise.all([
    getContent("needs"),
    getContent("site"),
  ]);

  // Already signed in — no reason to make them read the door twice.
  if (await currentPartner()) redirect("/partners/dashboard");

  return (
    <div className="shell grid items-start gap-14 lg:grid-cols-[1fr_26rem] lg:gap-20">
      <div>
        {paragraphs(content.partnerNote).map((text) => (
          <p key={text} className="max-w-xl text-lg leading-relaxed text-smoke">
            {text}
          </p>
        ))}

        <ul className="mt-12 space-y-8">
          {promises.map((promise) => (
            <li key={promise.title} className="flex gap-5">
              <Icon name={promise.icon} className="h-8 w-8 shrink-0 text-plum" />
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {promise.title}
                </h2>
                <p className="mt-2 max-w-lg leading-relaxed text-smoke">
                  {promise.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-2xl border border-dashed border-smoke/30 bg-sand p-7">
          <p className="eyebrow text-plum">No code arriving?</p>
          <p className="mt-3 max-w-xl leading-relaxed text-smoke">
            Try the address the gift was given under — a treasurer&apos;s, or the
            church office. If you gave by bank transfer or M-Pesa and were never
            asked for an address, write to{" "}
            <a
              href={`mailto:${site.email}?subject=${encodeURIComponent("Partner sign in")}`}
              className="font-medium text-plum underline underline-offset-4"
            >
              {site.email}
            </a>{" "}
            and we will put it right. You never need to sign in to give.
          </p>
          <ButtonLink href="/needs" variant="secondary" className="mt-6">
            See what&apos;s needed
          </ButtonLink>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-warm-lg">
        <h2 className="font-display text-2xl font-semibold">Sign in</h2>
        <p className="mt-2 mb-7 text-sm leading-relaxed text-smoke">
          No password. We email you a code that lasts {CODE_LIFETIME}.
        </p>
        <PartnerLoginForm />

        {/*
          Small, and at the bottom, because it is for the handful of churches
          Simon set a password up for before the code door existed. Everybody
          else should never think about it. See ./password/page.tsx.
        */}
        <p className="mt-7 border-t border-black/10 pt-6 text-sm leading-relaxed text-smoke">
          Given a password before?{" "}
          <Link
            href="/partners/password"
            className="font-medium text-plum underline underline-offset-4"
          >
            Sign in with it here
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="shell max-w-2xl">
      <p className="leading-relaxed text-smoke">
        The partner area is not switched on yet. Nothing is wrong with your
        account — this part of the site is still being set up.
      </p>
      <ButtonLink href="/needs" variant="secondary" className="mt-7">
        See what&apos;s needed
      </ButtonLink>
    </div>
  );
}

export default function PartnersPage() {
  return (
    <>
      <PageHero
        title="Your giving, in full"
        intro="Every item you have supported, what has arrived against each one, and how the work is going."
      />

      <section className="px-6 py-20 sm:py-24">
        {isPartnerAreaConfigured() ? (
          <Suspense
            fallback={
              <div className="shell">
                <p className="text-smoke">Loading…</p>
              </div>
            }
          >
            <PartnerEntrance />
          </Suspense>
        ) : (
          <NotConfigured />
        )}
      </section>
    </>
  );
}
