import type { Metadata } from "next";
import { Suspense } from "react";
import { Confirm } from "@/app/(site)/give/thanks/confirm";
import { PageHero } from "@/components/ui";

/**
 * Where Pesapal sends a giver back to.
 *
 * The page itself says almost nothing — everything that matters is decided by
 * asking Pesapal what happened, which the client component does. That split is
 * not decoration: settling a payment writes to the ledger and expires the cache
 * tags behind every page showing a balance, and neither belongs in a render.
 *
 * Not indexed. Its whole content is one person's receipt, and a search engine
 * following an old order id would only ever find "we can't find that payment".
 */
export const metadata: Metadata = {
  title: "Your gift",
  robots: { index: false, follow: false },
};

/**
 * Reading the query string is what makes this dynamic, so it sits inside its
 * own Suspense boundary — the hero above it is static and is sent immediately,
 * while this waits for the request. Pesapal returns the giver with
 * `OrderTrackingId`, capitalised exactly like that.
 */
async function Outcome({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = params.OrderTrackingId;
  const trackingId = String((Array.isArray(raw) ? raw[0] : raw) ?? "");

  return <Confirm trackingId={trackingId} />;
}

export default function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <>
      <PageHero
        eyebrow="Your gift"
        title="Thank you"
        intro="One moment while we confirm this with Pesapal."
      />

      <section className="px-6 py-20 sm:py-24">
        <div className="shell max-w-2xl">
          <Suspense
            fallback={
              <div className="rounded-xl border-l-4 border-marigold bg-marigold/8 px-6 py-6">
                <p className="font-display text-xl font-semibold">
                  Checking with Pesapal…
                </p>
              </div>
            }
          >
            <Outcome searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
