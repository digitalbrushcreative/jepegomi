import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PartnerDashboard } from "@/components/partner-dashboard";
import { currentPartner } from "@/lib/partners";
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
  const partner = await currentPartner();
  if (!partner) redirect("/partners");

  return (
    <PartnerDashboard
      partner={partner}
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
