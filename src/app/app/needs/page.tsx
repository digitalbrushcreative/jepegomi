import Link from "next/link";
import { redirect } from "next/navigation";
import { NeedBar } from "@/components/need-meter";
import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { formatDay } from "@/lib/dates";
import { PLEDGE_LABELS, areaOf } from "@/lib/giving";
import { usd } from "@/lib/money";
import { listNeeds, listOpenPledges } from "@/lib/needs";
import { NewNeedForm, SeedKitchenButton } from "./need-forms";

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

  const [needs, waiting] = await Promise.all([listNeeds(), listOpenPledges()]);

  const totalOpen = needs
    .filter((need) => !need.closed)
    .reduce((sum, need) => sum + need.ledger.openCents, 0);
  const totalReceived = needs.reduce(
    (sum, need) => sum + need.ledger.receivedCents,
    0,
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Needs</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-smoke">
        Everything the ministry is short of, with the price on it. A church can
        take all of an item or part of one; whatever is left stays open for
        somebody else. These appear at{" "}
        <Link href="/needs" className="font-medium text-plum underline underline-offset-4">
          /needs
        </Link>{" "}
        as soon as they are ticked to show.
      </p>

      {needs.length > 0 && (
        <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
          <div>
            <dt className="eyebrow text-smoke">Received in total</dt>
            <dd className="font-display tabular mt-1 text-2xl font-semibold text-green">
              {usd(totalReceived)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-smoke">Still open</dt>
            <dd className="font-display tabular mt-1 text-2xl font-semibold text-plum">
              {usd(totalOpen)}
            </dd>
          </div>
        </dl>
      )}

      {/* ------------------------------------------------ the queue */}
      {waiting.length > 0 && (
        <section className="mt-12 rounded border border-marigold/40 bg-marigold/8 p-6">
          <h2 className="font-display text-xl font-bold">
            {waiting.length} {waiting.length === 1 ? "claim" : "claims"} waiting on
            you
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-smoke">
            A claim holds its amount against the item from the moment it is made,
            so nobody else is asked for it. Send the account details, and mark it
            received when the money actually lands.
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
                    towards {pledge.needTitle} · {PLEDGE_LABELS[pledge.status]} ·{" "}
                    {formatDay(pledge.createdAt)}
                  </p>
                  {pledge.partnerEmail && (
                    <a
                      href={`mailto:${pledge.partnerEmail}?subject=${encodeURIComponent(`Giving to ${pledge.needTitle}`)}`}
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

      {/* ------------------------------------------------- the items */}
      <h2 className="font-display mt-14 text-2xl font-bold">
        {needs.length === 0 ? "Nothing listed yet" : "The items"}
      </h2>

      {needs.length === 0 ? (
        <div className="mt-4 rounded border border-dashed border-smoke/40 bg-sand p-6">
          <p className="max-w-2xl leading-relaxed text-smoke">
            The obvious place to start is the three things the $8,000 from
            Encounter Church never reached — the water tank, the cabro floor and
            the dining hall. Their costs are already on the Kitchen page, so this
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

      {/* --------------------------------------------- adding another */}
      <h2 className="font-display mt-14 text-2xl font-bold">Add an item</h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-smoke">
        One thing, with one price on it. Small and specific beats large and
        vague — &ldquo;a water tank, $850&rdquo; is something a church can
        finish, and &ldquo;support the ministry&rdquo; is not.
      </p>
      <div className="max-w-2xl">
        <NewNeedForm />
      </div>
    </div>
  );
}
