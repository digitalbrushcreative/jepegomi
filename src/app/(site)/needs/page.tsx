import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/cms/content";
import { paragraphs } from "@/cms/prose";
import { Icon } from "@/components/icons";
import { NeedBar, NeedMeter } from "@/components/need-meter";
import { ClothEdge } from "@/components/pattern";
import { ButtonLink, PageHero, SectionTitle } from "@/components/ui";
import { usd } from "@/lib/money";
import type { NeedWithLedger } from "@/lib/giving";
import { getParts, getPublishedNeeds } from "@/lib/needs";
import {
  type PartGroup,
  type ProjectGroup,
  buildProjects,
  laterParts,
  readyParts,
} from "@/lib/projects";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent("needs");
  return {
    title: content.heading,
    description: paragraphs(content.intro)[0],
  };
}

/**
 * A need, as a card in the list.
 *
 * The card leads with the meter rather than with the words, which is the wrong
 * way round for almost any other card on this site and the right way round
 * here: somebody scanning this page is looking for the thing they can finish,
 * and the number that answers that is "still open".
 */
function NeedCard({ need }: { need: NeedWithLedger }) {
  const settled = need.closed || need.ledger.openCents === 0;

  return (
    <Link
      href={`/needs/${need.slug}`}
      className={`group flex flex-col rounded-2xl bg-white p-8 shadow-warm transition-all hover:-translate-y-1 hover:shadow-warm-lg ${
        settled ? "opacity-75 hover:opacity-100" : ""
      }`}
    >
      {/*
        No area badge on the card any more: it sits under a heading naming the
        project and the part of it this cost belongs to, and repeating "the
        kitchen build" nine times down a page of kitchen items is noise where a
        reader wants the price.
      */}
      <div className="flex items-start justify-between gap-4">
        <span className="eyebrow rounded-full bg-sand px-3 py-1.5 text-smoke">
          {need.closed
            ? "Finished"
            : settled
              ? "Fully claimed"
              : `${usd(need.ledger.openCents)} open`}
        </span>
      </div>

      <h3 className="font-display mt-5 text-2xl leading-snug font-semibold text-balance">
        {need.title}
      </h3>
      {need.summary && (
        <p className="mt-3 flex-1 leading-relaxed text-smoke">{need.summary}</p>
      )}

      <NeedMeter ledger={need.ledger} closed={need.closed} className="mt-7" />

      <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-plum">
        {settled ? "See what it paid for" : "Choose an amount"}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * One step of a project, with its costs itemised underneath it.
 *
 * The heading carries the figure and the bar, because a part is the unit a
 * church actually thinks in — "we did the roof" — and the items underneath are
 * how two or three of them can do it between them without ever having to
 * discuss it.
 */
function PartSection({ group }: { group: PartGroup }) {
  return (
    <div className="mt-12 first:mt-8">
      {group.part && (
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h4 className="font-display text-xl font-semibold">
              {group.part.title}
            </h4>
            <p className="tabular text-sm font-bold text-green">
              {group.settled
                ? "Fully claimed"
                : `${usd(group.stillAskingCents)} still open`}
            </p>
          </div>
          {group.part.summary && (
            <p className="mt-2 leading-relaxed text-smoke">
              {group.part.summary}
            </p>
          )}
          <NeedBar ledger={group.ledger} className="mt-4" />
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {group.needs.map((need) => (
          <NeedCard key={need.id} need={need} />
        ))}
      </div>
    </div>
  );
}

/**
 * The steps that are not being asked for yet, and why.
 *
 * Listed rather than hidden. The ledger's whole promise is that you can see all
 * of it, and a budget with three lines missing is not a budget — a church
 * deciding whether to take on the blockwork deserves to know what the finished
 * building costs. What these rows do not have is a way to give to them: no
 * link, no meter, no "choose an amount". They are the plan, not the ask.
 */
function LaterSection({ groups }: { groups: PartGroup[] }) {
  return (
    <div className="mt-14 rounded-2xl border border-dashed border-smoke/25 bg-sand/60 p-8">
      <p className="eyebrow text-smoke">Comes later</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-smoke">
        These are costed and waiting their turn. They open for giving as the
        work in front of them is paid for — asking for the paint while the walls
        are still an open line would take money that could not be spent for
        months.
      </p>

      <div className="mt-8 space-y-8">
        {groups.map((group) => (
          <div key={group.part?.id ?? "loose"}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h4 className="font-display text-lg font-semibold text-smoke">
                {group.part?.title}
              </h4>
              <p className="tabular text-sm font-medium text-smoke">
                {usd(group.stillAskingCents)}
              </p>
            </div>
            {group.waitsOn && (
              <p className="mt-1 text-sm text-smoke">
                after {group.waitsOn.title} is covered
              </p>
            )}

            <ul className="mt-4 divide-y divide-sand-deep border-t border-sand-deep">
              {group.needs.map((need) => (
                <li
                  key={need.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
                >
                  <span className="text-sm">{need.title}</span>
                  <span className="tabular text-sm text-smoke">
                    {usd(need.costCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A project and everything under it, in the order the work happens. */
function ProjectSection({ project }: { project: ProjectGroup }) {
  const ready = readyParts(project);
  const later = laterParts(project);

  if (ready.length === 0 && later.length === 0) return null;

  return (
    <section className="mt-20 border-t border-sand-deep pt-14 first:mt-12 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
        <div className="flex items-center gap-4">
          <Icon name={project.area.icon} className="h-10 w-10 shrink-0 text-plum" />
          <div>
            <SectionTitle>{project.area.label}</SectionTitle>
            <Link
              href={project.area.href}
              className="mt-1 inline-block text-sm font-medium text-plum underline underline-offset-4"
            >
              About this work
            </Link>
          </div>
        </div>

        {project.stillAskingCents > 0 && (
          <div className="text-right">
            {/*
              The whole project, not only the part being asked for today —
              which is why it is not called "still open". A church weighing up
              the blockwork is entitled to know what finishing the building
              costs, and the hero figure above already says what can be taken
              right now.
            */}
            <p className="eyebrow text-smoke">Left on this project</p>
            <p className="font-display tabular mt-1 text-3xl font-semibold text-plum">
              {usd(project.stillAskingCents)}
            </p>
          </div>
        )}
      </div>

      {ready.map((group) => (
        <PartSection key={group.part?.id ?? "loose"} group={group} />
      ))}

      {later.length > 0 && <LaterSection groups={later} />}
    </section>
  );
}

export default async function NeedsPage() {
  const [content, site, needs, parts] = await Promise.all([
    getContent("needs"),
    getContent("site"),
    getPublishedNeeds(),
    getParts(),
  ]);

  /*
    The list, gathered into projects and put in the order the work has to
    happen. A project with only empty parts under it is dropped here rather than
    inside `buildProjects` — /app needs to see a part that has been created and
    not yet itemised, and this page would render it as a heading over nothing.
  */
  const projects = buildProjects(needs, parts).filter((project) =>
    project.parts.some((group) => group.needs.length > 0),
  );

  const covered = needs.filter((need) => need.closed || need.ledger.openCents === 0);

  /*
    The hero counts what can be acted on today, not every open line in every
    budget — a total that includes work nobody can pay for yet reads as an
    invoice rather than an ask. What comes later is under its own heading
    further down, with its own figures.
  */
  const stillNeeded = projects.reduce(
    (sum, project) =>
      sum +
      readyParts(project).reduce(
        (partSum, group) => partSum + group.stillAskingCents,
        0,
      ),
    0,
  );
  const readyCount = projects.reduce(
    (count, project) =>
      count +
      readyParts(project).reduce(
        (partCount, group) =>
          partCount +
          group.needs.filter((need) => !need.closed && need.ledger.openCents > 0)
            .length,
        0,
      ),
    0,
  );

  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.heading}
        intro={paragraphs(content.intro)[0]}
      >
        {/*
          The total is in the hero because it is the one figure that decides
          whether somebody reads any further — and because a list of nine items
          with no sum at the top makes a reader do the arithmetic themselves.
        */}
        {readyCount > 0 && (
          <dl className="mt-12 flex flex-wrap gap-x-14 gap-y-6">
            <div>
              <dt className="eyebrow text-white/50">Open right now</dt>
              <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-marigold">
                {usd(stillNeeded)}
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-white/50">
                {readyCount === 1 ? "Item" : "Items"} waiting
              </dt>
              <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-white">
                {readyCount}
              </dd>
            </div>
            {covered.length > 0 && (
              <div>
                <dt className="eyebrow text-white/50">Fully covered</dt>
                <dd className="font-display tabular mt-1.5 text-4xl font-semibold text-white">
                  {covered.length}
                </dd>
              </div>
            )}
          </dl>
        )}
      </PageHero>

      <section className="px-6 py-20 sm:py-24">
        <div className="shell">
          {paragraphs(content.intro)
            .slice(1)
            .map((text) => (
              <p key={text} className="max-w-2xl leading-relaxed text-smoke">
                {text}
              </p>
            ))}

          {needs.length === 0 ? (
            /*
              Not an error state. The database being empty and the database
              being unreachable look the same from here, and in both cases the
              honest thing to show a would-be giver is the same sentence.
            */
            <div className="mt-10 max-w-2xl rounded-2xl border border-dashed border-smoke/30 bg-sand p-8">
              {paragraphs(content.emptyNote).map((text) => (
                <p key={text} className="leading-relaxed text-smoke">
                  {text}
                </p>
              ))}
              <ButtonLink href="/give" variant="secondary" className="mt-7">
                About giving
              </ButtonLink>
            </div>
          ) : (
            <>
              {covered.length > 0 && (
                <p className="mt-6 max-w-2xl leading-relaxed text-smoke">
                  Items already paid for stay on the list, greyed, under the part
                  of the work they belong to — the point of showing you the
                  ledger is showing you all of it.
                </p>
              )}

              {projects.map((project) => (
                <ProjectSection key={project.area.id} project={project} />
              ))}
            </>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-plum-deep px-6 py-20 sm:py-24">
        <div className="grain-layer" />
        <ClothEdge className="text-plum-deep" />

        <div className="shell relative">
          <p className="eyebrow text-marigold">{content.howEyebrow}</p>
          <SectionTitle className="mt-3 text-white">
            {content.howHeading}
          </SectionTitle>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
            {content.steps.map((step, index) => (
              <li key={step.title} className="bg-plum-deep p-8">
                <span className="font-display tabular text-3xl font-semibold text-marigold">
                  {index + 1}
                </span>
                <h3 className="font-display mt-4 text-xl font-semibold text-white">
                  {step.title}
                </h3>
                {paragraphs(step.body).map((text) => (
                  <p key={text} className="mt-3 text-sm leading-relaxed text-white/60">
                    {text}
                  </p>
                ))}
              </li>
            ))}
          </ol>

          <div className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-6 border-t border-white/15 pt-10">
            <div className="max-w-xl">
              <p className="eyebrow text-marigold">For partner churches</p>
              {paragraphs(content.partnerNote).map((text) => (
                <p key={text} className="mt-3 leading-relaxed text-white/65">
                  {text}
                </p>
              ))}
            </div>
            <ButtonLink href="/partners" variant="ghost" className="text-white">
              Partner sign in
            </ButtonLink>
          </div>

          <p className="mt-10 text-sm text-white/45">
            Questions about any of this?{" "}
            <a
              href={`mailto:${site.email}`}
              className="underline underline-offset-4 hover:text-white"
            >
              {site.email}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
