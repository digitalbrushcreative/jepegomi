import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { Icon } from "@/components/icons";
import { PlaygroundEstimate } from "@/components/playground-estimate";
import { ClothEdge } from "@/components/pattern";
import { PhotoBand } from "@/components/photos";
import { ButtonLink, Eyebrow, PageHero, SectionTitle } from "@/components/ui";
import { showsAccounts } from "@/lib/disclosure";
import { getPlayground } from "@/lib/playground";
import { accountSet, visibilityOf } from "@/lib/project-accounts";

/**
 * Whole dollars. Every figure on this page is rounded to the nearest ten on the
 * way out of shillings (see `usdFromKes`), so there is never a cent to print —
 * which is why this is not the ledger's `usd`, which counts in cents.
 */
const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;

export const metadata: Metadata = {
  title: "The Playground",
  description:
    "The school playground at Jepegomi Academy — welded on site, standing on bare earth, and what replacing it with proper equipment and a rubber crumb safe surface would cost.",
};

export default async function PlaygroundPage() {
  const quote = await getPlayground();
  const { asItStands, estimateNote, isQuoted, photo, totalUsd } = quote;

  /*
    The two halves of the job, each one fundable without the other. Built here
    rather than at module scope because both totals now come out of the CMS —
    a constant computed at import time would be whatever the figures were when
    the process started.
  */
  const halves = [
    {
      icon: "child",
      eyebrow: quote.equipmentHeading,
      total: quote.equipmentUsd,
      body: quote.equipmentBody,
    },
    {
      icon: "paving",
      eyebrow: quote.groundHeading,
      total: quote.groundUsd,
      body: quote.groundBody,
    },
  ] as const;

  /*
    Whether the line-by-line estimate is printed here or kept behind the partner
    door. `disclosure: null` because nobody is signed in on a public page, so
    this is true only where Simon has set the switch in /app to "Anyone". The
    default keeps it closed — see lib/project-accounts.ts.
  */
  const publishEstimate = showsAccounts({
    visibility: visibilityOf(await getContent("projectAccounts"), "playground"),
    disclosure: null,
    areaId: accountSet("playground").area,
  });

  return (
    <>
      <PageHero
        eyebrow="Jepegomi Academy · The yard"
        title="Somewhere safe to land"
        intro="There is a playground at the academy. It was welded together on site out of angle iron and sheet metal, painted by hand, and set straight into the ground — and it is the only thing the children have."
      >
        <dl className="mt-12 flex flex-wrap gap-x-14 gap-y-6">
          <div>
            <dt className="eyebrow text-white/50">
              {isQuoted ? "The whole job" : "Estimated, whole job"}
            </dt>
            <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-marigold">
              {usd(totalUsd)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-white/50">Equipment</dt>
            <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-white">
              {usd(quote.equipmentUsd)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-white/50">Safe surface</dt>
            <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-white">
              {usd(quote.groundUsd)}
            </dd>
          </div>
        </dl>
      </PageHero>

      {/*
        The photograph carries the argument, so it comes before any of it — and
        it is barely cropped, because the part that matters is the bare ground
        along the bottom edge. A 21/9 band would centre on the sanctuary roof
        and cut away the floor this whole page is about.
      */}
      <PhotoBand
        photo={photo}
        aspect="aspect-[4/3] sm:aspect-[3/2]"
        className="pt-16"
      />

      <section className="px-6 py-20 sm:py-24">
        <div className="shell grid gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>As it stands</Eyebrow>
            <SectionTitle className="mt-4">
              Made on site, and left out in the weather
            </SectionTitle>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-smoke">
              Nothing in that yard was bought. Somebody at the church cut it,
              welded it and painted it, which is why it exists at all — and why
              the frames have rusted where mild steel always rusts, and why the
              slide has nothing left on it but rails.
            </p>
            <ul className="mt-8">
              {asItStands.map((item) => (
                <li
                  key={item}
                  className="flex items-baseline gap-3 border-b border-sand-deep py-3 leading-relaxed text-smoke"
                >
                  <span aria-hidden="true" className="text-clay">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/*
            The ground is the point of this page and it is the thing a reader
            looking at the photograph will not see, because bare earth does not
            photograph as dangerous. So it gets said in words, on its own, in a
            panel that is not a list of equipment.
          */}
          <aside className="self-start overflow-hidden rounded-2xl bg-green shadow-warm">
            <div className="p-8 sm:p-9">
              <Icon name="paving" className="h-9 w-9 text-marigold-light" />
              <p className="font-display mt-5 text-2xl leading-snug font-semibold text-white">
                The equipment is not the dangerous part
              </p>
              <p className="mt-5 leading-relaxed text-white/85">
                All of it stands on bare packed earth. In the dry season that
                ground is as hard as the concrete it looks like, and in the
                rains it is mud. A child coming off a swing lands on it either
                way.
              </p>
              <p className="mt-4 leading-relaxed text-white/85">
                New swings over the same ground would be a better fall onto the
                same floor. That is why the surfacing is costed here as half the
                job rather than as an extra at the bottom — and why it is the
                larger half.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* The two halves, each one a thing somebody could fund on its own. */}
      <section className="relative bg-sand px-6 py-20 sm:py-24">
        <ClothEdge className="text-sand" />

        <div className="shell">
          <div className="flex flex-col items-center text-center">
            <Eyebrow>Two halves</Eyebrow>
            <SectionTitle className="mt-4 flex flex-col items-center">
              What they play on, and what they land on
            </SectionTitle>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-smoke">
              Neither half needs the other to be useful. Surfacing the yard
              makes what is already there survivable; new equipment on a
              surfaced yard finishes it.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {halves.map((half) => (
              <div
                key={half.eyebrow}
                className="flex flex-col rounded-2xl bg-white p-8 shadow-warm"
              >
                <Icon name={half.icon} className="h-9 w-9 text-plum" />
                <p className="eyebrow mt-5 text-smoke">{half.eyebrow}</p>
                <p className="font-display tabular mt-2 text-4xl leading-none font-semibold text-plum">
                  {usd(half.total)}
                </p>
                <p className="mt-5 flex-1 leading-relaxed text-smoke">
                  {half.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The estimate, as a total rather than as a delivery note. */}
      <section className="px-6 py-20 sm:py-24">
        <div className="shell">
          <Eyebrow>The estimate</Eyebrow>
          <SectionTitle className="mt-4">
            What the whole job comes to
          </SectionTitle>

          {/*
            This section used to print both quote tables in full: every frame,
            every price in shillings, down to the six-seat merry-go-round. As a
            piece of transparency it was exemplary. As a public document it was
            a list of what is about to be delivered to a school compound in
            Nairobi and what each item is worth, published before any of it
            arrives — which is a different thing altogether, and the reason the
            lines now sit behind the partner door. See lib/disclosure.ts.

            What is left is what somebody deciding whether to help actually
            needs: the two halves, what each comes to, and the honest note that
            none of it has been quoted yet.
          */}
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-smoke">
            The job splits in two and each half stands on its own — the
            equipment the children play on, and the ground they land on.
            {publishEstimate
              ? " Every line behind these totals is set out below."
              : " The line-by-line estimate behind these totals is shared with partners who take on part of the work rather than published here."}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-plum px-8 py-7 shadow-warm">
            <p className="eyebrow text-white/70">
              {isQuoted ? "The whole job" : "Estimated total"}
            </p>
            <p className="font-display tabular text-4xl font-semibold text-marigold">
              {usd(totalUsd)}
            </p>
          </div>

          {/*
            The kitchen figures on this site came out of a reconciliation letter
            and the bus price came from a dealer. These came from neither, and a
            reader has no way of telling the three apart unless one of them says
            so. Dashed and clay-coloured, like every other thing on this site
            that is not yet confirmed.
          */}
          {publishEstimate && (
            <div className="mt-12">
              <PlaygroundEstimate quote={quote} />
            </div>
          )}

          {!isQuoted && (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-clay/35 bg-clay/5 p-8">
              {/* Not <Eyebrow>: that one bakes in text-plum, and overriding a
                  colour by stacking a second one on top of it depends on which
                  order Tailwind happens to emit the two utilities in. */}
              <p className="eyebrow text-clay">Estimated, not quoted</p>
              <p className="mt-3 max-w-2xl leading-relaxed text-smoke">
                {estimateNote}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* The ask. */}
      <section className="relative overflow-hidden bg-plum-deep px-6 py-20 text-center sm:py-24">
        <div className="grain-layer" />
        <ClothEdge className="text-plum-deep" />

        <div className="shell relative">
          <div className="mx-auto max-w-md">
            <p className="eyebrow text-marigold">Partner With Us</p>
            <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-[2.6rem]">
              Give the children ground to fall on
            </h2>
            <p className="mt-6 leading-relaxed text-white/65">
              A gift can be marked for the playground, for either half of it, or
              for any part of a half — {usd(quote.groundUsd)} surfaces the yard, and
              nothing has to arrive all at once. We will send you the giving
              details ourselves.
            </p>

            <ButtonLink href="/give" icon="give" className="mt-9">
              How to give
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
