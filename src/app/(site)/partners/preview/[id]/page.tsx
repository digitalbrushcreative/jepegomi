import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PartnerDashboard } from "@/components/partner-dashboard";
import { currentUser } from "@/lib/auth";
import { getPartner } from "@/lib/partners";

export const metadata: Metadata = {
  title: "Partner preview",
  robots: { index: false, follow: false },
};

/**
 * What one partner sees, shown to Simon.
 *
 * It lives in the public route group rather than under /app, and that is the
 * whole point of it. A preview drawn inside the CMS chrome, in the CMS's
 * typography, on the CMS's background, answers a question nobody asked. Here it
 * gets the real header, the real footer, the real page — so what is on the
 * screen is what the church will have on theirs, and the only thing separating
 * the two is who is holding the cookie.
 *
 * Being in the public tree is exactly why the guard is the first thing in the
 * function. There is no middleware standing in front of this route and no /app
 * layout above it doing the check on its behalf: the session is read here, on
 * every render, or a partner's giving is one guessed URL away from anybody.
 *
 * Read-only, and nothing about it is a session. It renders a page *about* a
 * partner; it does not sign anybody in as one. Nothing here writes, no partner
 * cookie is issued, and the sign-out button is replaced with a way back to /app
 * — so there is no state to leave behind and no way to mistake this for being
 * logged in as somebody else.
 */
type Params = Promise<{ id: string }>;

/*
  `params` is awaited in here rather than in the page below it, so the wait
  happens inside the Suspense boundary. Awaited above it, the whole route blocks
  on it — which Next 16 refuses to build, and rightly.
*/
async function Preview({ params }: { params: Params }) {
  const { id } = await params;

  /*
    The admin session, not the partner one. `currentUser` returns null rather
    than throwing, so the signed-out case is a redirect to the door instead of
    an error page — and a signed-in person asking for a partner who is not there
    gets an ordinary 404, which tells them nothing about which ids exist.
  */
  const user = await currentUser();
  if (!user) redirect("/app");

  const partner = await getPartner(id);
  if (!partner) notFound();

  return (
    <>
      <div className="bg-plum-deep px-6 py-4 text-white">
        <div className="shell flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <p className="text-sm leading-relaxed">
            <span className="eyebrow mr-3 rounded-full bg-marigold px-3 py-1 text-plum-deep">
              Preview
            </span>
            This is what <strong className="font-semibold">{partner.name}</strong>{" "}
            sees when they sign in.
            {!partner.hasLogin && (
              <span className="text-white/60">
                {" "}
                They have no password yet, so they cannot reach it.
              </span>
            )}
          </p>

          <Link
            href="/app/partners"
            className="shrink-0 text-sm font-bold text-marigold underline underline-offset-4 hover:text-white"
          >
            Back to Partners
          </Link>
        </div>
      </div>

      <section className="px-6 pt-16 pb-24">
        <PartnerDashboard
          partner={partner}
          action={
            /*
              Where their Sign out button is. Not a disabled copy of it — a
              button that does nothing is a button somebody clicks twice — but
              the honest thing for this screen, which is the way back.
            */
            <Link
              href="/app/partners"
              className="rounded-full border-2 border-black/12 px-6 py-2.5 text-sm font-bold text-smoke transition-colors hover:border-plum hover:text-plum"
            >
              Back to /app
            </Link>
          }
        />
      </section>
    </>
  );
}

export default function PartnerPreviewPage({ params }: { params: Params }) {
  return (
    <Suspense
      fallback={
        <section className="px-6 pt-16 pb-24">
          <div className="shell">
            <p className="text-smoke">Loading…</p>
          </div>
        </section>
      }
    >
      <Preview params={params} />
    </Suspense>
  );
}
