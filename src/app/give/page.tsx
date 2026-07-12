import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { Eyebrow, Placeholder } from "@/components/ui";

export const metadata: Metadata = {
  title: "Give",
  description:
    "Support Food at School and the kitchen build at Jepegomi Academy, Nairobi.",
};

/**
 * A bank detail that has been confirmed shows; one that hasn't stays flagged as
 * a placeholder, so a missing routing number can never be mistaken for a real
 * one. Filling it in on /app is what turns the flag into the figure.
 */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-5">
      <dt className="label-mono text-smoke">{label}</dt>
      <dd className="font-mono mt-1.5 text-lg font-medium">
        {value ? value : <Placeholder>To be confirmed</Placeholder>}
      </dd>
    </div>
  );
}

export default async function GivePage() {
  const [giving, site] = await Promise.all([
    getContent("giving"),
    getContent("site"),
  ]);

  return (
    <>
      <section className="bg-plum-deep px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="label-mono text-white/45">Partner With Us</p>
          <h1 className="font-display mt-4 text-4xl leading-tight font-bold text-white sm:text-5xl">
            Support Food at School &amp; the Kitchen
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
            Every gift helps feed children and finish the kitchen.
          </p>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded border border-black/8 bg-white">
            <div className="bg-green px-8 py-5">
              <p className="label-mono text-white/60">Bank transfer</p>
              <p className="font-display mt-1 text-2xl font-bold text-white">
                {giving.bank}
              </p>
            </div>

            <dl className="divide-y divide-sand px-8">
              <div className="py-5">
                <dt className="label-mono text-smoke">Account holders</dt>
                <dd className="mt-1.5 text-lg font-medium">
                  {giving.accountName}
                </dd>
              </div>
              <Detail label="Account number" value={giving.accountNumber} />
              <Detail label="Routing number" value={giving.routingNumber} />
              <Detail
                label="SWIFT / BIC (from outside the US)"
                value={giving.swift}
              />
            </dl>

            <p className="border-t border-sand bg-sand/60 px-8 py-5 text-sm leading-relaxed text-smoke">
              {giving.reference}
            </p>
          </div>

          <div className="mt-10 text-center">
            <Eyebrow>Questions about giving</Eyebrow>
            <p className="mt-3 text-smoke">
              <a
                href={`mailto:${site.email}`}
                className="font-medium text-plum underline underline-offset-4 hover:text-plum-light"
              >
                {site.email}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
