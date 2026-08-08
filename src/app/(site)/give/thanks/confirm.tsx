"use client";

import { useEffect, useRef, useState } from "react";
import { type Outcome, confirmPayment } from "@/app/(site)/give/thanks/actions";
import { Done } from "@/components/form";
import { ButtonLink } from "@/components/ui";
import { site } from "@/lib/site";

/**
 * What the giver sees when Pesapal sends them back.
 *
 * It asks the server what happened, and keeps asking while the answer is
 * "pending" — because for M-Pesa it very often is. The giver approves the
 * prompt on their phone some seconds after their browser has already returned,
 * so a page that asked once and gave up would show "we could not confirm this"
 * to a large share of the people who paid perfectly normally.
 *
 * Eight attempts, four seconds apart — a little over half a minute. Past that
 * the honest thing is to stop spinning and say so: the payment is not lost,
 * the IPN will settle it whenever it arrives, and the receipt email goes out
 * from that same code path without this page being involved at all.
 */

const EVERY = 4000;
const ATTEMPTS = 8;

function Waiting() {
  return (
    <div className="rounded-xl border-l-4 border-marigold bg-marigold/8 px-6 py-6">
      <p className="font-display text-xl font-semibold">
        Checking with Pesapal…
      </p>
      <p className="mt-4 text-sm leading-relaxed text-smoke">
        If you paid by M-Pesa, approve the prompt on your phone — this page will
        catch up on its own within a few seconds. Please don&apos;t close it just yet.
      </p>
    </div>
  );
}

export function Confirm({ trackingId }: { trackingId: string }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [givenUp, setGivenUp] = useState(false);

  /*
    Guards against React running the effect twice in development. Without it the
    first render fires two overlapping settlements — harmless, because settling
    is idempotent by design, but it doubles the calls to Pesapal for no reason.
  */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let live = true;
    let attempts = 0;

    const ask = async () => {
      attempts += 1;
      const result = await confirmPayment(trackingId);
      if (!live) return;

      if (result.state === "pending" && attempts < ATTEMPTS) {
        setTimeout(ask, EVERY);
        return;
      }

      if (result.state === "pending") setGivenUp(true);
      setOutcome(result);
    };

    void ask();

    // Stops the chain if the giver navigates away mid-poll.
    return () => {
      live = false;
    };
  }, [trackingId]);

  if (!outcome || (outcome.state === "pending" && !givenUp)) return <Waiting />;

  if (outcome.state === "paid") {
    return (
      <>
        <Done
          heading={`Thank you — ${outcome.amount ?? "your gift"} towards ${outcome.towards ?? "the ministry"}.`}
        >
          <p>
            Your gift has arrived and it now shows as received on the site.
            {outcome.charged
              ? ` ${outcome.charged} was taken${outcome.method ? ` by ${outcome.method}` : ""}${
                  outcome.confirmationCode
                    ? `, confirmation ${outcome.confirmationCode}`
                    : ""
                }.`
              : ""}
          </p>
          <p>
            A receipt is on its way to the address you gave. Once the work it
            paid for gets going you will be able to follow it here, in
            photographs.
          </p>
        </Done>

        <div className="mt-8 flex flex-wrap gap-4">
          {/* Secondary, not primary: green is the giving colour and this is not
              an act of giving — the giving already happened. See ui.tsx. */}
          <ButtonLink href={outcome.needUrl ?? "/needs"} icon="give" variant="secondary">
            {outcome.needUrl ? "Follow this item" : "See what else is needed"}
          </ButtonLink>
        </div>
      </>
    );
  }

  if (outcome.state === "failed") {
    return (
      <div className="rounded-xl border-l-4 border-plum bg-plum/8 px-6 py-6">
        <p className="font-display text-xl font-semibold">
          That payment didn&apos;t go through.
        </p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-smoke">
          <p>
            Nothing has been charged, and nothing has been recorded against your
            name — whatever you were giving towards is back on the list exactly
            as it was. This happens often enough to be unremarkable: a card
            declined for a cross-border payment, or an M-Pesa prompt that timed
            out.
          </p>
          <p>
            Do try again, and if it will not have it, write to{" "}
            <a
              href={`mailto:${site.email}`}
              className="font-medium text-plum underline underline-offset-4"
            >
              {site.email}
            </a>{" "}
            and Pastor Simon will send you another way to give.
          </p>
        </div>
        <div className="mt-6">
          <ButtonLink href="/give" icon="give" variant="primary">
            Try again
          </ButtonLink>
        </div>
      </div>
    );
  }

  /*
    Pending past the last attempt, or a tracking id we have never seen. Worded
    the same way on purpose — in both cases the honest answer is "we cannot tell
    you from here", and neither is a reason to alarm somebody about money.
  */
  return (
    <div className="rounded-xl border-l-4 border-marigold bg-marigold/8 px-6 py-6">
      <p className="font-display text-xl font-semibold">
        {givenUp ? "Still waiting to hear back." : "We can't find that payment."}
      </p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-smoke">
        <p>
          {givenUp
            ? "Pesapal has not confirmed this one yet, which usually means an M-Pesa prompt is still waiting on a phone. Nothing is lost — the moment it confirms, the gift is recorded and a receipt goes out to you automatically."
            : "This page did not come with an order we recognise. If you were sent here after paying, your gift is safe — it is recorded against the order itself, not against this page."}
        </p>
        <p>
          If you have been charged and hear nothing within the hour, write to{" "}
          <a
            href={`mailto:${site.email}`}
            className="font-medium text-plum underline underline-offset-4"
          >
            {site.email}
          </a>{" "}
          and we will find it by hand.
        </p>
      </div>
      <div className="mt-6">
        <ButtonLink href="/needs" icon="give" variant="secondary">
          See what&apos;s needed
        </ButtonLink>
      </div>
    </div>
  );
}
