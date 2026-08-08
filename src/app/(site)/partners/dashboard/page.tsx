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
            className="cursor-pointer rounded-full border-2 border-black/12 px-6 py-2.5 text-sm font-bold text-smoke transition-colors hover:border-plum hover:text-plum"
          >
            Sign out
          </button>
        </form>
      }
    />
  );
}

export default function PartnerDashboardPage() {
  return (
    <section className="px-6 pt-16 pb-24">
      <Suspense
        fallback={
          <div className="shell">
            <p className="text-smoke">Loading…</p>
          </div>
        }
      >
        <OwnDashboard />
      </Suspense>
    </section>
  );
}
