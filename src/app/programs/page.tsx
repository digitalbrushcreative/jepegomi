import type { Metadata } from "next";
import { HubCard, PageHero } from "@/components/ui";

export const metadata: Metadata = {
  title: "Programs",
  description: "The ways Jepegomi serves its community day to day.",
};

/** Add a program by adding a card here and a page under /programs. */
const programs = [
  {
    href: "/programs/food-at-school",
    eyebrow: "Feeding",
    title: "Food at School",
    blurb:
      "Morning porridge and a hot lunch, every school day, for children at Jepegomi Academy. For many it is the most reliable meal they get.",
    cta: "See the program",
  },
];

export default function ProgramsPage() {
  return (
    <>
      <PageHero
        eyebrow="Programs"
        title="The ways Jepegomi serves its community day to day"
      />

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <HubCard key={program.href} {...program} />
          ))}
        </div>
      </section>
    </>
  );
}
