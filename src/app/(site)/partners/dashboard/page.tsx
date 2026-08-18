import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PartnerDashboard } from "@/components/partner-dashboard";
import { ButtonLink } from "@/components/ui";
import { currentPartnerView } from "@/lib/partners";
import { currentSupporter } from "@/lib/supporters";
import { partnerSignOutAction } from "../actions";

export const metadata: Metadata = {
  title: "Your giving",
  robots: { index: false, follow: false },
};

/**
 * The way out, shared by both of the pages below. One button, so a supporter and
 * a partner cannot end up with two different-looking ways to leave.
 */
function SignOutButton() {
  return (
    <form action={partnerSignOutAction}>
      <button
        type="submit"
        className="cursor-pointer rounded-full border-2 border-white/25 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:border-marigold hover:text-marigold"
      >
        Sign out
      </button>
    </form>
  );
}

/**
 * What somebody who has not given yet sees after signing in.
 *
 * They arrive here because the door sends everybody here, and that is the right
 * door policy and the wrong page to leave them on unattended: a person who has
 * given nothing has no giving to be shown, and a dashboard that is simply empty
 * reads as a sign-in that half-worked.
 *
 * So this page tells them what did happen. The figures are open now — which is
 * the thing they asked for and the only thing that changed — and nothing else
 * is, because nothing else has been earned. It says so plainly rather than
 * dressing an empty ledger up as a personalised one.
 *
 * The address is printed because of the one failure this page is well placed to
 * catch: somebody who *has* given, under an address they have forgotten, and is
 * sitting here wondering where their gifts went. Seeing which address they used
 * is usually the whole answer.
 */
function SupporterWelcome({ email }: { email: string }) {
  return (
    <>
      <section className="relative overflow-hidden bg-plum-deep px-6 pt-20 pb-8 sm:pt-24">
        <div className="grain-layer" />
        <div className="shell relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-marigold">Signed in</p>
            <h1 className="font-display mt-3 text-4xl font-bold text-balance text-white sm:text-5xl">
              The figures are open
            </h1>
            <p className="mt-3 text-white/60">{email}</p>
          </div>
          <SignOutButton />
        </div>
      </section>

      <div className="shell px-6 pt-12 pb-24">
        <p className="max-w-2xl text-lg leading-relaxed text-smoke">
          Every price on the site is now visible to you — what each costed item
          comes to, what has already been given towards it, and what is still
          short. It stays that way on this browser for a month, and you can sign
          out above whenever you like.
        </p>
        <p className="mt-5 max-w-2xl leading-relaxed text-smoke">
          There is nothing filed under this address yet, so there is no giving to
          show you. Nothing is expected — we asked who you were because these are
          the ministry&apos;s own prices, not because a gift is owed.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/needs">See what is needed</ButtonLink>
          <ButtonLink href="/give" variant="secondary">
            Give towards the ministry
          </ButtonLink>
        </div>

        <div className="mt-14 rounded-2xl border border-dashed border-smoke/30 bg-sand p-7">
          <p className="eyebrow text-plum">Given before?</p>
          <p className="mt-3 max-w-xl leading-relaxed text-smoke">
            Then it is filed under the address the gift came from, which may not
            be this one — a church office, or a treasurer&apos;s. Sign out and
            sign in again with that address and you will see everything it paid
            for, and how the work is going.{" "}
            <Link
              href="/partners"
              className="font-medium text-plum underline underline-offset-4"
            >
              Back to sign in
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * A church's own giving — or, for somebody who has none, an explanation.
 *
 * The page itself does one thing — work out whose dashboard this is — and hands
 * the rest to the shared component. Which partner, and whether they are allowed
 * to be here, is the only question that differs between this and the preview in
 * /app; everything below the answer is the same markup rendered from the same
 * queries. See the note on `PartnerDashboard`.
 */
async function OwnDashboard() {
  const view = await currentPartnerView();
  if (!view) {
    /*
      Asked second, and only when there is no partner. The two sessions are
      independent and a browser can hold both — see `currentViewer` in
      lib/door.ts, which resolves the same tie the same way, and for the same
      reason: the partner view is strictly the larger of the two.
    */
    const supporter = await currentSupporter();
    if (supporter) return <SupporterWelcome email={supporter.email} />;
    redirect("/partners");
  }

  const { partner, reader } = view;

  return (
    <PartnerDashboard
      partner={partner}
      /*
        For a treasurer or a missions pastor Simon has added to this church, the
        page is otherwise indistinguishable from their own — a church's name in
        large type over figures, with nothing on it saying whose. Said once, at
        the top, so nobody reads a set of totals as theirs; and it says who to
        write to, because the person who should not be here is the only one who
        can tell us so.
      */
      notice={
        reader ? (
          <div className="mb-10 border-b border-white/15 pb-6 text-white">
            <p className="max-w-2xl text-sm leading-relaxed">
              <span className="eyebrow mr-3 rounded-full bg-marigold px-3 py-1 text-plum-deep">
                On their behalf
              </span>
              You are seeing{" "}
              <strong className="font-semibold">{partner.name}</strong>&apos;s
              giving, because we added{" "}
              <span className="font-mono text-xs">{reader.email}</span> to it.
              Nothing here is recorded against you, and nothing you do changes
              it. If it should not be you, reply to any email from us and we
              will take your address off.
            </p>
          </div>
        ) : undefined
      }
      action={<SignOutButton />}
    />
  );
}

export default function PartnerDashboardPage() {
  /*
    No padding of its own: the component opens with a plum band that clears the
    fixed header itself. See the note on `PartnerDashboard`.
  */
  return (
    <Suspense
      fallback={
        <section className="bg-plum-deep px-6 pt-20 pb-14 sm:pt-24">
          <div className="shell">
            <p className="text-white/60">Loading…</p>
          </div>
        </section>
      }
    >
      <OwnDashboard />
    </Suspense>
  );
}
