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
      "Morning porridge and a hot lunch, every school day, for children at Jepegomi Academy — balanced enough to carry them through a full day of lessons.",
    cta: "See the program",
    icon: "pot" as const,
  },
  {
    href: "/programs/digital",
    eyebrow: "Streaming",
    title: "Jepegomi Digital",
    blurb:
      "Sunday services and weekday fellowships, streamed from the sanctuary in Kahawa Sukari to whoever will watch — filmed, for now, on phones.",
    cta: "See the channel",
    icon: "globe" as const,
  },
  {
    href: "/programs/transport",
    eyebrow: "Getting to school",
    title: "School Transport",
    blurb:
      "The academy's van is off the road and being repaired. Beyond it, the school is raising for a 26-seater bus of its own.",
    cta: "See the appeal",
    icon: "bus" as const,
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
        <div className="shell grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <HubCard key={program.href} {...program} />
          ))}
        </div>
      </section>
    </>
  );
}
