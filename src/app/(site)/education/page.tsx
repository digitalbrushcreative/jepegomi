import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { PhotoBand } from "@/components/photos";
import { HubCard, PageHero } from "@/components/ui";
import { pageMeta } from "@/lib/seo";

const pupils = {
  src: "/photos/academy/pupils.jpg",
  alt: "A group of young children in green jumpers and checked uniform standing together outside the school",
  caption: "Jepegomi Academy, Kahawa Sukari.",
};

export const metadata: Metadata = pageMeta({
  title: "Education",
  description:
    "The two ends of the ministry's teaching: Jepegomi Academy for children, and the Contextual Bible Training College for adults.",
  path: "/education",
});

/*
  Unlike the Programs and Projects hubs, this one's children do not live beneath
  it — the Academy stays at /academy and the college at /college. A school's
  address is the thing people type and share, and it should not grow a prefix
  just because the nav learned to group it. The hub is a landing place, not a
  parent directory.

  As on the other hubs, only the destination is fixed here; the words on each
  card are edited in the CMS and paired with this list in order.
*/
const links = [
  { href: "/academy", icon: "child" as const },
  { href: "/college", icon: "book" as const },
];

export default async function EducationPage() {
  const content = await getContent("education");

  return (
    <>
      <PageHero title={content.heading} intro={content.intro || undefined} />

      <PhotoBand photo={pupils} aspect="aspect-[21/9]" className="pt-4" />

      <section className="px-6 py-24">
        <div className="shell grid gap-6 md:grid-cols-2">
          {links.map((link, index) => {
            const card = content.cards[index];
            if (!card) return null;

            return <HubCard key={link.href} {...link} {...card} />;
          })}
        </div>
      </section>
    </>
  );
}
