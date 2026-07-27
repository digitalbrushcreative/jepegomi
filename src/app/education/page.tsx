import type { Metadata } from "next";
import { HubCard, PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "Education",
  description:
    "The two ends of the ministry's teaching: Jepegomi Academy for children, and the Contextual Bible Training College for adults.",
};

/*
  Unlike the Programs and Projects hubs, this one's children do not live beneath
  it — the Academy stays at /academy and the college at /college. A school's
  address is the thing people type and share, and it should not grow a prefix
  just because the nav learned to group it. The hub is a landing place, not a
  parent directory.
*/
const education = [
  {
    href: "/academy",
    eyebrow: "For children",
    title: "Jepegomi Academy",
    blurb:
      "Quality education with values — the school in Kahawa where the children learn, and where every one of the Food at School meals is served.",
    cta: "See the Academy",
    icon: "child" as const,
  },
  {
    href: "/college",
    eyebrow: "For adults",
    title: "Contextual Bible Training College",
    blurb:
      "The ministry's training arm, teaching the Scriptures in and for the community the church already serves.",
    cta: "About the college",
    icon: "book" as const,
  },
];

export default function EducationPage() {
  return (
    <>
      <PageHero
        eyebrow="Education"
        title="Teaching children, and teaching the people who teach them"
        intro="One arm of the ministry with two ends — a school for the children of Kahawa, and a Bible college for the adults who will lead and teach in it."
      />

      <section className="px-6 py-24">
        <div className="shell grid gap-6 md:grid-cols-2">
          {education.map((entry) => (
            <HubCard key={entry.href} {...entry} />
          ))}
        </div>
      </section>
    </>
  );
}
