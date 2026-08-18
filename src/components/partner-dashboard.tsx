import Link from "next/link";
import type { ReactNode } from "react";
import { getContent } from "@/cms/content";
import { Icon } from "@/components/icons";
import { NeedBar } from "@/components/need-meter";
import { NeedUpdates } from "@/components/need-updates";
import { PlaygroundEstimate } from "@/components/playground-estimate";
import { PhotoStrip, type SitePhoto } from "@/components/photos";
import { ProjectAccounts } from "@/components/project-accounts";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { type Appeal, getAppeals } from "@/lib/appeals";
import { formatDay } from "@/lib/dates";
import {
  NEED_AREAS,
  PLEDGE_LABELS,
  type NeedArea,
  type NeedWithLedger,
  type Partner,
  type PartnerProject,
  type PledgeStatus,
  areaOf,
  groupByProject,
  pledgeTowards,
} from "@/lib/giving";
import { disclosureFor, showsAccounts, stakeIn } from "@/lib/disclosure";
import { usd } from "@/lib/money";
import { getPlayground } from "@/lib/playground";
import {
  accountNoteOf,
  accountSet,
  visibilityOf,
} from "@/lib/project-accounts";
import { getGalleryPhotos } from "@/lib/photos";
import {
  getProjectBudget,
  getPublishedNeeds,
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
  const [needs, areaGifts, pledges, updates, published, site, accounts, appeals] =
    await Promise.all([
      listNeedsForPartner(partner.id),
      listAreaGiftsForPartner(partner.id),
      listPledgesForPartner(partner.id),
      listUpdatesForPartner(partner.id),
      getPublishedNeeds(),
      getContent("site"),
      getContent("projectAccounts"),
      getAppeals(),
    ]);

  const projects = groupByProject(needs, areaGifts);

  /*
    What is still short, split by whether they have a stake in it already.

    A church that built the kitchen and does not know three of its items were
    never reached is not being asked; it is being kept in the dark by a page
    that had room to say so. So the gap in their own project comes first, named
    as the same project they already gave to, and everything else follows under
    its own heading — an invitation rather than a bill.

    Read from the public list, so nothing appears here that is not already being
    asked for openly on /needs.
  */
  const open = published.filter(
    (need) => !need.closed && need.ledger.openCents > 0,
  );
  const theirAreas = new Set(projects.map((project) => project.area.id));
  const continuing = open.filter((need) => theirAreas.has(areaOf(need.area).id));
  const elsewhere = open.filter((need) => !theirAreas.has(areaOf(need.area).id));

  /*
    The rest of the ministry, offered as whole jobs rather than as items.

    Itemised needs are the better invitation and come first, but the kitchen is
    the only project anybody has broken into lines — so a church that built it
    has an `elsewhere` of nothing at all, and the playground, the bus and the
    streaming kit go unmentioned on the one page most likely to be read by
    somebody who would fund them. Those three are costed as single jobs in
    lib/appeals.ts, which is exactly the shape this section wants.

    Filtered against the projects they already have, so nobody is invited to
    take on a thing they are in the middle of paying for.
  */
  const newWays = appeals.filter((appeal) => !theirAreas.has(appeal.area.id));

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

  /*
    How far into the books this partner can see, worked out from what has
    actually arrived rather than from what anybody has put their name to. The
    rule, and why the accounts are not simply public any more, is in
    lib/disclosure.ts.
  */
  const disclosure = disclosureFor({
    partner,
    projects,
    receivedCents: totalReceived,
  });

  /*
    Whether one project's private figures are drawn on this page.

    Three questions now, not two. What Simon has said the papers are for (the
    switch in /app under Giving → Project accounts) and whether this partner has
    earned a reading of them are both in `showsAccounts`. The one in front of
    them is `stakeIn`: did their own money reach this project.

    That last one is what this page was missing. A verified church sits at the
    `everything` tier, `opensAccounts` says yes to every area, and the dashboard
    obligingly drew the lot — so the church that built the kitchen was handed the
    playground's costings, a page of frames nobody has bought, in a project they
    have never given towards. The books were theirs to read; the page was not
    theirs to be filled with. See lib/disclosure.ts.
  */
  const shows = (areaId: NeedArea) =>
    stakeIn(disclosure, areaId) &&
    showsAccounts({
      visibility: visibilityOf(accounts, areaId),
      disclosure,
      areaId,
    });

  /*
    Every project whose spending this partner may read, and what it spent.

    The two questions are asked in this order on purpose. Working out which
    areas are open first means the query for a set of accounts only runs for a
    partner who is allowed to see them — a church at the `everything` tier pays
    for one read per arm of the ministry, and everybody else pays for one per
    project they gave to. Reading all nine and then hiding eight would be the
    same page at nine times the cost, and would put figures nobody may see into
    the render tree to be dropped later, which is the shape that eventually
    leaks one.

    Filtered to projects with something actually recorded as bought. A project
    with nothing but open lines has no account to show — that is the ledger, and
    the partner's own share of it is already up the page.
  */
  const openAreas = NEED_AREAS.filter((area) => shows(area.id));

  const budgets = await Promise.all(
    openAreas.map(async (area) => ({
      area,
      note: accountNoteOf(accounts, area.id),
      budget: await getProjectBudget(area.id),
    })),
  );

  const spent = budgets.filter((entry) => entry.budget.spent.length > 0);

  /*
    The playground's costings, which are not spending and so are not in the loop
    above: a list of frames nobody has bought, held in the CMS rather than read
    off the ledger. Fetched only when it is going to be drawn — the ordinary
    partner never pays for it.
  */
  const showsPlayground = shows(accountSet("playground").area);
  const playgroundQuote = showsPlayground ? await getPlayground() : null;

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
              <SectionTitle>What you have built</SectionTitle>
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

          {/*
            The accounts, for the partners they were written for.

            This is the whole reason the tiers in lib/disclosure.ts exist. The
            kitchen's used to sit on the open web behind a button; a set of
            accounts naming what a ministry in Nairobi bought, what it paid, and
            what it is still short of is not a thing to leave lying about,
            however proud of it everyone is entitled to be.

            It used to be the kitchen's alone, because that was the one project
            anybody had reconciled. Now every project keeps its accounts the same
            way and this draws whichever of them this partner has earned — so a
            church that paid for a term of school transport reads what the
            transport cost, without anybody having to write it a page.
          */}
          {spent.length > 0 && (
            <div className="mt-20">
              <SectionTitle>Where the money went</SectionTitle>
              <p className="mt-5 max-w-2xl leading-relaxed text-smoke">
                {spent.length === 1
                  ? "Our own reconciliation of this work, line by line: what each thing was estimated at, what it actually cost, and what the money never reached."
                  : "Our own reconciliation of the work you have a stake in, line by line: what each thing was estimated at, what it actually cost, and what the money never reached."}{" "}
                It is not published on the site — it is here because you have a
                stake in it.
              </p>

              <div className="mt-10 space-y-10">
                {spent.map(({ area, budget, note }) => (
                  <ProjectAccounts
                    key={area.id}
                    budget={budget}
                    title={`${area.label} — where the money went`}
                    note={note}
                    footnote={
                      <>
                        Figures in USD. {usd(budget.spentCents)} spent across{" "}
                        {budget.spent.length}{" "}
                        {budget.spent.length === 1 ? "line" : "lines"}
                        {budget.outstanding.length > 0 &&
                          `; the items in the second table were never reached`}
                        .
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/*
            The playground, costed. Not an account of money spent — nothing has
            been bought yet — but the same judgement applies to it and for a
            sharper reason: it is a list of steel frames due to be delivered to
            the school yard, with what each one is worth. The public page argues
            the case and gives the total; the lines are here.

            Filed under the playground itself, which is a project a gift can
            name now rather than a corner of the academy's page.
          */}
          {showsPlayground && playgroundQuote && (
            <div className="mt-20">
              <SectionTitle>
                The playground, line by line
              </SectionTitle>
              <p className="mt-5 max-w-2xl leading-relaxed text-smoke">
                What replacing the yard would take, item by item, in shillings
                and dollars. These are our own figures, built from ordinary
                Nairobi supplier rates and sized to the yard, and a quote from a
                supplier will move some of them.
              </p>

              <div className="mt-10">
                <PlaygroundEstimate quote={playgroundQuote} />
              </div>
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
              <SectionTitle>Every claim</SectionTitle>

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

          {(open.length > 0 || newWays.length > 0) && (
            <div className="mt-24 border-t border-sand-deep pt-16">
              {continuing.length > 0 && (
                <>
                  <SectionTitle>More of what you started</SectionTitle>
                  <p className="mt-5 max-w-2xl leading-relaxed text-smoke">
                    {continuing.length === 1
                      ? "One item"
                      : `${continuing.length} items`}{" "}
                    in the work you have already partnered with us for{" "}
                    {continuing.length === 1 ? "is" : "are"} still short —{" "}
                    <strong className="font-semibold text-charcoal">
                      {usd(
                        continuing.reduce(
                          (sum, need) => sum + need.ledger.openCents,
                          0,
                        ),
                      )}
                    </strong>{" "}
                    between them. No obligation whatever; you have done a great
                    deal already. It is here because you of all people should not
                    have to go looking for it.
                  </p>

                  <ul className="mt-10 grid gap-4 sm:grid-cols-2">
                    {continuing.map((need) => (
                      <OpenNeed key={need.id} need={need} />
                    ))}
                  </ul>
                </>
              )}

              {/*
                The rest of the ministry, under its own heading and in its own
                register.

                This is not the section above with different rows in it. That
                one is the work they are already in, and it can say "you of all
                people should not have to go looking for it" because they have a
                stake in every line of it. This one is a stranger's project being
                mentioned to somebody who has no obligation to it whatever, and
                the copy has to carry that or the page turns into a bill. Hence
                "no part of what you have already done" — said plainly, once, so
                that nobody has to wonder whether the kitchen is now thought
                insufficient.
              */}
              {(newWays.length > 0 || elsewhere.length > 0) && (
                <div className={continuing.length > 0 ? "mt-20" : ""}>
                  <SectionTitle>New ways to partner</SectionTitle>
                  <p className="mt-5 max-w-2xl leading-relaxed text-smoke">
                    The other work going on here, in case any of it is close to
                    your heart. This is no part of what you have already done and
                    carries no expectation at all — it is here so that you can
                    see it, not so that you will answer it.
                  </p>

                  {newWays.length > 0 && (
                    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {newWays.map((appeal) => (
                        <WholeProject key={appeal.area.id} appeal={appeal} />
                      ))}
                    </div>
                  )}

                  {elsewhere.length > 0 && (
                    <>
                      <h3 className="font-display mt-14 text-xl font-semibold">
                        Items in the rest of the ministry
                      </h3>
                      <p className="mt-3 max-w-2xl leading-relaxed text-smoke">
                        Costed line by line, with what is left on each.
                      </p>

                      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                        {elsewhere.slice(0, 6).map((need) => (
                          <OpenNeed key={need.id} need={need} />
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              <ButtonLink href="/needs" className="mt-12">
                See everything that&apos;s needed
              </ButtonLink>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
}

/**
 * One thing still short, offered to a partner who is already signed in.
 *
 * The link goes to the item's own page rather than to /give, because that page
 * carries a giving form already locked to this item — so "engage with this"
 * is one tap and no dropdown to get wrong.
 */
function OpenNeed({ need }: { need: NeedWithLedger }) {
  return (
    <li className="rounded-2xl bg-white p-6 shadow-warm">
      <p className="eyebrow text-smoke">{areaOf(need.area).label}</p>
      <h4 className="font-display mt-2 text-lg font-semibold">
        <Link href={`/needs/${need.slug}`} className="hover:text-plum">
          {need.title}
        </Link>
      </h4>

      {need.summary && (
        <p className="mt-2 text-sm leading-relaxed text-smoke">{need.summary}</p>
      )}

      <NeedBar ledger={need.ledger} className="mt-5" />

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-smoke">
          <span className="font-display tabular text-lg font-semibold text-charcoal">
            {usd(need.ledger.openCents)}
          </span>{" "}
          of {usd(need.costCents)} still open
        </p>
        <Link
          href={`/needs/${need.slug}`}
          className="text-sm font-bold text-plum underline underline-offset-4 hover:text-green"
        >
          Partner with this
        </Link>
      </div>
    </li>
  );
}

/**
 * A whole project, offered to a partner who has no stake in it.
 *
 * The sister of `OpenNeed`, and the differences are all the ones between an item
 * and a job. No meter, because these are not itemised and a bar across one would
 * be a running total of what the ministry is holding in the bank — the argument
 * is in lib/appeals.ts. No "still open", for the same reason: a balance is
 * something only a ledger has.
 *
 * It leads with the work rather than the figure. Somebody reading this has
 * already given to something else, so the question in front of them is whether
 * they care about a playground, not whether $6,000 is a good price for one.
 */
function WholeProject({ appeal }: { appeal: Appeal }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-7 shadow-warm">
      <Icon name={appeal.area.icon} className="h-8 w-8 text-plum" />
      <h4 className="font-display mt-4 text-xl leading-snug font-semibold">
        <Link href={appeal.area.href} className="hover:text-plum">
          {appeal.area.label}
        </Link>
      </h4>
      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-smoke">
        {appeal.summary}
      </p>

      <p className="eyebrow mt-6 text-smoke">The whole job</p>
      <p className="font-display tabular mt-1 text-2xl font-semibold text-plum">
        {usd(appeal.costCents)}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={`/give?for=${appeal.area.id}#pledge`}
          className="text-sm font-bold text-plum underline underline-offset-4 hover:text-green"
        >
          Give to this
        </Link>
        <Link
          href={appeal.area.href}
          className="text-sm text-smoke underline underline-offset-4 hover:text-plum"
        >
          See the work
        </Link>
      </div>
    </div>
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
