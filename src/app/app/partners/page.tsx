import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { ensureSchema } from "@/lib/db";
import { usd } from "@/lib/money";
import { PARTNER_KINDS } from "@/lib/giving";
import { listPartners } from "@/lib/partners";
import {
  IssueLoginForm,
  PartnerDetailsForm,
  RevokeLoginButton,
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
  const partners = await listPartners();

  const unverified = partners.filter((partner) => !partner.verified);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Partners</h1>
      <p className="mt-3 leading-relaxed text-smoke">
        The churches and people who have given. A partner appears here the
        moment they claim something at{" "}
        <span className="font-mono text-sm">/needs</span> — nothing about them is
        confirmed until you say so.
      </p>

      {unverified.length > 0 && (
        <p className="mt-6 rounded border border-marigold/40 bg-marigold/8 px-5 py-4 text-sm leading-relaxed">
          <strong className="font-medium">
            {unverified.length} still to verify.
          </strong>{" "}
          <span className="text-smoke">
            Their claims count against the items either way — verifying is about
            whether you know who they are, and it is what lets you give them a
            login.
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
              </div>

              <details className="mt-5">
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
    </div>
  );
}
