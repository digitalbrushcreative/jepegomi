import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getContent } from "@/cms/content";
import { ensureSchema } from "@/lib/db";
import { NEED_AREAS, type NeedWithLedger } from "@/lib/giving";
import { usd } from "@/lib/money";
import { listNeeds } from "@/lib/needs";
import {
  ACCOUNT_VISIBILITIES,
  visibilityOf,
} from "@/lib/project-accounts";
import { PageHeader, Panel, Stat } from "../ui";
import { EditSpendForm, RecordSpendForm } from "./spend-forms";

/**
 * Where the money went — the other end of the ledger.
 *
 * Every other giving screen in /app is about money coming in: what is needed,
 * who claimed it, what has arrived. This is the one about money going out, and
 * until it existed there was no such screen. The figures were there — the
 * kitchen's six reconciled lines have been rows in `needs` since Simon's letter
 * was transcribed — but the only way to add to them was to create a need, fill
 * in a slug and a summary and an icon, price it, and then tick "the work on this
 * is finished". Nobody would ever guess that, and nobody should have to.
 *
 * So: same rows, same table, different verb. What this screen adds over Needs is
 * not a capability, it is a vocabulary — and a vocabulary is the difference
 * between a feature that exists and one that gets used.
 *
 * What appears here appears on the dashboard of every partner who gave towards
 * that project, gated by the switch under Project accounts. The page says so at
 * the top and again beside each project, because a screen that quietly publishes
 * a ministry's spending to its donors should never be a surprise.
 */
export default async function AdminSpendingPage() {
  const user = await currentUser();
  if (!user) redirect("/app");

  await ensureSchema();

  const [needs, accounts] = await Promise.all([
    listNeeds(),
    getContent("projectAccounts"),
  ]);

  /*
    A closed row is a thing that was bought. That is what closing one has always
    meant — see the note in lib/giving.ts on ProjectBudget — so this needs no
    column of its own and cannot drift out of step with the accounts a partner
    reads. The two lists are built from exactly the same predicate.
  */
  const spent = needs.filter((need) => need.closed);

  /*
    Grouped in the ministry's own running order rather than the database's,
    matching how the projects are listed everywhere else, and narrowed to the
    ones with something recorded. Nine empty panels would bury the two that have
    anything in them.
  */
  const projects = NEED_AREAS.map((area) => ({
    area,
    lines: spent.filter((need) => need.area === area.id),
    visibility: visibilityOf(accounts, area.id),
  })).filter((project) => project.lines.length > 0);

  const totalSpent = spent.reduce((sum, need) => sum + need.costCents, 0);

  /*
    Where a new line lands in the list. Positions are per project in the end —
    the accounts read one area at a time — but one number past the high-water
    mark across all of them is simpler than a lookup per dropdown option and
    lands every new line at the bottom of whichever project it is filed under,
    which is what somebody typing one in expects.
  */
  const nextPosition =
    needs.reduce((highest, need) => Math.max(highest, need.position), 0) + 1;

  return (
    <div>
      <PageHeader
        title="Where the money went"
        intro={
          <>
            What each project actually bought, with what it was expected to cost
            beside what it really did. This is the receipt — the churches and
            people who gave towards a project read its lines when they sign in,
            and nothing here is ever shown on the public site unless you say so
            under{" "}
            <Link
              href="/app/pages/projectAccounts"
              className="font-medium text-plum underline underline-offset-4"
            >
              Project accounts
            </Link>
            .
          </>
        }
      />

      {spent.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Recorded as spent" value={usd(totalSpent)} tone="good" />
          <Stat
            label={spent.length === 1 ? "Line recorded" : "Lines recorded"}
            value={spent.length}
          />
          <Stat
            label={projects.length === 1 ? "Project" : "Projects"}
            value={projects.length}
            note="With spending on the books"
          />
        </div>
      )}

      {/* --------------------------------------------- recording another */}
      <h2 className="font-display mt-12 text-2xl font-bold">
        Record something bought
      </h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-smoke">
        One thing at a time, as it appears on the receipt. It goes straight into
        that project&apos;s accounts — it is not added to the site and nobody is
        asked to pay for it.
      </p>

      <div className="mt-6 max-w-2xl">
        <Panel>
          <RecordSpendForm nextPosition={nextPosition} />
        </Panel>
      </div>

      {/* ------------------------------------------- what is on the books */}
      <h2 className="font-display mt-14 text-2xl font-bold">
        {projects.length === 0 ? "Nothing recorded yet" : "On the books"}
      </h2>

      {projects.length === 0 ? (
        <p className="mt-4 max-w-2xl rounded border border-dashed border-smoke/40 bg-sand p-6 leading-relaxed text-smoke">
          Nothing has been recorded as bought yet. The first line you enter above
          becomes the first line of that project&apos;s accounts, and the
          partners who gave towards it will see it the next time they sign in.
        </p>
      ) : (
        <div className="mt-6 space-y-10">
          {projects.map((project) => (
            <ProjectSpending key={project.area.id} {...project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectSpending({
  area,
  lines,
  visibility,
}: {
  area: (typeof NEED_AREAS)[number];
  lines: NeedWithLedger[];
  visibility: string;
}) {
  const actual = lines.reduce((sum, need) => sum + need.costCents, 0);
  /*
    A line with no separate estimate was expected to cost what it cost, which is
    the same fallback `getProjectBudget` applies. Both totals are worked out the
    same way here so this screen and the partner's cannot print different sums
    for the same rows.
  */
  const estimated = lines.reduce(
    (sum, need) => sum + (need.estimatedCents ?? need.costCents),
    0,
  );

  const setting = ACCOUNT_VISIBILITIES.find(
    (option) => option.value === visibility,
  );

  return (
    <Panel
      title={area.label}
      hint={`${lines.length} ${lines.length === 1 ? "line" : "lines"} · ${usd(actual)} spent`}
      actions={
        <Link
          href="/app/pages/projectAccounts"
          className="rounded border border-black/15 px-3 py-1.5 text-xs font-medium text-smoke transition-colors hover:bg-sand hover:text-plum"
        >
          Read by: {setting?.label ?? "The people who paid for it"}
        </Link>
      }
    >
      <ul className="divide-y divide-black/8">
        {lines.map((need) => (
          <li key={need.id}>
            <details className="group">
              <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4 transition-colors hover:bg-sand/60">
                <div className="min-w-0">
                  <span className="font-medium">{need.title}</span>
                  {need.note && (
                    <span className="mt-0.5 block text-xs text-smoke">
                      {need.note}
                    </span>
                  )}
                </div>

                <div className="tabular flex shrink-0 items-baseline gap-5 text-sm">
                  <span className="text-smoke">
                    {usd(need.estimatedCents ?? need.costCents)} est.
                  </span>
                  {/*
                    Zero is "spent, amount unknown" and has to read that way here
                    too. A screen that prints $0 beside a bag of cement is a
                    screen that gets somebody to "correct" it to a number they
                    made up.
                  */}
                  <span className="w-24 text-right font-semibold text-plum">
                    {need.costCents > 0 ? usd(need.costCents) : "Used"}
                  </span>
                </div>
              </summary>

              <EditSpendForm need={need} />
            </details>
          </li>
        ))}
      </ul>

      <div className="tabular flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-2 border-black/10 bg-sand/40 px-5 py-4 text-sm font-bold">
        <span>Total</span>
        <div className="flex shrink-0 items-baseline gap-5">
          <span className="text-smoke">{usd(estimated)} est.</span>
          <span className="w-24 text-right text-green">{usd(actual)}</span>
        </div>
      </div>
    </Panel>
  );
}
