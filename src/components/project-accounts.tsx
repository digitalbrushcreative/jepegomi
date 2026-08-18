import type { ReactNode } from "react";
import type { ProjectBudget } from "@/lib/giving";
import { Money } from "@/components/money";

/**
 * One project's accounts: what it bought, what each thing was estimated at, and
 * what it actually came to.
 *
 * This was `KitchenAccounts`, and before that a modal on the public kitchen page
 * behind a green button reading "See where it went". It is the same table in the
 * same order; what changed is first who is standing in front of it, and now
 * which project it is drawing. Every arm of the ministry keeps its accounts the
 * same way — closed rows in the ledger with an estimate beside each actual — so
 * there is no reason for the kitchen to have a component of its own, and one
 * good reason not to: a second project's figures would otherwise arrive with
 * nowhere to be drawn.
 *
 * Nothing in here decides whether it should be on screen. Two callers draw it —
 * a partner's dashboard, and a project page when Simon has set the switch to
 * "Anyone" — and both work that out with `showsAccounts` in lib/disclosure.ts
 * before they get here.
 *
 * The prose is all the caller's, for the same reason. A public page introduces
 * these figures to a stranger and a dashboard introduces them to the church that
 * paid for them; those are different sentences, and a component that tried to
 * write both would end up writing neither well.
 */

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

function Row({
  item,
  estimated,
  actual,
  note,
  muted,
}: {
  item: string;
  estimated: number;
  /** A node, because a figure may be a blur. See components/money.tsx. */
  actual: ReactNode;
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
        {note && (
          <p className="mt-0.5 text-xs leading-snug text-smoke">{note}</p>
        )}
      </td>
      <td className="tabular border-b border-sand-deep py-3.5 text-right align-top text-sm text-smoke">
        <Money cents={estimated} />
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

export function ProjectAccounts({
  budget,
  title,
  intro,
  note,
  footnote,
}: {
  /** The project's reconciliation, from `getProjectBudget`. */
  budget: ProjectBudget;
  /** The green band across the top — "Where the kitchen money went". */
  title: string;
  /** A paragraph introducing the table to whoever is reading it. */
  intro?: ReactNode;
  /**
   * Simon's own words about these figures, from the CMS. Drawn in the marigold
   * box under the table, and simply absent for a project he has not written
   * about — an empty callout is worse than none.
   */
  note?: string;
  /** A last line under everything, for a caller that needs one. */
  footnote?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-warm">
      <div className="bg-green px-8 py-7">
        <h3 className="font-display text-2xl font-semibold text-white">
          {title}
        </h3>
      </div>

      <div className="p-8">
        {intro && <div className="leading-relaxed text-smoke">{intro}</div>}

        {budget.spent.length > 0 && (
          <div className="overflow-x-auto">
            <table className="mt-8 w-full min-w-[30rem] border-collapse">
              <Head />
              <tbody>
                {budget.spent.map((line) => (
                  <Row
                    key={line.id}
                    item={line.item}
                    estimated={line.estimatedCents}
                    /*
                      A closed line with no figure against it is spent, amount
                      unknown — Pastor Simon's letter marks the transport that
                      way — and it has to read as "we do not know" rather than
                      as "it cost nothing". See the note in `getProjectBudget`.
                    */
                    actual={
                      line.actualCents === null ? (
                        "Used"
                      ) : (
                        <Money cents={line.actualCents} />
                      )
                    }
                    note={line.note}
                  />
                ))}
                <tr>
                  <td className="py-4 text-sm font-bold">Total</td>
                  {/*
                    Both totals come off the budget's own lines, so the columns
                    sum to what is above them. This used to print the size of the
                    gift in the estimated column, which was right for the kitchen
                    only because the gift happened to equal the estimate — on any
                    other project it would have been a total of nothing on the
                    page.
                  */}
                  <td className="tabular py-4 text-right text-sm font-bold">
                    <Money cents={budget.estimatedCents} />
                  </td>
                  <td className="tabular py-4 pl-4 text-right text-sm font-bold text-green">
                    <Money cents={budget.spentCents} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {note && (
          <div className="mt-6 rounded-xl border border-marigold/30 bg-marigold/10 px-6 py-5">
            {note.split(/\n{2,}/).map((paragraph, index) => (
              <p
                key={index}
                className={`text-sm leading-relaxed text-charcoal ${index > 0 ? "mt-3" : ""}`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {budget.outstanding.length > 0 && (
          <>
            <h4 className="font-display mt-10 text-xl font-semibold">
              Never reached — <Money cents={budget.stillNeededCents} /> still
              needed
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
                    <td className="py-4 text-sm font-bold">
                      Still needed to finish
                    </td>
                    <td className="tabular py-4 text-right text-sm font-bold text-plum">
                      <Money cents={budget.stillNeededCents} />
                    </td>
                    <td className="py-4" />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {footnote && (
          <div className="mt-6 text-xs leading-relaxed text-smoke">
            {footnote}
          </div>
        )}
      </div>
    </div>
  );
}
