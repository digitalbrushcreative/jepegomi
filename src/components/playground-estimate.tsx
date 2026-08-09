import type { Playground, QuoteLine } from "@/lib/playground";

/**
 * The playground estimate, line by line.
 *
 * These two tables were the body of /projects/playground. Every frame, every
 * price in shillings, published before a single item had been bought — which
 * reads as transparency until you read it as what it also is: a list of what is
 * due to be delivered to a school compound in Nairobi, and what each piece is
 * worth. The public page keeps the argument, the photograph and the two totals;
 * this is where the lines went. Who may read them is two questions rather than
 * one — the switch in /app under Giving -> Project accounts, and then the rule
 * in lib/disclosure.ts — and `showsAccounts` asks both, so this component never
 * has to.
 *
 * Shillings and dollars in the same row, as before. The shilling figure is the
 * real one — this is a Kenyan job bought from Kenyan suppliers — and the dollar
 * figure is the one a reader in Pennsylvania can act on. Both arrive already
 * worked out, from lib/playground.ts; nothing is converted here.
 */

const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;
const ksh = (amount: number) => `KSh ${amount.toLocaleString("en-US")}`;

function QuoteTable({
  caption,
  lines,
  total,
}: {
  caption: string;
  lines: readonly QuoteLine[];
  total: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-warm">
      <p className="eyebrow bg-plum px-6 py-3.5 text-white">{caption}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-sand-deep">
              <th className="eyebrow px-6 py-3 text-smoke">Item</th>
              <th className="eyebrow px-6 py-3 text-right text-smoke">
                Shillings
              </th>
              <th className="eyebrow px-6 py-3 text-right text-smoke">USD</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.item} className="border-b border-sand-deep">
                <td className="px-6 py-4">
                  <p className="leading-snug font-medium text-charcoal">
                    {line.item}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-smoke">
                    {line.note}
                  </p>
                </td>
                <td className="tabular px-6 py-4 text-right align-top text-sm whitespace-nowrap text-smoke">
                  {ksh(line.priceKes)}
                </td>
                <td className="font-display tabular px-6 py-4 text-right align-top font-semibold whitespace-nowrap">
                  {usd(line.priceUsd)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-sand">
              <td className="eyebrow px-6 py-4 text-smoke">{caption} total</td>
              <td />
              <td className="font-display tabular px-6 py-4 text-right text-xl font-semibold text-plum">
                {usd(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function PlaygroundEstimate({ quote }: { quote: Playground }) {
  return (
    <div className="space-y-6">
      <QuoteTable
        caption={quote.equipmentHeading}
        lines={quote.equipment}
        total={quote.equipmentUsd}
      />
      <QuoteTable
        caption={quote.groundHeading}
        lines={quote.ground}
        total={quote.groundUsd}
      />

      <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-plum px-8 py-7 shadow-warm">
        <p className="eyebrow text-white/70">Estimated total</p>
        <p className="font-display tabular text-4xl font-semibold text-marigold">
          {usd(quote.totalUsd)}
        </p>
      </div>
    </div>
  );
}
