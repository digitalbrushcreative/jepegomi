import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getContent } from "@/cms/content";
import { NeedBar } from "@/components/need-meter";
import { NeedUpdates } from "@/components/need-updates";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { formatDay } from "@/lib/dates";
import { PLEDGE_LABELS, type PledgeStatus, areaOf } from "@/lib/giving";
import { usd } from "@/lib/money";
import {
  listNeedsForPartner,
  listPledgesForPartner,
  listUpdatesForPartner,
} from "@/lib/needs";
import { currentPartner } from "@/lib/partners";
import { partnerSignOutAction } from "../actions";

export const metadata: Metadata = {
  title: "Your giving",
  robots: { index: false, follow: false },
};

const statusStyles: Record<PledgeStatus, string> = {
  pending: "bg-marigold/15 text-clay",
  promised: "bg-plum/10 text-plum",
  received: "bg-green/12 text-green",
  declined: "bg-black/6 text-smoke",
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-plum-deep px-7 py-6">
      <dt className="eyebrow text-white/50">{label}</dt>
      <dd className="font-display tabular mt-1.5 text-3xl font-semibold text-marigold">
        {value}
      </dd>
      {hint && <p className="mt-1.5 text-xs text-white/45">{hint}</p>}
    </div>
  );
}

async function Dashboard() {
  const partner = await currentPartner();
  if (!partner) redirect("/partners");

  const [needs, pledges, updates, site] = await Promise.all([
    listNeedsForPartner(partner.id),
    listPledgesForPartner(partner.id),
    listUpdatesForPartner(partner.id),
    getContent("site"),
  ]);

  const active = pledges.filter((pledge) => pledge.status !== "declined");
  const totalClaimed = active.reduce((sum, pledge) => sum + pledge.amountCents, 0);
  const totalReceived = pledges
    .filter((pledge) => pledge.status === "received")
    .reduce((sum, pledge) => sum + pledge.amountCents, 0);
  const awaiting = totalClaimed - totalReceived;

  return (
    <div className="shell">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-plum">Partner</p>
          <h1 className="font-display mt-3 text-4xl font-bold text-balance sm:text-5xl">
            {partner.name}
          </h1>
          {partner.location && (
            <p className="mt-2 text-smoke">{partner.location}</p>
          )}
        </div>

        <form action={partnerSignOutAction}>
          <button
            type="submit"
            className="cursor-pointer rounded-full border-2 border-black/12 px-6 py-2.5 text-sm font-bold text-smoke transition-colors hover:border-plum hover:text-plum"
          >
            Sign out
          </button>
        </form>
      </div>

      <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/15 sm:grid-cols-3">
        <Stat
          label="Given so far"
          value={usd(totalReceived)}
          hint="Arrived and recorded"
        />
        <Stat
          label="Still to send"
          value={usd(awaiting)}
          hint={awaiting > 0 ? "Promised, not yet received" : "Nothing outstanding"}
        />
        <Stat
          label={needs.length === 1 ? "Item supported" : "Items supported"}
          value={String(needs.length)}
        />
      </dl>

      {needs.length === 0 ? (
        <div className="mt-14 rounded-2xl border border-dashed border-smoke/30 bg-sand p-8">
          <p className="max-w-xl leading-relaxed text-smoke">
            Nothing is recorded against {partner.name} yet. When you claim an
            item it appears here, along with the progress on it.
          </p>
          <ButtonLink href="/needs" className="mt-7">
            See what&apos;s needed
          </ButtonLink>
        </div>
      ) : (
        <>
          <div className="mt-16">
            <p className="eyebrow text-plum">Your items</p>
            <SectionTitle className="mt-3">What you have supported</SectionTitle>
            <p className="mt-5 max-w-2xl leading-relaxed text-smoke">
              Your share is on the left of each bar; the rest of the bar is
              everybody else&apos;s, shown only as a total. Nobody else can see
              your figures either.
            </p>

            <ul className="mt-10 grid gap-5">
              {needs.map((need) => {
                const area = areaOf(need.area);
                return (
                  <li
                    key={need.id}
                    className="rounded-2xl bg-white p-7 shadow-warm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
                      <div>
                        <p className="eyebrow text-smoke">{area.label}</p>
                        <h3 className="font-display mt-2 text-xl font-semibold">
                          <Link
                            href={`/needs/${need.slug}`}
                            className="hover:text-plum"
                          >
                            {need.title}
                          </Link>
                        </h3>
                      </div>

                      <dl className="flex gap-x-9 gap-y-3">
                        <div>
                          <dt className="eyebrow text-smoke">You gave</dt>
                          <dd className="font-display tabular mt-1 text-2xl font-semibold text-green">
                            {usd(need.yoursCents)}
                          </dd>
                        </div>
                        <div>
                          <dt className="eyebrow text-smoke">Item cost</dt>
                          <dd className="font-display tabular mt-1 text-2xl font-semibold">
                            {usd(need.costCents)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <NeedBar ledger={need.ledger} className="mt-6" />

                    <p className="mt-3 text-sm text-smoke">
                      {need.closed
                        ? "Finished."
                        : need.ledger.openCents > 0
                          ? `${usd(need.ledger.openCents)} of this is still open for somebody else.`
                          : "Fully claimed."}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-20 grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
            <div>
              <p className="eyebrow text-plum">Updates</p>
              <SectionTitle className="mt-3">
                The work you are paying for
              </SectionTitle>
              <div className="mt-10">
                <NeedUpdates
                  updates={updates}
                  showNeed
                  emptyNote="Nothing has been posted on your items yet. When work starts, progress and photographs appear here."
                />
              </div>
            </div>

            <div>
              <p className="eyebrow text-plum">Your record</p>
              <SectionTitle className="mt-3">Every claim</SectionTitle>

              <ul className="mt-10 divide-y divide-sand-deep overflow-hidden rounded-2xl bg-white shadow-warm">
                {pledges.map((pledge) => (
                  <li key={pledge.id} className="p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <Link
                        href={`/needs/${pledge.needSlug}`}
                        className="font-medium hover:text-plum"
                      >
                        {pledge.needTitle}
                      </Link>
                      <span className="font-display tabular text-lg font-semibold">
                        {usd(pledge.amountCents)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span
                        className={`eyebrow rounded-full px-3 py-1 ${statusStyles[pledge.status]}`}
                      >
                        {PLEDGE_LABELS[pledge.status]}
                      </span>
                      <span className="text-xs text-smoke">
                        Claimed {formatDay(pledge.createdAt)}
                        {pledge.receivedAt &&
                          ` · received ${formatDay(pledge.receivedAt)}`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-sm leading-relaxed text-smoke">
                Something not right? Write to{" "}
                <a
                  href={`mailto:${site.email}`}
                  className="font-medium text-plum underline underline-offset-4"
                >
                  {site.email}
                </a>{" "}
                and we will check it against the books.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PartnerDashboardPage() {
  return (
    <section className="px-6 pt-16 pb-24">
      <Suspense
        fallback={
          <div className="shell">
            <p className="text-smoke">Loading…</p>
          </div>
        }
      >
        <Dashboard />
      </Suspense>
    </section>
  );
}
