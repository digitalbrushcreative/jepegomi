import type { Metadata } from "next";
import { HubCard, PageHero } from "@/components/ui";
import { progress } from "@/content/kitchen";

export const metadata: Metadata = {
  title: "Projects",
  description: "The things we're building to serve better.",
};

/** Add a project by adding a card here and a page under /projects. */
const projects = [
  {
    href: "/projects/kitchen",
    eyebrow: `In progress · ${progress.percentComplete}% complete`,
    title: "Kitchen Build",
    blurb:
      "Replacing the open fires with a proper kitchen, store room and dining area — funded by Encounter Church. Photos, budget and progress.",
    cta: "Follow the build",
  },
];

export default function ProjectsPage() {
  return (
    <>
      <PageHero
        eyebrow="Projects"
        title="The things we're building to serve better"
      />

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <HubCard key={project.href} {...project} />
          ))}
        </div>
      </section>
    </>
  );
}
