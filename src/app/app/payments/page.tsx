import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { ensureSchema } from "@/lib/db";
import { usd } from "@/lib/money";
import {
  type PaymentRecord,
  type PaymentStatus,
  charged,
  listPayments,
  totalPayments,
} from "@/lib/payments";
import { Empty, PageHeader, Panel, Stat } from "../ui";

/**
 * What the site has taken, through Pesapal.
 *
 * Read-only, deliberately. Everything on this screen is Pesapal's word for what
 * happened, and a button here that let somebody edit it would produce a ledger
 * that disagrees with the merchant statement — which is the one document that
 * settles an argument about money. A payment is moved by the payment provider
 * or it is not moved.
 *
 * The gift itself is still managed from Needs, where a claim can be confirmed
 * or withdrawn by hand: that is the ministry's own record of a promise. This is
 * the record of a card being charged, and the two are not the same thing. A
 * gift sent by bank transfer never appears here at all.
 */

const STATUS_STYLES: Record<PaymentStatus, { label: string; className: string }> =
  {
    paid: { label: "Paid", className: "bg-green/12 text-green" },
    started: { label: "In progress", className: "bg-marigold/20 text-clay" },
    failed: { label: "Failed", className: "bg-plum/10 text-plum" },
    abandoned: { label: "Abandoned", className: "bg-sand text-smoke" },
  };

function StatusTag({ status }: { status: PaymentStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.failed;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.className}`}
    >
      {style.label}
    </span>
  );
}

/**
 * The M-Pesa code, or the card's own reference.
 *
 * This is the number a giver quotes when they write to ask whether their gift
 * arrived, so it is the one thing on the row worth being able to copy — hence
 * monospace, and hence shown even when there is nothing else to say about a
 * payment.
 */
function Reference({ payment }: { payment: PaymentRecord }) {
  return (
    <span className="font-mono text-[11px] leading-5 text-smoke">
      {payment.confirmationCode || payment.reference}
    </span>
  );
}

export default async function AdminPaymentsPage() {
  const user = await currentUser();
  if (!user) redirect("/app");

  await ensureSchema();
  const payments = await listPayments();
  const totals = totalPayments(payments);

  const currencies = Object.entries(totals.chargedByCurrency);

  return (
    <div>
      <PageHeader
        title="Payments"
        intro={
          <>
            Every gift paid on the site by card or M-Pesa, straight from
            Pesapal. Gifts sent by bank transfer never come through here —
            those are confirmed by hand under{" "}
            <Link
              href="/app/needs"
              className="font-medium text-plum underline underline-offset-4"
            >
              Needs
            </Link>
            .
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Received"
          value={usd(totals.receivedCents)}
          note={`${totals.paidCount} ${totals.paidCount === 1 ? "gift" : "gifts"} paid`}
          tone="good"
        />
        <Stat
          label="Charged"
          value={
            currencies.length > 0
              ? currencies.map(([code, amount]) => charged(amount, code)).join(" · ")
              : "—"
          }
          note="What the account actually took"
        />
        <Stat
          label="In progress"
          value={totals.inFlightCount}
          note="Somebody is paying right now"
          tone={totals.inFlightCount > 0 ? "waiting" : "plain"}
        />
        <Stat
          label="Came to nothing"
          value={totals.failedCount}
          note="Declined, reversed, or never finished"
        />
      </div>

      <div className="mt-6">
        <Panel
          title="Every attempt"
          hint="Newest first. A failed row is not a problem to fix — it is the answer to “I tried to give and it did not work”."
        >
          {payments.length === 0 ? (
            <Empty>
              Nothing has been paid on the site yet. Once the Pesapal keys are
              live, every card and M-Pesa gift lands here by itself.
            </Empty>
          ) : (
            /* The table scrolls inside its panel rather than widening the page. */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/8 text-[11px] tracking-[0.1em] text-smoke uppercase">
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      When
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Giver
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Towards
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                      Amount
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/6">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="align-top">
                      <td className="px-5 py-3 whitespace-nowrap text-smoke">
                        {formatDay(payment.settledAt ?? payment.createdAt)}
                      </td>

                      <td className="px-5 py-3">
                        <span className="font-medium">
                          {payment.giverName ?? "Somebody"}
                        </span>
                        {payment.giverEmail && (
                          <a
                            href={`mailto:${payment.giverEmail}`}
                            className="mt-0.5 block font-mono text-[11px] text-plum underline underline-offset-4"
                          >
                            {payment.giverEmail}
                          </a>
                        )}
                      </td>

                      <td className="max-w-[16rem] px-5 py-3">
                        {payment.needSlug ? (
                          <Link
                            href={`/needs/${payment.needSlug}`}
                            className="hover:text-plum"
                          >
                            {payment.towards}
                          </Link>
                        ) : (
                          payment.towards
                        )}
                        <span className="mt-0.5 block">
                          <Reference payment={payment} />
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className="font-display font-semibold tabular-nums">
                          {usd(payment.amountCents)}
                        </span>
                        {/*
                          The charged figure only earns its line when it is not
                          simply the same number again — a USD account says
                          everything it has to say in the column above.
                        */}
                        {payment.chargedCurrency !== "USD" && (
                          <span className="mt-0.5 block text-[11px] text-smoke tabular-nums">
                            {charged(payment.chargedAmount, payment.chargedCurrency)}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        <StatusTag status={payment.status} />
                        {payment.method && (
                          <span className="mt-1 block text-[11px] text-smoke">
                            {payment.method}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
