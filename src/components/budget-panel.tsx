"use client";

import { useEffect, useState } from "react";
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
      <td className="border-b border-sand py-3.5 pr-4 align-top">
        <p className={`text-sm ${muted ? "text-smoke" : "text-charcoal"}`}>
          {item}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-smoke">{note}</p>
      </td>
      <td className="font-mono border-b border-sand py-3.5 text-right align-top text-sm text-smoke">
        {usd(estimated)}
      </td>
      <td
        className={`font-mono border-b border-sand py-3.5 pl-4 text-right align-top text-sm ${
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
      <div className="bg-sand px-6 py-20 text-center">
        <p className="text-smoke">
          Every shilling of the {usd(budgetTotals.given)} is accounted for.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="label-mono mt-6 cursor-pointer rounded-sm bg-green px-10 py-4 text-white transition-colors hover:bg-green-light"
        >
          See where it went
        </button>
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
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white">
            <div className="flex items-center justify-between bg-green px-8 py-7">
              <h2
                id="budget-heading"
                className="font-display text-2xl font-bold text-white"
              >
                Where the {usd(budgetTotals.given)} went
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
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
                    <th className="label-mono border-b border-sand pb-3 text-left text-smoke">
                      Item
                    </th>
                    <th className="label-mono border-b border-sand pb-3 text-right text-smoke">
                      Estimated
                    </th>
                    <th className="label-mono border-b border-sand pb-3 pl-4 text-right text-smoke">
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
                    <td className="py-4 text-sm font-semibold">Total</td>
                    <td className="font-mono py-4 text-right text-sm font-semibold">
                      {usd(budgetTotals.given)}
                    </td>
                    <td className="font-mono py-4 pl-4 text-right text-sm font-semibold text-green">
                      {usd(budgetTotals.spent)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 rounded-sm bg-[#f3eef1] px-5 py-4">
                <p className="text-sm leading-relaxed text-charcoal">
                  Costs ran over on almost every line — cement, sand, drainage
                  and ballast all cost more than planned, and the drainage work
                  had to grow to satisfy NEEMA regulations. The one line that
                  came in <em>under</em> was roofing and labour, because Pastor
                  Simon did the building he knew how to do himself, and put the
                  saved labour cost back into materials.
                </p>
              </div>

              <h3 className="font-display mt-10 text-xl font-bold">
                Never reached — {usd(budgetTotals.stillNeeded)} still needed
              </h3>
              <table className="mt-4 w-full border-collapse">
                <thead>
                  <tr>
                    <th className="label-mono border-b border-sand pb-3 text-left text-smoke">
                      Item
                    </th>
                    <th className="label-mono border-b border-sand pb-3 text-right text-smoke">
                      Estimated
                    </th>
                    <th className="label-mono border-b border-sand pb-3 pl-4 text-right text-smoke">
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
                    <td className="py-4 text-sm font-semibold">
                      Still needed to finish
                    </td>
                    <td className="font-mono py-4 text-right text-sm font-semibold text-plum">
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
