import Link from "next/link";
import { redirect } from "next/navigation";
import { NeedBar } from "@/components/need-meter";
import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { formatDay } from "@/lib/dates";
import { PLEDGE_LABELS, areaOf, pledgeTowards } from "@/lib/giving";
import { usd } from "@/lib/money";
import {
  listGeneralPledges,
  listNeeds,
  listOpenPledges,
  listParts,
} from "@/lib/needs";
import { buildProjects } from "@/lib/projects";
import { PageHeader, Stat } from "../ui";
import {
  EditPartForm,
  NewNeedForm,
  NewPartForm,
  PledgeActions,
  SeedKitchenButton,
} from "./need-forms";

/**
 * The ledger, from Simon's side.
 *
 * The page leads with what is waiting on him rather than with the list of
 * items, because the list is a thing he reads occasionally and the queue is a
 * thing he has to act on: a claim nobody confirms is a church that gave and
 * never heard back.
 */
export default async function AdminNeedsPage() {
  const user = await currentUser();
  if (!user) redirect("/app");

  await ensureSchema();

  const [needs, open, general, parts] = await Promise.all([
    listNeeds(),
    listOpenPledges(),
    listGeneralPledges(),
    listParts(),
  ]);

  /*
    The same grouping the public pages use, run over every item rather than the
    published ones. That is the point of using it here: this is the only screen
    that shows what the sequence is actually doing — which part is open, which
    is waiting, and on what — and it must be the same calculation, or /app will
    say a part is open on a day /needs does not offer it.
  */
  const projects = buildProjects(needs, parts);

  /*
    The queue is only the claims that have an item to open. A gift towards
    something a giver described themselves has no item page to act on, so it is
    handled where it lives — in its own section further down, which shows all of
    them rather than only the ones still waiting.
  */
  const waiting = open.filter((pledge) => pledge.needId);
  const generalWaiting = general.filter(
    (pledge) => pledge.status === "pending" || pledge.status === "promised",
  );

  const totalOpen = needs
    .filter((need) => !need.closed)
    .reduce((sum, need) => sum + need.ledger.openCents, 0);
  const totalReceived = needs.reduce(
    (sum, need) => sum + need.ledger.receivedCents,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Needs"
        intro={
          <>
            Everything the ministry is short of, with the price on it. A church
            can take all of an item or part of one; whatever is left stays open
            for somebody else. These appear at{" "}
            <Link
              href="/needs"
              className="font-medium text-plum underline underline-offset-4"
            >
              /needs
            </Link>{" "}
            as soon as they are ticked to show.
          </>
        }
      />

      {needs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Received in total" value={usd(totalReceived)} tone="good" />
          <Stat label="Still open" value={usd(totalOpen)} />
          <Stat
            label="Claims waiting"
            value={waiting.length + generalWaiting.length}
            tone={waiting.length + generalWaiting.length > 0 ? "waiting" : "plain"}
          />
        </div>
      )}

      {/* ------------------------------------------------ the queue */}
      {waiting.length > 0 && (
        <section className="mt-12 rounded border border-marigold/40 bg-marigold/8 p-6">
          <h2 className="font-display text-xl font-bold">
            {waiting.length} {waiting.length === 1 ? "claim" : "claims"} waiting on
            you
          </h2>
          {/*
            This lists every pending claim, which since Pesapal includes the few
            minutes a card or M-Pesa payment is in flight — those are pending
            too, until Pesapal confirms them. So the wording cannot simply say
            "these are waiting on you": it has to account for the one that will
            settle itself while he is looking at it. Better a sentence that
            explains the case than Simon emailing account details to somebody
            who paid ninety seconds ago.
          */}
          <p className="mt-2 text-sm leading-relaxed text-smoke">
            A claim holds its amount against the item from the moment it is made,
            so nobody else is asked for it. Send the account details, and mark it
            received when the money lands. Gifts paid on the site by card or
            M-Pesa mark themselves received — if one shows here, its payment is
            still going through, and it will clear on its own.
          </p>

          <ul className="mt-6 divide-y divide-black/8 rounded border border-black/8 bg-white">
            {waiting.map((pledge) => (
              <li
                key={pledge.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {pledge.partnerName ?? "Somebody"} —{" "}
                    <span className="tabular">{usd(pledge.amountCents)}</span>
                  </p>
                  <p className="mt-1 text-sm text-smoke">
                    towards {pledgeTowards(pledge)} · {PLEDGE_LABELS[pledge.status]}{" "}
                    · {formatDay(pledge.createdAt)}
                  </p>
                  {pledge.partnerEmail && (
                    <a
                      href={`mailto:${pledge.partnerEmail}?subject=${encodeURIComponent(`Giving to ${pledgeTowards(pledge)}`)}`}
                      className="mt-1 inline-block font-mono text-xs text-plum underline underline-offset-4"
                    >
                      {pledge.partnerEmail}
                    </a>
                  )}
                </div>

                <Link
                  href={`/app/needs/${pledge.needId}`}
                  className="rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum"
                >
                  Open the item
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --------------------------------- gifts not against an item */}
      {general.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">
            Gifts not against an item
          </h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-smoke">
            Somebody who came to{" "}
            <Link href="/give" className="font-medium text-plum underline underline-offset-4">
              /give
            </Link>{" "}
            and said in their own words what they wanted to support, rather than
            taking part of a costed item. These count towards no meter and appear
            on no public page — this is the only screen they exist on, which is
            why the finished ones stay here too.
            {generalWaiting.length > 0 && (
              <>
                {" "}
                <strong className="font-medium text-charcoal">
                  {generalWaiting.length} of them{" "}
                  {generalWaiting.length === 1 ? "is" : "are"} still waiting on
                  you.
                </strong>
              </>
            )}
          </p>

          <ul className="mt-6 divide-y divide-black/8 rounded border border-black/8 bg-white">
            {general.map((pledge) => (
              <li key={pledge.id} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {pledge.partnerName ?? "Somebody"}{" "}
                      <span className="tabular ml-1 text-plum">
                        {usd(pledge.amountCents)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-smoke">
                      towards {pledgeTowards(pledge)}
                    </p>
                    {pledge.partnerEmail && (
                      <a
                        href={`mailto:${pledge.partnerEmail}?subject=${encodeURIComponent(`Giving to ${pledgeTowards(pledge)}`)}`}
                        className="mt-1 inline-block font-mono text-xs text-plum underline underline-offset-4"
                      >
                        {pledge.partnerEmail}
                      </a>
                    )}
                  </div>

                  <p className="text-sm text-smoke">
                    {PLEDGE_LABELS[pledge.status]} · promised{" "}
                    {formatDay(pledge.createdAt)}
                    {pledge.receivedAt && ` · received ${formatDay(pledge.receivedAt)}`}
                  </p>
                </div>

                {pledge.message && (
                  <p className="mt-3 border-l-2 border-sand-deep pl-4 text-sm leading-relaxed text-smoke">
                    {pledge.message}
                  </p>
                )}

                <div className="mt-4">
                  <PledgeActions pledgeId={pledge.id} status={pledge.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------- the items */}
      <h2 className="font-display mt-14 text-2xl font-bold">
        {needs.length === 0 ? "Nothing listed yet" : "The items"}
      </h2>

      {needs.length === 0 ? (
        <div className="mt-4 rounded border border-dashed border-smoke/40 bg-sand p-6">
          <p className="max-w-2xl leading-relaxed text-smoke">
            The obvious place to start is the three things the $8,000 kitchen
            gift never reached — the water tank, the cabro floor and the dining
            hall. Their costs are already on the Kitchen page, so this
            takes them from there rather than asking you to type them again.
          </p>
          <div className="mt-6">
            <SeedKitchenButton />
          </div>
        </div>
      ) : (
        <ul className="mt-6 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8">
          {needs.map((need) => (
            <li key={need.id} className="bg-white">
              <Link
                href={`/app/needs/${need.id}`}
                className="block p-6 transition-colors hover:bg-sand"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <h3 className="font-display text-lg font-bold">
                    {need.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="eyebrow rounded-full bg-sand px-3 py-1 text-smoke">
                      {areaOf(need.area).label}
                      {/*
                        Which step it is in, on the same chip as the project,
                        because "kitchen" and "kitchen · walls up" are the two
                        halves of one answer and reading them as two badges
                        invites the eye to treat them as two facts.
                      */}
                      {parts.find((part) => part.id === need.partId) &&
                        ` · ${parts.find((part) => part.id === need.partId)!.title}`}
                    </span>
                    {!need.published && (
                      <span className="eyebrow rounded-full bg-plum/10 px-3 py-1 text-plum">
                        Hidden
                      </span>
                    )}
                    {need.closed && (
                      <span className="eyebrow rounded-full bg-green/12 px-3 py-1 text-green">
                        Finished
                      </span>
                    )}
                  </div>
                </div>

                <NeedBar ledger={need.ledger} className="mt-4" />

                <p className="tabular mt-3 text-sm text-smoke">
                  {usd(need.ledger.receivedCents)} received
                  {need.ledger.promisedCents > 0 &&
                    ` · ${usd(need.ledger.promisedCents)} promised`}{" "}
                  · {usd(need.ledger.openCents)} open · {usd(need.costCents)} total
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* --------------------------------------- the order of the work */}
      <h2 className="font-display mt-14 text-2xl font-bold">
        The order of the work
      </h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-smoke">
        A project can be broken into parts — walls up, roof and door, fitting
        out — and each part holds its own itemised costs. A part opens for
        giving once every part before it is fully claimed, so nobody is ever
        asked to buy the paint while the walls are still an open line. Items
        left out of a part are offered straight away.
      </p>

      {projects.filter((project) => project.parts.some((group) => group.part))
        .length === 0 ? (
        <p className="mt-4 max-w-2xl rounded border border-dashed border-smoke/40 bg-sand p-6 leading-relaxed text-smoke">
          No parts yet, so every item is offered as soon as it is published.
          That is the right answer for a list of unrelated things. Add parts
          when the order matters.
        </p>
      ) : (
        <div className="mt-6 space-y-10">
          {projects.map((project) => {
            const sequenced = project.parts.filter((group) => group.part);
            if (sequenced.length === 0) return null;

            return (
              <div key={project.area.id}>
                <h3 className="font-display text-lg font-bold">
                  {project.area.label}
                </h3>

                <ul className="mt-3 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8">
                  {sequenced.map((group) => (
                    <li key={group.part!.id} className="bg-white">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-black/8 px-6 py-4">
                        <p className="font-medium">
                          <span className="tabular text-smoke">
                            {group.part!.sequence}.
                          </span>{" "}
                          {group.part!.title}
                        </p>

                        {/*
                          What the sequence is doing to this part today, in the
                          words the public pages use. Simon should never have to
                          work out from a number why something is not being
                          offered.
                        */}
                        <span
                          className={`eyebrow rounded-full px-3 py-1 ${
                            group.settled
                              ? "bg-green/12 text-green"
                              : group.ready
                                ? "bg-marigold/20 text-charcoal"
                                : "bg-sand text-smoke"
                          }`}
                        >
                          {group.settled
                            ? "Fully claimed"
                            : group.ready
                              ? `Open now · ${usd(group.stillAskingCents)}`
                              : `Waits on ${group.waitsOn?.title}`}
                        </span>
                      </div>

                      <EditPartForm
                        part={group.part!}
                        itemCount={group.needs.length}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="font-display mt-10 text-lg font-bold">Add a part</h3>
      <div className="max-w-2xl">
        <NewPartForm />
      </div>

      {/* --------------------------------------------- adding another */}
      <h2 className="font-display mt-14 text-2xl font-bold">Add an item</h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-smoke">
        One thing, with one price on it. Small and specific beats large and
        vague — &ldquo;a water tank, $850&rdquo; is something a church can
        finish, and &ldquo;support the ministry&rdquo; is not.
      </p>
      <div className="max-w-2xl">
        <NewNeedForm parts={parts} />
      </div>
    </div>
  );
}
