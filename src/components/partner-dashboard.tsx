import Link from "next/link";
import type { ReactNode } from "react";
import { getContent } from "@/cms/content";
import { NeedBar } from "@/components/need-meter";
import { NeedUpdates } from "@/components/need-updates";
import { PhotoStrip, type SitePhoto } from "@/components/photos";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { formatDay } from "@/lib/dates";
import {
  PLEDGE_LABELS,
  type Partner,
  type PartnerProject,
  type PledgeStatus,
  groupByProject,
  pledgeTowards,
} from "@/lib/giving";
import { usd } from "@/lib/money";
import { getGalleryPhotos } from "@/lib/photos";
import {
  listAreaGiftsForPartner,
  listNeedsForPartner,
  listPledgesForPartner,
  listUpdatesForPartner,
} from "@/lib/needs";

/**
 * One partner's giving, as they see it.
 *
 * Lives here rather than in the page because two screens render it: the church's
 * own dashboard at /partners/dashboard, and the preview in /app that lets Simon
 * look at what he is about to send somebody a password for. Those two must be
 * the same thing. A preview built from its own copy of this markup is a preview
 * that drifts, and a drifted preview is worse than none — it tells him a page is
 * right on the morning it stopped being right.
 *
 * So there is one component, one set of queries, and exactly one difference
 * between the two callers: what sits in the top-right corner, which they pass
 * in. Everything below that line is identical by construction.
 *
 * It takes a `Partner` rather than an id on purpose. Deciding *which* partner
 * this is, and whether the person asking is allowed to see them, is the caller's
 * job — the partner's own session on one side, `requireUser` on the other. A
 * component that looked a partner up by id would be one refactor away from being
 * the place that forgot to check.
 */
export async function PartnerDashboard({
  partner,
  action,
  notice,
}: {
  partner: Partner;
  /** Rendered beside the name — sign-out for them, a way back for /app. */
  action?: ReactNode;
  /** A strip above the name, inside the plum. Used by the /app preview. */
  notice?: ReactNode;
}) {
  const [needs, areaGifts, pledges, updates, site] = await Promise.all([
    listNeedsForPartner(partner.id),
    listAreaGiftsForPartner(partner.id),
    listPledgesForPartner(partner.id),
    listUpdatesForPartner(partner.id),
    getContent("site"),
  ]);

  const projects = groupByProject(needs, areaGifts);

  /*
    Photographs to stand in for progress notes nobody has written yet — see the
    Updates section below. Read only when they are wanted: a partner with
    updates, or with no kitchen giving, never pays for the directory listing.
  */
  const showsKitchen =
    updates.length === 0 &&
    projects.some((project) => project.area.id === "kitchen");

  const kitchenPhotos: SitePhoto[] = showsKitchen
    ? (await getGalleryPhotos())
        .filter((photo) => photo.src)
        .slice(0, 6)
        .map((photo) => ({
          src: photo.src,
          // The gallery keeps one line per photograph and uses it for both.
          alt: photo.caption,
          caption: photo.caption,
        }))
    : [];

  const active = pledges.filter((pledge) => pledge.status !== "declined");
  const totalClaimed = active.reduce((sum, pledge) => sum + pledge.amountCents, 0);
  const totalReceived = pledges
    .filter((pledge) => pledge.status === "received")
    .reduce((sum, pledge) => sum + pledge.amountCents, 0);
  const awaiting = totalClaimed - totalReceived;

  return (
    <>
      {/*
        The plum band this page opens with is not decoration.

        The site header is fixed, four rem tall, and deliberately has no colour
        of its own — it borrows whatever it sits over, which is why every other
        page begins with something dark. This page used to begin on cream, so
        the whole global nav rendered white on near-white and simply could not
        be read, on top of the church's own name. Opening on plum, like the rest
        of the site, is what makes the nav legible.
      */}
      <section className="relative overflow-hidden bg-plum-deep px-6 pt-20 pb-8 sm:pt-24">
        <div className="grain-layer" />

        <div className="shell relative">
          {notice}

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-marigold">Partner</p>
              <h1 className="font-display mt-3 text-4xl font-bold text-balance text-white sm:text-5xl">
                {partner.name}
              </h1>
              {partner.location && (
                <p className="mt-2 text-white/60">{partner.location}</p>
              )}
            </div>

            {action}
          </div>
        </div>
      </section>

      <div className="shell px-6 pb-24">
        {/*
          Below the seam, not straddling it. The tiles are plum-deep and so is
          the band above, so an overlap makes their top edge — and the label
          sitting in it — disappear into the background.
        */}
        <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/15 shadow-warm sm:grid-cols-3">
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
          label={projects.length === 1 ? "Project supported" : "Projects supported"}
          value={String(projects.length)}
          hint={
            needs.length > 0
              ? `Across ${needs.length} ${needs.length === 1 ? "item" : "items"}`
              : undefined
          }
        />
      </dl>

      {/*
        Emptiness is measured in pledges, not items: a church whose giving has
        all been towards things they described themselves has no items on this
        page and is certainly not somebody to greet with "nothing is recorded
        against you yet".
      */}
      {pledges.length === 0 ? (
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
          {projects.length > 0 && (
            <div className="mt-16">
              <p className="eyebrow text-plum">Your giving</p>
              <SectionTitle className="mt-3">What you have built</SectionTitle>
              <p className="mt-5 max-w-2xl leading-relaxed text-smoke">
                Gathered under the work you have partnered with us for. Where an
                item is still being funded, your share is on the left of the bar
                and the rest is everybody else&apos;s, shown only as a total —
                nobody else can see your figures either.
              </p>

              <ul className="mt-10 grid gap-5">
                {projects.map((project) => (
                  <Project key={project.area.id} project={project} />
                ))}
              </ul>
            </div>
          )}

          <div className="mt-20 grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
            <div>
              <p className="eyebrow text-plum">Updates</p>
              {/*
                Partnered with, not paid for. These churches are not customers
                who bought a kitchen; the money is one part of a thing they are
                in with the ministry, and the page they read should say so.
              */}
              <SectionTitle className="mt-3">
                The work you have partnered with us for
              </SectionTitle>
              <div className="mt-10">
                {/*
                  With nothing posted, a church that partnered with us on the
                  kitchen should not be shown an empty box — the kitchen is
                  built, and there are photographs of it. They are offered as
                  what they are: the work as it stands today, not dated progress
                  notes somebody wrote. Saying which is the difference between
                  showing them their kitchen and inventing a history for it.

                  Only for the kitchen, and only when they gave towards it. A
                  church whose money went to school fees has no business being
                  shown somebody else's building as though it were theirs.
                */}
                {updates.length === 0 && kitchenPhotos.length > 0 ? (
                  <>
                    <p className="mb-8 max-w-xl leading-relaxed text-smoke">
                      No progress notes have been posted yet. This is the kitchen
                      as it stands — the building you partnered with us to raise.
                    </p>
                    <PhotoStrip photos={kitchenPhotos} />
                    <p className="mt-6 text-sm text-smoke">
                      <Link
                        href="/projects/kitchen"
                        className="font-medium text-plum underline underline-offset-4"
                      >
                        See the whole kitchen project
                      </Link>
                    </p>
                  </>
                ) : (
                  <NeedUpdates
                    updates={updates}
                    showNeed
                    emptyNote="Nothing has been posted on your items yet. When work starts, progress and photographs appear here."
                  />
                )}
              </div>
            </div>

            <div>
              <p className="eyebrow text-plum">Your record</p>
              <SectionTitle className="mt-3">Every claim</SectionTitle>

              <ul className="mt-10 divide-y divide-sand-deep overflow-hidden rounded-2xl bg-white shadow-warm">
                {pledges.map((pledge) => (
                  <li key={pledge.id} className="p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      {/*
                        Two kinds of claim have no page to point at: a gift given
                        in the partner's own words, and one against an item that
                        is not published — a draft, or a budget line from work
                        already finished. Both are set in plain text rather than
                        as a link to a 404.
                      */}
                      {pledge.needSlug && pledge.needPublished ? (
                        <Link
                          href={`/needs/${pledge.needSlug}`}
                          className="font-medium hover:text-plum"
                        >
                          {pledge.needTitle}
                        </Link>
                      ) : (
                        <span className="font-medium">{pledgeTowards(pledge)}</span>
                      )}
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
    </>
  );
}

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

/**
 * One project, and this partner's share of it.
 *
 * The heading is the project rather than the item, and it is a link, because
 * that is the honest answer to what a church's money did. Six lines reading
 * cement, sand, ballast, drainage, jiko, roofing are a builder's merchant
 * receipt; "The kitchen build", with those six underneath it and the kitchen a
 * click away, is a kitchen.
 */
function Project({ project }: { project: PartnerProject }) {
  const { area } = project;

  return (
    <li className="rounded-2xl bg-white p-7 shadow-warm">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div>
          <p className="eyebrow text-smoke">
            {project.needs.length > 0
              ? `${project.needs.length} ${project.needs.length === 1 ? "item" : "items"}`
              : "Given towards"}
          </p>
          <h3 className="font-display mt-2 text-2xl font-semibold">
            <Link href={area.href} className="hover:text-plum">
              {area.label}
            </Link>
          </h3>
        </div>

        <div>
          <p className="eyebrow text-smoke">You gave</p>
          <p className="font-display tabular mt-1 text-3xl font-semibold text-green">
            {usd(project.yoursCents)}
          </p>
        </div>
      </div>

      {project.needs.length > 0 && (
        <ul className="mt-7 divide-y divide-sand-deep border-t border-sand-deep">
          {project.needs.map((need) => (
            <li key={need.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                {/*
                  Only published items are linked. A budget line from a finished
                  build is kept unpublished — the site has no reason to go on
                  asking for a thing that was paid for two years ago — and
                  /needs/[slug] serves published items only, so linking it would
                  send the one person who most deserves to see it to a 404.
                */}
                <h4 className="font-medium">
                  {need.published ? (
                    <Link href={`/needs/${need.slug}`} className="hover:text-plum">
                      {need.title}
                    </Link>
                  ) : (
                    need.title
                  )}
                </h4>
                <p className="font-display tabular text-lg font-semibold">
                  {usd(need.yoursCents)}
                  {need.yoursCents !== need.costCents && (
                    <span className="ml-1.5 text-sm font-normal text-smoke">
                      of {usd(need.costCents)}
                    </span>
                  )}
                </p>
              </div>

              {/*
                The bar is for items still being paid for. On one that is
                finished and fully yours it would be a full bar under a full bar,
                saying nothing twice.
              */}
              {!need.closed && need.ledger.openCents > 0 && (
                <>
                  <NeedBar ledger={need.ledger} className="mt-4" />
                  <p className="mt-2.5 text-sm text-smoke">
                    {usd(need.ledger.openCents)} of this is still open for
                    somebody else.
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {project.gift && (
        <p className="mt-6 border-t border-sand-deep pt-5 text-sm leading-relaxed text-smoke">
          {usd(project.gift.yoursCents)} of this was given towards{" "}
          {area.label.toLowerCase()} as a whole rather than against a single
          item, so it went where it was needed most.
        </p>
      )}
    </li>
  );
}
