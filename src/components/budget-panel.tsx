"use client";

import { useEffect, useState } from "react";
import {
  budget,
  budgetNote,
  budgetTotalUsd,
  donation,
} from "@/content/kitchen";

const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;

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
          Want to see how the {usd(donation.amountUsd)} is being used?
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="label-mono mt-6 cursor-pointer rounded-sm bg-green px-10 py-4 text-white transition-colors hover:bg-green-light"
        >
          View Budget Breakdown
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white">
            <div className="flex items-center justify-between bg-green px-8 py-7">
              <h2
                id="budget-heading"
                className="font-display text-2xl font-bold text-white"
              >
                Budget Breakdown
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
              >
                ✕
              </button>
            </div>

            <div className="p-8">
              <p className="border-b border-sand pb-6 leading-relaxed text-smoke">
                <strong className="text-charcoal">
                  {usd(donation.amountUsd)}
                </strong>{" "}
                donated by {donation.donor} · Jepegomi Academy Kitchen · 2025
              </p>

              <div className="mt-6 rounded-sm border border-dashed border-smoke/30 bg-sand p-4">
                <p className="label-mono text-plum">Figures not yet confirmed</p>
                <p className="mt-2 text-sm leading-relaxed text-smoke">
                  The per-item costs below were lost in transfer from the
                  original report and have not been re-confirmed by Simon and
                  Joyce. Rather than show a guess, they are marked{" "}
                  <span className="font-mono">TBC</span>. The{" "}
                  {usd(donation.amountUsd)} donation figure is confirmed.
                </p>
              </div>

              <table className="mt-8 w-full border-collapse">
                <thead>
                  <tr>
                    <th className="label-mono border-b border-sand pb-3 text-left text-smoke">
                      Item
                    </th>
                    <th className="label-mono border-b border-sand pb-3 text-right text-smoke">
                      Est. Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budget.map((line) => (
                    <tr key={line.item}>
                      <td
                        className={`border-b border-sand py-3.5 text-sm leading-snug ${
                          line.complete ? "text-smoke/60" : "text-charcoal"
                        }`}
                      >
                        {line.item}
                        {line.complete && (
                          <span className="label-mono mt-1 block w-fit rounded-sm bg-[#edf7ee] px-2 py-0.5 text-green">
                            ✓ Complete
                          </span>
                        )}
                      </td>
                      <td className="font-mono border-b border-sand py-3.5 text-right text-sm text-plum">
                        {line.costUsd === null ? (
                          <span className="text-smoke/50">TBC</span>
                        ) : (
                          usd(line.costUsd)
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-5 text-sm font-semibold">
                      Total estimated project cost
                    </td>
                    <td className="font-mono pt-5 text-right text-sm font-semibold text-green">
                      {budgetTotalUsd === null ? (
                        <span className="text-smoke/50">TBC</span>
                      ) : (
                        usd(budgetTotalUsd)
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 flex items-center justify-between rounded-sm bg-[#f3eef1] px-5 py-4">
                <span className="label-mono text-plum">
                  Donated by {donation.donor}, {donation.donorLocation}
                </span>
                <span className="font-display text-2xl font-bold text-plum">
                  {usd(donation.amountUsd)}
                </span>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-smoke">
                {budgetNote}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
