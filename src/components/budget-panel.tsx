"use client";

import { useEffect, useState } from "react";
import { ClothEdge } from "@/components/pattern";
import {
  budget,
  budgetNote,
  budgetTotals,
  donation,
  outstanding,
} from "@/content/kitchen";

const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;

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

export function BudgetPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      {/*
        Almost no charity shows its donors the receipts. Jepegomi can, so the
        invitation to check the books is given its own quiet section rather than
        being buried as a link.
      */}
      <div className="relative bg-sand px-6 py-20 text-center">
        <ClothEdge className="text-sand" />

        <div className="shell">
          <p className="font-display mx-auto max-w-lg text-2xl leading-snug font-semibold text-balance">
            Every shilling of the {usd(budgetTotals.given)} is accounted for.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-7 cursor-pointer rounded-full bg-green px-9 py-4 text-[0.95rem] font-bold text-white shadow-warm transition-all hover:-translate-y-0.5 hover:bg-green-light"
          >
            See where it went
          </button>
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="budget-heading"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-plum-deep/80 p-5 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-warm-lg">
            <div className="sticky top-0 flex items-center justify-between bg-green px-8 py-7">
              <h2
                id="budget-heading"
                className="font-display text-2xl font-semibold text-white"
              >
                Where the {usd(budgetTotals.given)} went
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/35"
              >
                ✕
              </button>
            </div>

            <div className="p-8">
              <p className="leading-relaxed text-smoke">
                {donation.donor} of {donation.donorLocation} gave{" "}
                <strong className="text-charcoal">
                  {usd(donation.amountUsd)}
                </strong>{" "}
                to build the kitchen and dining area. Below is Pastor Simon&apos;s
                own reconciliation of what was estimated against what things
                actually cost.
              </p>

              <table className="mt-8 w-full border-collapse">
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
                <tbody>
                  {budget.map((line) => (
                    <Row
                      key={line.item}
                      item={line.item}
                      estimated={line.estimatedUsd}
                      actual={line.actualUsd === null ? "Used" : usd(line.actualUsd)}
                      note={line.note}
                    />
                  ))}
                  <tr>
                    <td className="py-4 text-sm font-bold">Total</td>
                    <td className="tabular py-4 text-right text-sm font-bold">
                      {usd(budgetTotals.given)}
                    </td>
                    <td className="tabular py-4 pl-4 text-right text-sm font-bold text-green">
                      {usd(budgetTotals.spent)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 rounded-xl border-l-4 border-marigold bg-marigold/10 px-6 py-5">
                <p className="text-sm leading-relaxed text-charcoal">
                  Costs ran over on almost every line — cement, sand, drainage
                  and ballast all cost more than planned, and the drainage work
                  had to grow to satisfy NEEMA regulations. The one line that
                  came in <em>under</em> was roofing and labour, because Pastor
                  Simon did the building he knew how to do himself, and put the
                  saved labour cost back into materials.
                </p>
              </div>

              <h3 className="font-display mt-10 text-xl font-semibold">
                Never reached — {usd(budgetTotals.stillNeeded)} still needed
              </h3>
              <table className="mt-4 w-full border-collapse">
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
                <tbody>
                  {outstanding.map((line) => (
                    <Row
                      key={line.item}
                      item={line.item}
                      estimated={line.estimatedUsd}
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
                      {usd(budgetTotals.stillNeeded)}
                    </td>
                    <td className="py-4" />
                  </tr>
                </tbody>
              </table>

              <p className="mt-6 text-xs leading-relaxed text-smoke">
                {budgetNote}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
