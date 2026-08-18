import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Money } from "@/components/money";
import { ButtonLink, SectionTitle } from "@/components/ui";
import { areaOf } from "@/lib/giving";
import { getParts, getProjects, getPublishedNeeds } from "@/lib/needs";
import { buildProjects, laterParts, readyParts } from "@/lib/projects";

/**
 * What a project is actually made of, on the project's own page.
 *
 * ## Why this exists
 *
 * For a long time the kitchen was the only project anybody had broken into
 * lines, so it was the only page that could show them — everything else carried
 * one figure out of the CMS and a paragraph arguing for it. The playground, the
 * bus and the streaming kit are all in the ledger now, itemised, and their pages
 * went on showing the single figure as though they were not. A reader who
 * followed "see the work" off /needs landed on a page with less detail than the
 * list they came from, which is the wrong way round: the project's own page
 * should be the fullest account of it on the site.
 *
 * ## What it shows, and what it does not
 *
 * The lines, by name, grouped into the steps of the work — and no price against
 * any of them. That rule is the kitchen page's and it is worth keeping for the
 * same reason it was written there: a list of named fixtures with a figure
 * against each is a delivery schedule for a compound in Nairobi, and that was
 * never what anybody meant to publish. What is here is the shape of the job.
 *
 * One total sits underneath, and it goes through `Money` like every other figure
 * on the site, so it is a blur until somebody signs in. That is the number a
 * reader can act on and the only one they need on this page; the balance on each
 * individual line lives on /needs, behind the same door.
 *
 * ## The steps that are not open yet
 *
 * Shown, and plainly marked as waiting. A project sequences its parts — the
 * surface goes down after the frames are paid for, see lib/projects.ts — and a
 * page that quietly hid the later half would be understating the job. What those
 * rows do not get is a way to give to them, which is the same treatment /needs
 * gives them under "comes later".
 *
 * Renders nothing at all when a project has no lines yet. A heading over an
 * empty grid is worse than no heading, and this component is dropped onto pages
 * whose projects may be itemised later or never.
 *
 * ## Nothing here is written in this file
 *
 * Every word and every figure below comes out of Postgres and is editable in
 * /app: the project's own title and summary, each step's title and summary, and
 * every line with its cost. The one exception is the section heading, which is
 * a structural label rather than content — it says the same thing on all four
 * project pages, and four pages that could drift into four different words for
 * the same list is not editorial freedom, it is a bug waiting to be reported.
 *
 * That matters more than it looks. These lines were a TypeScript file once, and
 * changing a price meant a deploy — see the note in the README about there being
 * no src/content directory any more. A component that quietly reintroduced
 * hardcoded copy alongside database figures would be halfway back to that.
 */
export async function ProjectItems({ area }: { area: string }) {
  const [needs, parts, projects] = await Promise.all([
    getPublishedNeeds(),
    getParts(),
    getProjects(),
  ]);

  const project = buildProjects(needs, parts, projects).find(
    (group) => group.area.id === area,
  );
  if (!project) return null;

  /*
    The project's own words, out of the row Simon can edit. Blank is a perfectly
    ordinary answer — a project whose lines speak for themselves does not need a
    sentence introducing them — so the paragraph disappears rather than falling
    back to something written here.
  */
  const intro = project.project?.summary?.trim();

  const ready = readyParts(project);
  const later = laterParts(project);
  if (ready.length === 0 && later.length === 0) return null;

  return (
    <section className="relative bg-cream px-6 py-20 sm:py-24">
      <div className="shell">
        <div className="flex flex-col items-center text-center">
          <SectionTitle className="flex flex-col items-center">
            What it is made of
          </SectionTitle>
          {intro && (
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-smoke">
              {intro}
            </p>
          )}
        </div>

        {ready.map((group) => (
          <div key={group.part?.id ?? "loose"} className="mt-12">
            {group.part && (
              <div className="mx-auto max-w-2xl text-center">
                <h3 className="font-display text-xl font-semibold">
                  {group.part.title}
                </h3>
                {group.part.summary && (
                  <p className="mt-2 leading-relaxed text-smoke">
                    {group.part.summary}
                  </p>
                )}
              </div>
            )}

            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.needs
                .filter((need) => !need.closed && need.ledger.openCents > 0)
                .map((need) => (
                  <li
                    key={need.id}
                    className="flex flex-col rounded-2xl border-2 border-dashed border-clay/35 bg-clay/5 px-6 py-7"
                  >
                    <Icon
                      name={(need.icon || areaOf(need.area).icon) as IconName}
                      className="h-8 w-8 text-clay"
                    />
                    <p className="font-display mt-4 text-lg leading-snug font-semibold">
                      {need.title}
                    </p>
                    {need.summary && (
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-smoke">
                        {need.summary}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}

        {later.length > 0 && (
          <div className="mt-14 rounded-2xl border border-dashed border-smoke/25 bg-sand/60 p-8">
            <p className="eyebrow text-smoke">Comes later</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-smoke">
              Costed, and waiting its turn. These open for giving as the work in
              front of them is paid for.
            </p>

            {later.map((group) => (
              <div key={group.part?.id ?? "loose"} className="mt-6">
                <h4 className="font-display text-lg font-semibold text-smoke">
                  {group.part?.title}
                </h4>
                <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  {group.needs.map((need) => (
                    <li key={need.id} className="text-sm text-smoke">
                      {need.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-plum px-8 py-7 shadow-warm">
          <p className="eyebrow text-white/70">Still needed for all of it</p>
          <p className="font-display tabular text-4xl font-semibold text-marigold">
            <Money cents={project.stillAskingCents} />
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ButtonLink href={`/give?for=${area}#pledge`} icon="give">
            Give to this
          </ButtonLink>
          <Link
            href="/needs"
            className="text-sm font-bold text-plum underline underline-offset-4"
          >
            See every line, and what is left on each
          </Link>
        </div>
      </div>
    </section>
  );
}
