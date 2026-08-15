import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PartnerDashboard } from "@/components/partner-dashboard";
import { currentPartnerView } from "@/lib/partners";
import { partnerSignOutAction } from "../actions";

export const metadata: Metadata = {
  title: "Your giving",
  robots: { index: false, follow: false },
};

/**
 * A church's own giving.
 *
 * The page itself does one thing — work out whose dashboard this is — and hands
 * the rest to the shared component. Which partner, and whether they are allowed
 * to be here, is the only question that differs between this and the preview in
 * /app; everything below the answer is the same markup rendered from the same
 * queries. See the note on `PartnerDashboard`.
 */
async function OwnDashboard() {
  const view = await currentPartnerView();
  if (!view) redirect("/partners");

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
      action={
        <form action={partnerSignOutAction}>
          <button
            type="submit"
            className="cursor-pointer rounded-full border-2 border-white/25 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:border-marigold hover:text-marigold"
          >
            Sign out
          </button>
        </form>
      }
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
