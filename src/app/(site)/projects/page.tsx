import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getContent } from "@/cms/content";
import { Money } from "@/components/money";
import { HubCard, PageHero, Verse } from "@/components/ui";
import { getAppeals } from "@/lib/appeals";
import { getKitchenReport } from "@/lib/kitchen";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Projects",
  description: "The things we're building to serve better.",
  path: "/projects",
});

/*
  Where the cards go, and nothing else. The words on them are edited in the CMS
  and paired with this list in order. Add a project by adding a link here, a
  card in the editor, and a page for it to point at.

  Two of these point into /programs rather than /projects, which looks like an
  inconsistency and is the honest state of things: the bus and the streaming kit
  are programmes the ministry runs *and* jobs it is raising for, and they were
  reachable only as the former. Being raised for is what this page is a list of,
  so they belong on it whatever their address. Nobody is served by a second
  transport page existing purely to make a URL tidy.
*/
const links = [
  { href: "/projects/kitchen", area: "kitchen" },
  { href: "/projects/playground", area: "playground" },
  { href: "/programs/transport", area: "transport" },
  { href: "/programs/digital", area: "digital" },
] as const;

export default async function ProjectsPage() {
  const [content, kitchen, appeals] = await Promise.all([
    getContent("projects"),
    getKitchenReport(),
    getAppeals(),
  ]);

  /*
    Every eyebrow carries a figure that comes out of the database, so the label
    is built here rather than typed: the editor owns the words before the dot
    and the ledger owns what comes after it. A percentage on this page therefore
    cannot drift from the same percentage on the project's own page.

    The kitchen is the one measured in progress rather than in price, because it
    is the one being finished — the others have not been started, and "0%
    complete" on a playground nobody has bought a swing for reads as a failure
    rather than as an ask. Those show what the whole job comes to, which is the
    same figure /needs prints for them, off the same function.
  */
  const figureFor = (area: string): ReactNode => {
    if (area === "kitchen") return `${kitchen.percentComplete}% complete`;
    const appeal = appeals.find((entry) => entry.area.id === area);
    if (!appeal) return "";

    return (
      <>
        <Money cents={appeal.costCents} /> for the whole job
      </>
    );
  };

  return (
    <>
      <PageHero title={content.heading} intro={content.intro || undefined} />

      <section className="px-6 py-24">
        <div className="shell grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link, index) => {
            /*
              The links decide how many cards there are, not the saved content.
              A card added in the editor with no page to point at is dropped
              rather than rendered as a link to nowhere.
            */
            const card = content.cards[index];
            if (!card) return null;

            const figure = figureFor(link.area);

            return (
              <HubCard
                key={link.href}
                href={link.href}
                {...card}
                eyebrow={
                  figure ? (
                    <>
                      {card.eyebrow} · {figure}
                    </>
                  ) : (
                    card.eyebrow
                  )
                }
              />
            );
          })}
        </div>
      </section>

      <Verse text={content.verse} reference={content.verseRef} />
    </>
  );
}
