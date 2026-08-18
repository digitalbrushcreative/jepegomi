import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { Money } from "@/components/money";
import { ProjectItems } from "@/components/project-items";
import { Icon } from "@/components/icons";
import { PlaygroundEstimate } from "@/components/playground-estimate";
import { ClothEdge } from "@/components/pattern";
import { PhotoBand } from "@/components/photos";
import { ButtonLink, PageHero, SectionTitle } from "@/components/ui";
import { showsAccounts } from "@/lib/disclosure";
import { getPlayground } from "@/lib/playground";
import { accountSet, visibilityOf } from "@/lib/project-accounts";
import { pageMeta } from "@/lib/seo";
import { RelatedLinks } from "@/components/related-links";

/**
 * Whole dollars. Every figure on this page is rounded to the nearest ten on the
 * way out of shillings (see `usdFromKes`), so there is never a cent to print —
 * which is why this is not the ledger's `usd`, which counts in cents.
 */
/*
  The playground is quoted in whole dollars, not cents — `usdFromKes` rounds to
  the nearest ten on the way out of shillings, because a supplier's price at a
  rate that moves daily has no business claiming cents. Every figure on this page
  goes through `Money`, which speaks the site's currency unit, so the conversion
  happens once here rather than at eight call sites.
*/
const cents = (dollars: number) => Math.round(dollars) * 100;

export const metadata: Metadata = pageMeta({
  title: "The Playground",
  description:
    "The school playground at Jepegomi Academy — built by hand at the church, and what it would cost to give the children lasting equipment and a soft surface to land on.",
  path: "/projects/playground",
});

export default async function PlaygroundPage() {
  const quote = await getPlayground();
  const { asItStands, photo, totalUsd } = quote;

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
        title="A better place to play"
        intro="The academy already has a playground, built by hand at the church and well used every day. The next step is equipment that will last and a soft surface underneath — room to play freely, and somewhere safe to land."
      >
        <dl className="mt-12 flex flex-wrap gap-x-14 gap-y-6">
          <div>
            <dt className="eyebrow text-white/50">The whole job</dt>
            <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-marigold">
              <Money cents={cents(totalUsd)} />
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-white/50">Equipment</dt>
            <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-white">
              <Money cents={cents(quote.equipmentUsd)} />
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-white/50">Safe surface</dt>
            <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-white">
              <Money cents={cents(quote.groundUsd)} />
            </dd>
          </div>
        </dl>
      </PageHero>

      {/*
        The photograph carries the argument, so it comes before any of it. The
        source frame is 4/3 and the crop steps in from there: what a 16/9 band
        takes off is sky at the top and empty grass at the bottom, and the swings
        and the bare ground under them — the part this whole page is about — are
        in the middle and survive it. 21/9 is where it would start centring on
        the sanctuary roof and cutting away the floor, so it stops short of that.
      */}
      <PhotoBand
        photo={photo}
        aspect="aspect-[3/2] sm:aspect-[16/9]"
        className="pt-16"
      />

      <section className="px-6 py-20 sm:py-24">
        <div className="shell grid gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionTitle>
              Made by hand, and ready for the next step
            </SectionTitle>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-smoke">
              Nothing in that yard was bought. Somebody at the church cut it,
              welded it and painted it, and it has given the children somewhere
              to play for years. Galvanised equipment is what carries that
              forward — built to stand in the weather, and to serve the classes
              still to come.
            </p>
            <ul className="mt-8">
              {asItStands.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 border-b border-sand-deep py-3 leading-relaxed text-smoke"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.7em] h-px w-3.5 shrink-0 bg-clay"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/*
            The ground is the point of this page and it is the thing a reader
            looking at the photograph will not see, because bare earth does not
            photograph as anything at all. So it gets said in words, on its own,
            in a panel that is not a list of equipment.
          */}
          <aside className="self-start overflow-hidden rounded-2xl bg-green shadow-warm">
            <div className="p-8 sm:p-9">
              <Icon name="paving" className="h-9 w-9 text-marigold-light" />
              <p className="font-display mt-5 text-2xl leading-snug font-semibold text-white">
                Start with the ground
              </p>
              <p className="mt-5 leading-relaxed text-white/85">
                The equipment is the half you can see; the surface under it is
                the half that decides how a child lands. Rubber crumb turns the
                yard into somewhere they can run, climb and fall over the way
                children do.
              </p>
              <p className="mt-4 leading-relaxed text-white/85">
                So it is costed here as half the job rather than an extra at the
                bottom — and it is the larger half.
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
            <SectionTitle className="flex flex-col items-center">
              What they play on, and what they land on
            </SectionTitle>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-smoke">
              Neither half needs the other. Surfacing the yard makes everything
              already standing in it safer; new equipment on a surfaced yard
              completes it.
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
                  <Money cents={cents(half.total)} />
                </p>
                <p className="mt-5 flex-1 leading-relaxed text-smoke">
                  {half.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        The equipment and the surface, as the ledger holds them — two steps, in
        the order they have to happen, because there is no sense buying a rubber
        crumb floor for frames nobody has paid for yet. See lib/projects.ts.
      */}
      <ProjectItems area="playground" />

      {/* The estimate, as a total rather than as a delivery note. */}
      <section className="px-6 py-20 sm:py-24">
        <div className="shell">
          <SectionTitle>
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
            needs: the two halves, and what each comes to.
          */}
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-smoke">
            The job splits in two and each half stands on its own: the
            equipment the children play on, and the ground they land on.
            {publishEstimate
              ? " Every line behind these totals is set out below."
              : " The line-by-line estimate behind these totals is shared with partners who take on part of the work rather than published here."}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-plum px-8 py-7 shadow-warm">
            <p className="eyebrow text-white/70">The whole job</p>
            <p className="font-display tabular text-4xl font-semibold text-marigold">
              <Money cents={cents(totalUsd)} />
            </p>
          </div>

          {/*
            Every total on this page wore an "Estimated" label once, and the
            kitchen's came from a reconciliation letter while the bus's came
            from a dealer — three kinds of figure, each hedged separately. The
            site now says once, on /needs, that its costings come from quotes
            and estimates. Saying it again beside each number did not make any
            of them truer; it made them all look provisional, including the ones
            somebody is being asked to act on.
          */}
          {publishEstimate && (
            <div className="mt-12">
              <PlaygroundEstimate quote={quote} />
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
            <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-[2.6rem]">
              Give the children a safe place to play
            </h2>
            <p className="mt-6 leading-relaxed text-white/65">
              The whole job is <Money cents={cents(totalUsd)} />, and nothing has to arrive all at
              once — <Money cents={cents(quote.groundUsd)} /> surfaces the yard on its own.
            </p>

            {/*
              `?for=` names the project, so the form opens on it rather than
              asking a question this page has already answered. See the note on
              `initialTowards` in components/give-form.tsx.
            */}
            <ButtonLink
              href="/give?for=playground#pledge"
              icon="give"
              className="mt-9"
            >
              Give to the playground
            </ButtonLink>
          </div>
        </div>
      </section>

      <RelatedLinks
        links={[
          {
            href: "/academy",
            label: "Jepegomi Academy",
            blurb:
              "The school whose children play on it — kindergarten to Grade 6, in Kahawa Sukari.",
          },
          {
            href: "/projects/kitchen",
            label: "Kitchen Build",
            blurb:
              "The other thing built in this yard: a kitchen that replaced open fires, and what is left to finish it.",
          },
          {
            href: "/needs",
            label: "What's needed",
            blurb:
              "The open ledger — the playground alongside every other costed ask, with what is still short.",
          },
        ]}
      />
    </>
  );
}
