import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink, PageHero } from "@/components/ui";
import { currentPartner, isPartnerAreaConfigured } from "@/lib/partners";
import { PartnerPasswordForm } from "./password-form";

export const metadata: Metadata = {
  title: "Partner sign in",
  description: "Sign in with the password we sent you.",
  robots: { index: false, follow: false },
};

/**
 * The older door, kept open.
 *
 * Passwords here were issued one church at a time, by hand, in an email — and a
 * handful of churches are carrying one right now. Moving the front door to an
 * emailed code (see ../login-form.tsx) must not turn those into people who
 * simply cannot get in any more, so the password form did not go away; it moved
 * off the entrance and onto a page of its own, linked from it.
 *
 * Nothing behind this door differs. It starts the same session, and what a
 * partner may read once inside is worked out from their giving either way — see
 * lib/disclosure.ts. This is a second key to one lock, not a better one.
 */
async function PasswordEntrance() {
  if (await currentPartner()) redirect("/partners/dashboard");

  return (
    <div className="shell max-w-lg">
      <div className="rounded-2xl bg-white p-8 shadow-warm-lg">
        <h2 className="font-display text-2xl font-semibold">
          Sign in with a password
        </h2>
        <p className="mt-2 mb-7 text-sm leading-relaxed text-smoke">
          With the email and password we sent you. If you have never been given
          one, you do not need it —{" "}
          <Link
            href="/partners"
            className="font-medium text-plum underline underline-offset-4"
          >
            sign in with a code instead
          </Link>
          .
        </p>
        <PartnerPasswordForm />
      </div>
    </div>
  );
}

export default function PartnerPasswordPage() {
  return (
    <>
      <PageHero
        title="Sign in"
        intro="For the churches we set a password up for."
      />

      <section className="px-6 py-20 sm:py-24">
        {isPartnerAreaConfigured() ? (
          <Suspense
            fallback={
              <div className="shell">
                <p className="text-smoke">Loading…</p>
              </div>
            }
          >
            <PasswordEntrance />
          </Suspense>
        ) : (
          <div className="shell max-w-2xl">
            <p className="leading-relaxed text-smoke">
              The partner area is not switched on yet. Nothing is wrong with
              your account — this part of the site is still being set up.
            </p>
            <ButtonLink href="/needs" variant="secondary" className="mt-7">
              See what&apos;s needed
            </ButtonLink>
          </div>
        )}
      </section>
    </>
  );
}
