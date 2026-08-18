import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { ensureSchema } from "@/lib/db";
import { usd } from "@/lib/money";
import { PARTNER_KINDS, areaOf } from "@/lib/giving";
import { getKitchenReport } from "@/lib/kitchen";
import { listNeeds } from "@/lib/needs";
import { readersByPartner } from "@/lib/partner-readers";
import { listPartners } from "@/lib/partners";
import { listSupporters } from "@/lib/supporters";
import { PageHeader } from "../ui";
import {
  AddPartnerForm,
  type GiftTarget,
  IssueLoginForm,
  PartnerDetailsForm,
  ReadersPanel,
  RecordGiftForm,
  RevokeLoginButton,
  SeedEncounterForm,
  VerifyButton,
} from "./partner-forms";

function kindLabel(kind: string) {
  return PARTNER_KINDS.find((option) => option.id === kind)?.label ?? "Partner";
}

/**
 * Everyone who has given, and what state each of them is in.
 *
 * Unverified partners sort to the top, because they are the only ones on this
 * page that need anything doing to them. A partner Simon has already dealt with
 * should be findable, not prominent.
 */
export default async function AdminPartnersPage() {
  const user = await currentUser();
  if (!user) redirect("/app");

  await ensureSchema();
  const [partners, needs, kitchen, readers, supporters] = await Promise.all([
    listPartners(),
    listNeeds(),
    getKitchenReport(),
    // One query for the whole page rather than one per card — see the note on it.
    readersByPartner(),
    listSupporters(),
  ]);

  const unverified = partners.filter((partner) => !partner.verified);

  const hasEncounter = partners.some(
    (partner) => partner.name.trim().toLowerCase() === "encounter church",
  );

  /*
    What a recorded gift can be put against: anything with room left in it.

    Fully-claimed items are the only ones left out, because offering them could
    only produce an error on submit. Closed and unpublished ones stay — money
    towards finished work is exactly what arrives late, and a church may well
    have promised something before Simon put it on the site. Each is labelled
    with which it is, so the list cannot be mistaken for what /needs is showing
    the public.
  */
  const targets: GiftTarget[] = needs
    .filter((need) => need.ledger.openCents > 0)
    .map((need) => ({
      id: need.id,
      title: need.title,
      areaLabel: areaOf(need.area).label,
      openCents: need.ledger.openCents,
      state: need.closed ? "finished" : need.published ? "open" : "draft",
    }));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Partners"
        intro={
          <>
            The churches and people who have given. A partner appears here the
            moment they claim something at{" "}
            <span className="font-mono text-sm">/needs</span> — nothing about
            them is confirmed until you say so. Gifts that arrived by transfer or
            M-Pesa never touched that form, so add those partners yourself and
            record what they sent.
          </>
        }
      />

      {/*
        The kitchen's own donor, offered once and then gone. Their $8,000
        predates this ledger entirely, and typing six budget lines and six gifts
        in by hand — from figures that are already in the repository — is the
        kind of job a button should do. It disappears the moment they are here.
      */}
      {!hasEncounter && (
        <div className="mt-8 rounded border border-green/30 bg-green/6 p-6">
          <h2 className="font-display text-lg font-bold">
            Encounter Church is not on this page yet
          </h2>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-smoke">
            They gave the {usd(kitchen.giftCents)}{" "}
            that built the kitchen, years before this ledger existed. This adds
            them, enters the six
            budget lines from Pastor Simon&apos;s reconciliation letter as
            finished items, and records their giving against each one — so they
            can sign in and see what it built. Nothing is added to the public
            site: the kitchen page still names no donor.
          </p>
          <SeedEncounterForm />
        </div>
      )}

      <details className="mt-8 rounded border border-black/8 bg-white p-6">
        <summary className="cursor-pointer font-medium hover:text-plum">
          Add a partner by hand
        </summary>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-smoke">
          For a church or person who gave without using the form on the site — a
          bank transfer after an exchange of emails, or a gift from before this
          page existed. Record what they sent afterwards, against their name.
        </p>
        <div className="mt-6 border-t border-black/8 pt-6">
          <AddPartnerForm />
        </div>
      </details>

      {unverified.length > 0 && (
        <p className="rounded border border-marigold/40 bg-marigold/8 px-5 py-4 text-sm leading-relaxed">
          <strong className="font-medium">
            {unverified.length} still to verify.
          </strong>{" "}
          <span className="text-smoke">
            Their claims count against the items either way, and they can already
            sign in to see their own giving — anybody can, with a code we email
            to the address their gift came from. What verifying does is open the
            project accounts to a church or an organisation: the costings, the
            over-runs, what each part actually came to. Tick it when you know who
            they are, not to be polite.
          </span>
        </p>
      )}

      {partners.length === 0 ? (
        <p className="mt-10 rounded border border-dashed border-smoke/40 bg-sand px-6 py-5 leading-relaxed text-smoke">
          Nobody has claimed anything yet. When somebody does, they appear here
          with whatever they told the form about themselves.
        </p>
      ) : (
        <ul className="mt-10 space-y-6">
          {partners.map((partner) => (
            <li
              key={partner.id}
              className="rounded border border-black/8 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-display text-xl font-bold">
                      {partner.name}
                    </h2>
                    {partner.verified ? (
                      <span className="eyebrow rounded-full bg-green/12 px-3 py-1 text-green">
                        Verified
                      </span>
                    ) : (
                      <span className="eyebrow rounded-full bg-marigold/20 px-3 py-1 text-clay">
                        Unverified
                      </span>
                    )}
                    {partner.hasLogin && (
                      <span className="eyebrow rounded-full bg-plum/10 px-3 py-1 text-plum">
                        Has a login
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-smoke">
                    {kindLabel(partner.kind)}
                    {partner.location && ` · ${partner.location}`}
                    {partner.contactName && ` · ${partner.contactName}`}
                    {` · first gave ${formatDay(partner.createdAt)}`}
                  </p>

                  <a
                    href={`mailto:${partner.email}`}
                    className="mt-1 inline-block font-mono text-xs text-plum underline underline-offset-4"
                  >
                    {partner.email}
                  </a>
                </div>

                <dl className="flex gap-x-8">
                  <div>
                    <dt className="eyebrow text-smoke">Received</dt>
                    <dd className="font-display tabular mt-1 text-xl font-semibold text-green">
                      {usd(partner.receivedCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-smoke">Claimed</dt>
                    <dd className="font-display tabular mt-1 text-xl font-semibold">
                      {usd(partner.claimedCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-smoke">Items</dt>
                    <dd className="font-display tabular mt-1 text-xl font-semibold">
                      {partner.pledgeCount}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-black/8 pt-5">
                <VerifyButton
                  partnerId={partner.id}
                  verified={partner.verified}
                  name={partner.name}
                />
                {partner.hasLogin && (
                  <RevokeLoginButton partnerId={partner.id} name={partner.name} />
                )}
                {/*
                  Opens the real page on the real site, so what is on screen is
                  what they get. It leaves /app, which is why it says so.
                */}
                <Link
                  href={`/partners/preview/${partner.id}`}
                  className="rounded border border-black/15 px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-plum"
                >
                  See what they see
                </Link>
              </div>

              <details className="mt-5">
                <summary className="cursor-pointer text-sm font-medium text-smoke hover:text-plum">
                  Record a gift
                </summary>
                <div className="mt-5 border-t border-black/8 pt-5">
                  <p className="mb-6 max-w-prose text-sm leading-relaxed text-smoke">
                    Money that came in outside the site. It counts towards the
                    item&apos;s balance the same way a claim on{" "}
                    <span className="font-mono text-xs">/needs</span> does, and
                    appears on {partner.name}&apos;s own page straight away.
                  </p>
                  <RecordGiftForm partner={partner} targets={targets} />
                </div>
              </details>

              {/*
                Folded away like the rest, but the count is in the summary so
                the page says who can read a church's giving without anybody
                having to open twenty panels to find out.
              */}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-smoke hover:text-plum">
                  Who else may see this
                  {(readers.get(partner.id)?.length ?? 0) > 0 &&
                    ` · ${readers.get(partner.id)!.length}`}
                </summary>
                <div className="mt-5 border-t border-black/8 pt-5">
                  <ReadersPanel
                    partner={partner}
                    readers={readers.get(partner.id) ?? []}
                  />
                </div>
              </details>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-smoke hover:text-plum">
                  Details &amp; login
                </summary>

                <div className="mt-5 space-y-8 border-t border-black/8 pt-5">
                  <PartnerDetailsForm partner={partner} />
                  <div className="border-t border-black/8 pt-6">
                    <IssueLoginForm partner={partner} />
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <SupporterList supporters={supporters} />
    </div>
  );
}

/**
 * Everybody who signed in just to see what things cost.
 *
 * These are not partners and the page is careful not to let them look like ones.
 * They have given nothing, nothing is filed against them, and no tick here opens
 * anything — a supporter is an address somebody proved they could read, and the
 * only thing it buys is the ministry's prices. See lib/supporters.ts.
 *
 * It is at the foot of this page rather than on one of its own because that is
 * honestly what it is: a list of addresses, at the bottom of the page about the
 * people who give. Worth having — somebody who went to the trouble of asking
 * what a water tank costs is a warmer name than any newsletter box has ever
 * produced — and not worth a heading in the nav.
 *
 * Confirmed and unconfirmed are shown together, labelled. An unconfirmed row is
 * somebody who asked for a code and never typed it back, which is usually a
 * mistyped address and occasionally somebody entering other people's. Averaging
 * the two into one count would hide both.
 */
function SupporterList({
  supporters,
}: {
  supporters: Awaited<ReturnType<typeof listSupporters>>;
}) {
  if (supporters.length === 0) return null;

  const confirmed = supporters.filter((supporter) => supporter.confirmed);

  return (
    <details className="mt-12 rounded border border-black/8 bg-white p-6">
      <summary className="cursor-pointer font-medium hover:text-plum">
        Signed in for the figures · {confirmed.length}
      </summary>

      <p className="mt-4 max-w-prose text-sm leading-relaxed text-smoke">
        Addresses that proved themselves to see what things cost. They have given
        nothing and nothing is recorded against them — this is a list of people
        who wanted to know the price, which is the closest thing this site has to
        a warm list. Nothing here needs doing.
      </p>

      <ul className="mt-6 divide-y divide-black/8 border-t border-black/8">
        {supporters.map((supporter) => (
          <li
            key={supporter.id}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
          >
            <span className="font-mono text-sm">{supporter.email}</span>
            <span className="text-xs text-smoke">
              {supporter.confirmed
                ? `signed in ${formatDay(supporter.confirmedAt ?? supporter.createdAt)}`
                : `asked ${formatDay(supporter.createdAt)} — never typed the code`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
