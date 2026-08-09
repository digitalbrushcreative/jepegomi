import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { HubCard, PageHero, Verse } from "@/components/ui";
import { getKitchenReport } from "@/lib/kitchen";
import { getPlayground } from "@/lib/playground";
import { pageMeta } from "@/lib/seo";

const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;

export const metadata: Metadata = pageMeta({
  title: "Projects",
  description: "The things we're building to serve better.",
  path: "/projects",
});

/*
  Where the cards go, and nothing else. The words on them are edited in the CMS
  and paired with this list in order. Add a project by adding a link here, a
  card in the editor, and a page under /projects.
*/
const links = [{ href: "/projects/kitchen" }, { href: "/projects/playground" }];

export default async function ProjectsPage() {
  const [content, kitchen, playground] = await Promise.all([
    getContent("projects"),
    getKitchenReport(),
    getPlayground(),
  ]);

  /*
    Both eyebrows carry a figure that comes out of the database, so the label is
    built here rather than typed: the editor owns the words before the dot and
    the ledger owns what comes after it. A percentage on this page therefore
    cannot drift from the same percentage on the project's own page.
  */
  const figures = [
    `${kitchen.percentComplete}% complete`,
    `${usd(playground.totalUsd)} for the whole job`,
  ];

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

            return (
              <HubCard
                key={link.href}
                {...link}
                {...card}
                eyebrow={`${card.eyebrow} · ${figures[index]}`}
              />
            );
          })}
        </div>
      </section>

      <Verse text={content.verse} reference={content.verseRef} />
    </>
  );
}
