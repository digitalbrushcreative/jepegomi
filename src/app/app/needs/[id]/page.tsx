import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NeedMeter } from "@/components/need-meter";
import { currentUser } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { PLEDGE_LABELS, areaOf } from "@/lib/giving";
import { usd } from "@/lib/money";
import {
  getNeedById,
  listPledgesForNeed,
  listUpdatesForNeed,
} from "@/lib/needs";
import {
  DeleteNeedButton,
  DeleteUpdateButton,
  EditNeedForm,
  PledgeActions,
  PostUpdateForm,
} from "../need-forms";

export default async function AdminNeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/app");

  const { id } = await params;
  const need = await getNeedById(id);
  if (!need) notFound();

  const [pledges, updates] = await Promise.all([
    listPledgesForNeed(id),
    listUpdatesForNeed(id),
  ]);

  const claimed = pledges.some((pledge) => pledge.status !== "declined");

  return (
    <div className="max-w-3xl">
      <Link
        href="/app/needs"
        className="text-sm font-medium text-smoke underline underline-offset-4 hover:text-plum"
      >
        ← All needs
      </Link>

      <h1 className="font-display mt-5 text-3xl font-bold">{need.title}</h1>
      <p className="mt-2 text-smoke">
        {areaOf(need.area).label}
        {need.published ? (
          <>
            {" · "}
            <Link
              href={`/needs/${need.slug}`}
              className="font-medium text-plum underline underline-offset-4"
            >
              /needs/{need.slug}
            </Link>
          </>
        ) : (
          " · not shown on the site yet"
        )}
      </p>

      <div className="mt-8 rounded border border-black/8 bg-white p-6">
        <NeedMeter ledger={need.ledger} closed={need.closed} />
      </div>

      {/* -------------------------------------------------- the claims */}
      <h2 className="font-display mt-14 text-2xl font-bold">
        Who has claimed this
      </h2>
      <p className="mt-2 leading-relaxed text-smoke">
        Everything except a withdrawn claim counts against the cost, including
        claims you have not confirmed yet — which is what stops two churches
        being offered the same balance.
      </p>

      {pledges.length === 0 ? (
        <p className="mt-6 rounded border border-dashed border-smoke/40 bg-sand px-6 py-5 text-smoke">
          Nobody has claimed any of this yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-black/8 rounded border border-black/8 bg-white">
          {pledges.map((pledge) => (
            <li key={pledge.id} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <div>
                  <p className="font-medium">
                    {pledge.partnerName ?? "Somebody"}{" "}
                    <span className="tabular ml-1 text-plum">
                      {usd(pledge.amountCents)}
                    </span>
                  </p>
                  {pledge.partnerEmail && (
                    <a
                      href={`mailto:${pledge.partnerEmail}?subject=${encodeURIComponent(`Giving to ${need.title}`)}`}
                      className="font-mono text-xs text-smoke underline underline-offset-4 hover:text-plum"
                    >
                      {pledge.partnerEmail}
                    </a>
                  )}
                </div>

                <p className="text-sm text-smoke">
                  {PLEDGE_LABELS[pledge.status]} · claimed{" "}
                  {formatDay(pledge.createdAt)}
                  {pledge.receivedAt &&
                    ` · received ${formatDay(pledge.receivedAt)}`}
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
      )}

      {/* ------------------------------------------------- the updates */}
      <h2 className="font-display mt-14 text-2xl font-bold">Post an update</h2>
      <p className="mt-2 leading-relaxed text-smoke">
        This goes on the item&apos;s public page and on the dashboard of every
        partner who put money towards it. It is the part they are waiting for.
      </p>
      <PostUpdateForm needId={need.id} />

      {updates.length > 0 && (
        <ul className="mt-10 space-y-5">
          {updates.map((update) => (
            <li
              key={update.id}
              className="flex gap-5 rounded border border-black/8 bg-white p-5"
            >
              {update.photo && (
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded bg-sand">
                  <Image
                    src={update.photo}
                    alt={update.photoAlt || ""}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="eyebrow text-plum">
                    {formatDay(update.createdAt)}
                  </p>
                  <DeleteUpdateButton updateId={update.id} />
                </div>
                <p className="mt-2 leading-relaxed whitespace-pre-line text-smoke">
                  {update.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* --------------------------------------------------- the fields */}
      <h2 className="font-display mt-14 text-2xl font-bold">Edit this item</h2>
      <EditNeedForm need={need} />

      <div className="mt-12 border-t border-black/8 pt-8">
        <DeleteNeedButton
          needId={need.id}
          title={need.title}
          claimed={claimed}
        />
      </div>
    </div>
  );
}
