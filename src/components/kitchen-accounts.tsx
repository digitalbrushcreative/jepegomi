import type { ProjectBudget } from "@/lib/giving";
import type { KitchenReport } from "@/lib/kitchen";
import { usd as usdFromCents } from "@/lib/money";

/**
 * Pastor Simon's reconciliation of the kitchen gift.
 *
 * This was a modal on the public kitchen page — a green button reading "See
 * where it went" that anybody could press. It is the same table, in the same
 * order, with the same figures; what changed is who is standing in front of it.
 *
 * Two screens draw it now — a partner's dashboard, and the public kitchen page
 * when Simon has set the switch in /app to "Anyone". Which of those happens is
 * `showsAccounts` in lib/disclosure.ts, and no part of the decision is repeated
 * here: this component draws a set of accounts and trusts its caller to have
 * asked whether it should.
 *
 * No longer a dialog, and no longer a client component. Wherever it lands there
 * is no reason to hide it behind a second click, so it renders flat on the page —
 * which also means no state, no escape-key handler, and no scroll lock to
 * restore.
 */

/*
  Whole dollars from cents, because the ledger counts in cents and always has.
  The figures in this table have never had a cent in them and never will —
  Simon's letter is written in round dollars — but the column they now come out
  of is the same one a $12.50 claim goes into, so the formatting has to be the
  ledger's.
*/
const usd = usdFromCents;

function Row({
  item,
  estimated,
  actual,
  note,
  muted,
}: {
  item: string;
  estimated: number;
  actual: string;
  note: string;
  muted?: boolean;
}) {
  return (
    <tr>
      <td className="border-b border-sand-deep py-3.5 pr-4 align-top">
        <p
          className={`text-sm font-medium ${muted ? "text-smoke" : "text-charcoal"}`}
        >
          {item}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-smoke">{note}</p>
      </td>
      <td className="tabular border-b border-sand-deep py-3.5 text-right align-top text-sm text-smoke">
        {usd(estimated)}
      </td>
      <td
        className={`tabular border-b border-sand-deep py-3.5 pl-4 text-right align-top text-sm font-medium ${
          muted ? "text-smoke" : "text-plum"
        }`}
      >
        {actual}
      </td>
    </tr>
  );
}

function Head() {
  return (
    <thead>
      <tr>
        <th className="eyebrow border-b-2 border-sand-deep pb-3 text-left text-smoke">
          Item
        </th>
        <th className="eyebrow border-b-2 border-sand-deep pb-3 text-right text-smoke">
          Estimated
        </th>
        <th className="eyebrow border-b-2 border-sand-deep pb-3 pl-4 text-right text-smoke">
          Actual
        </th>
      </tr>
    </thead>
  );
}

/**
 * @param budget The project's reconciliation, from `getProjectBudget`. Passed in
 * rather than read here so the one component can be drawn on a public page and
 * on a partner's dashboard without either of them wondering which query it runs.
 */
export function KitchenAccounts({
  budget,
  report,
}: {
  budget: ProjectBudget;
  report: KitchenReport;
}) {
  const givenCents = report.giftCents;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-warm">
      <div className="bg-green px-8 py-7">
        <h3 className="font-display text-2xl font-semibold text-white">
          Where the {usd(givenCents)} went
        </h3>
      </div>

      <div className="p-8">
        <p className="leading-relaxed text-smoke">
          {report.donorTitled} in {report.donorLocation} gave{" "}
          <strong className="text-charcoal">{usd(givenCents)}</strong> to
          build the kitchen and dining area. Below is Pastor Simon&apos;s own
          reconciliation of what was estimated against what things actually cost.
        </p>

        <div className="overflow-x-auto">
          <table className="mt-8 w-full min-w-[30rem] border-collapse">
            <Head />
            <tbody>
              {budget.spent.map((line) => (
                <Row
                  key={line.id}
                  item={line.item}
                  estimated={line.estimatedCents}
                  actual={
                    line.actualCents === null ? "Used" : usd(line.actualCents)
                  }
                  note={line.note}
                />
              ))}
              <tr>
                <td className="py-4 text-sm font-bold">Total</td>
                <td className="tabular py-4 text-right text-sm font-bold">
                  {usd(givenCents)}
                </td>
                <td className="tabular py-4 pl-4 text-right text-sm font-bold text-green">
                  {usd(budget.spentCents)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border-l-4 border-marigold bg-marigold/10 px-6 py-5">
          <p className="text-sm leading-relaxed text-charcoal">
            Costs ran over on almost every line — cement, sand, drainage and
            ballast all cost more than planned, and the drainage work had to grow
            to satisfy NEEMA regulations. The one line that came in <em>under</em>{" "}
            was roofing and labour, because Pastor Simon did the building he knew
            how to do himself, and put the saved labour cost back into materials.
          </p>
        </div>

        <h4 className="font-display mt-10 text-xl font-semibold">
          Never reached — {usd(budget.stillNeededCents)} still needed
        </h4>
        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[30rem] border-collapse">
            <Head />
            <tbody>
              {budget.outstanding.map((line) => (
                <Row
                  key={line.id}
                  item={line.item}
                  estimated={line.estimatedCents}
                  actual="—"
                  note={line.note}
                  muted
                />
              ))}
              <tr>
                <td className="py-4 text-sm font-bold">Still needed to finish</td>
                <td className="tabular py-4 text-right text-sm font-bold text-plum">
                  {usd(budget.stillNeededCents)}
                </td>
                <td className="py-4" />
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-smoke">
          Figures in USD, as reported by Pastor Simon to the donor. The{" "}
          {usd(givenCents)} gift is fully spent. The items in the second table
          were never reached.
        </p>
      </div>
    </div>
  );
}
