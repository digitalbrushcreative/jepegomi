import Link from "next/link";
import { describeEdit, recentEdits } from "@/cms/history";
import { documents } from "@/cms/schema";
import { currentUser, hasAnyUser, isConfigured } from "@/lib/auth";
import { formatDay } from "@/lib/dates";
import { isDatabaseConfigured } from "@/lib/db";
import { PLEDGE_LABELS, pledgeTowards } from "@/lib/giving";
import { usd } from "@/lib/money";
import { listEnrolmentEnquiries } from "@/lib/enquiries";
import { listNeeds, listOpenPledges } from "@/lib/needs";
import { waitingCounts } from "@/lib/queue";
import { FirstUserForm, LoginForm } from "./login-form";
import { Empty, PageHeader, Panel, Stat } from "./ui";

function Shell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <h1 className="font-display mt-3 text-3xl font-bold">{title}</h1>
      <p className="mt-3 leading-relaxed text-smoke">{intro}</p>
      {children}
    </div>
  );
}

function Missing({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded border border-dashed border-smoke/40 bg-sand p-6">
      <p className="eyebrow text-plum">Needs configuration</p>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-smoke">
        {children}
      </div>
    </div>
  );
}

/**
 * The first screen after signing in.
 *
 * It answers one question — is there anything for me to do? — before it offers
 * anything else. The counts across the top are counts of work, not of records,
 * and each one is the way to the screen that clears it. Underneath sit the two
 * queues that actually go stale if they are left: a church that claimed
 * something and heard nothing back, and a parent who asked about a place.
 *
 * Editing the site is further down on purpose. It is the thing people come here
 * to do most often and the only thing that can wait.
 */
export default async function AppPage() {
  if (!isConfigured()) {
    return (
      <Shell title="Manage" intro="This is not set up yet.">
        <Missing>
          <p>
            Set <code className="font-mono">APP_SESSION_SECRET</code> and{" "}
            <code className="font-mono">DATABASE_URL</code> in{" "}
            <code className="font-mono">.env.local</code>.
          </p>
          <p>
            {isDatabaseConfigured()
              ? "The database is set. The session secret is missing."
              : "The database connection string is missing."}{" "}
            See <code className="font-mono">SETUP.md</code>.
          </p>
        </Missing>
      </Shell>
    );
  }

  let anyUser: boolean;
  try {
    anyUser = await hasAnyUser();
  } catch (error) {
    console.error("CMS: could not reach the database.", error);
    return (
      <Shell title="Manage" intro="The database is not answering.">
        <Missing>
          <p>
            <code className="font-mono">DATABASE_URL</code> is set, but the
            connection failed. Check the value, and that the database is awake.
          </p>
          <p>The public site is unaffected — it is still serving its content.</p>
        </Missing>
      </Shell>
    );
  }

  if (!anyUser) {
    return (
      <Shell
        title="Create your account"
        intro="Nobody has an account yet. This first one is yours — you can add Simon & Joyce afterwards."
      >
        <FirstUserForm />
      </Shell>
    );
  }

  const user = await currentUser();
  if (!user) {
    return (
      <Shell title="Manage" intro="Sign in to edit the site.">
        <LoginForm />
      </Shell>
    );
  }

  const [counts, needs, open, enquiries, edits] = await Promise.all([
    waitingCounts(),
    listNeeds(),
    listOpenPledges(),
    listEnrolmentEnquiries(),
    recentEdits(),
  ]);

  const totalOpen = needs
    .filter((need) => !need.closed)
    .reduce((sum, need) => sum + need.ledger.openCents, 0);
  const totalReceived = needs.reduce(
    (sum, need) => sum + need.ledger.receivedCents,
    0,
  );

  const newEnquiries = enquiries.filter((enquiry) => enquiry.status === "new");
  const nothingWaiting =
    open.length === 0 && newEnquiries.length === 0 && counts.partners === 0;

  return (
    <div>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        intro={
          nothingWaiting
            ? "Nothing is waiting on you. The site is running itself."
            : "Here is what is waiting on you."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Claims to confirm"
          value={counts.claims}
          note="Gifts nobody has marked received"
          href="/app/needs"
          tone={counts.claims > 0 ? "waiting" : "plain"}
        />
        <Stat
          label="New enquiries"
          value={counts.enquiries}
          note="Parents awaiting a reply"
          href="/app/enquiries"
          tone={counts.enquiries > 0 ? "waiting" : "plain"}
        />
        <Stat
          label="Partners to verify"
          value={counts.partners}
          note="Givers not vouched for yet"
          href="/app/partners"
          tone={counts.partners > 0 ? "waiting" : "plain"}
        />
        <Stat
          label="Received in total"
          value={usd(totalReceived)}
          note={`${usd(totalOpen)} still open`}
          href="/app/needs"
          tone="good"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Claims waiting"
          hint="A church that gave and heard nothing back is the one thing here that gets worse by being left."
          actions={
            <Link
              href="/app/needs"
              className="text-xs font-medium text-plum underline underline-offset-4"
            >
              All needs
            </Link>
          }
        >
          {open.length === 0 ? (
            <Empty>Every claim has been dealt with.</Empty>
          ) : (
            <ul className="divide-y divide-black/6">
              {open.slice(0, 6).map((pledge) => (
                <li
                  key={pledge.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {pledge.partnerName ?? "Someone"}
                    </p>
                    <p className="truncate text-xs text-smoke">
                      {pledgeTowards(pledge)} · {PLEDGE_LABELS[pledge.status]}
                    </p>
                  </div>
                  <span className="font-display shrink-0 text-sm font-semibold tabular-nums text-plum">
                    {usd(pledge.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Enrolment enquiries"
          hint="Parents who have asked about a place at the Academy."
          actions={
            <Link
              href="/app/enquiries"
              className="text-xs font-medium text-plum underline underline-offset-4"
            >
              The inbox
            </Link>
          }
        >
          {newEnquiries.length === 0 ? (
            <Empty>Nobody is waiting on an answer.</Empty>
          ) : (
            <ul className="divide-y divide-black/6">
              {newEnquiries.slice(0, 6).map((enquiry) => (
                <li
                  key={enquiry.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {enquiry.parentName}
                    </p>
                    <p className="truncate text-xs text-smoke">
                      {enquiry.childName
                        ? `About ${enquiry.childName}`
                        : enquiry.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-smoke">
                    {formatDay(enquiry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Recently edited"
          hint="The last few changes to the site."
          actions={
            <Link
              href="/app/pages"
              className="text-xs font-medium text-plum underline underline-offset-4"
            >
              All pages
            </Link>
          }
        >
          {edits.length === 0 ? (
            <Empty>
              Nothing has been edited yet — every page is showing the wording it
              shipped with. <Link href="/app/pages" className="text-plum underline underline-offset-4">Start with a page</Link>.
            </Empty>
          ) : (
            <ul className="divide-y divide-black/6">
              {edits.map((edit) => (
                <li key={edit.key}>
                  <Link
                    href={`/app/pages/${edit.key}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-sand/50"
                  >
                    <span className="text-sm font-medium">
                      {documents[edit.key]?.title ?? edit.key}
                    </span>
                    <span className="text-xs text-smoke">
                      {describeEdit(edit)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
