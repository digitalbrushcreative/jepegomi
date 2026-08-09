import type { Metadata } from "next";
import { HubCard, PageHero, Verse } from "@/components/ui";
import { getContent } from "@/cms/content";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Programs",
  description: "The ways Jepegomi serves its community day to day.",
  path: "/programs",
});

/*
  Where the cards go. Only where — the words on them are edited in the CMS and
  are paired with this list in order, so a card is a route here and a paragraph
  there. Add a program by adding a link here, a card in the editor, and a page
  under /programs.
*/
const links = [
  { href: "/programs/food-at-school", icon: "pot" as const },
  { href: "/programs/digital", icon: "globe" as const },
  { href: "/programs/transport", icon: "bus" as const },
];

export default async function ProgramsPage() {
  const content = await getContent("programs");

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

            return <HubCard key={link.href} {...link} {...card} />;
          })}
        </div>
      </section>

      <Verse text={content.verse} reference={content.verseRef} />
    </>
  );
}
