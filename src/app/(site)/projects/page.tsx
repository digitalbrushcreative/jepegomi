import type { Metadata } from "next";
import { HubCard, PageHero } from "@/components/ui";
import { getKitchenReport } from "@/lib/kitchen";
import { getPlayground } from "@/lib/playground";

const usd = (amount: number) => `$${amount.toLocaleString("en-US")}`;

export const metadata: Metadata = {
  title: "Projects",
  description: "The things we're building to serve better.",
};

export default async function ProjectsPage() {
  const [kitchen, playground] = await Promise.all([
    getKitchenReport(),
    getPlayground(),
  ]);

  /*
    Add a project by adding a card here and a page under /projects. Built inside
    the component because both eyebrows carry a figure that now comes out of the
    database — a module-level array would freeze whichever values were saved when
    the process started.
  */
  const projects = [
    {
      href: "/projects/kitchen",
      eyebrow: `Cooking · ${kitchen.percentComplete}% complete`,
      title: "Kitchen Build",
      blurb:
        "The kitchen and store room that replaced the open fires — built with a partner church, cooking daily, with the dining area still to finish. Photos, budget and what is left.",
      cta: "See the build",
    },
    {
      href: "/projects/playground",
      eyebrow: `The yard · ${usd(playground.totalUsd)} estimated`,
      title: "The Playground",
      blurb:
        "Swings welded on site out of angle iron, a slide stripped to its frame, and all of it standing on bare packed earth. What proper equipment and a rubber crumb safe surface would cost.",
      cta: "See the estimate",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Projects"
        title="The things we're building to serve better"
      />

      <section className="px-6 py-24">
        <div className="shell grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <HubCard key={project.href} {...project} />
          ))}
        </div>
      </section>
    </>
  );
}
