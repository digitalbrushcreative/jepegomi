import Link from "next/link";
import { type DocumentKey, documentKeys, documents } from "@/cms/schema";
import { currentUser, hasAnyUser, isConfigured } from "@/lib/auth";
import { isDatabaseConfigured, sql } from "@/lib/db";
import { FirstUserForm, LoginForm } from "./login-form";

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
    <div className="mx-auto max-w-md">
      <p className="label-mono text-plum">Family only</p>
      <h1 className="font-display mt-3 text-3xl font-bold">{title}</h1>
      <p className="mt-3 leading-relaxed text-smoke">{intro}</p>
      {children}
    </div>
  );
}

function Missing({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded border border-dashed border-smoke/40 bg-sand p-6">
      <p className="label-mono text-plum">Needs configuration</p>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-smoke">
        {children}
      </div>
    </div>
  );
}

/** When was each page last touched, and by whom. */
async function lastEdited() {
  const rows = await sql()`
    SELECT c.key, c.updated_at, u.name
    FROM content c
    LEFT JOIN users u ON u.id = c.updated_by
  `;

  const byKey = new Map<string, { at: Date; by: string | null }>();
  for (const row of rows as { key: string; updated_at: string; name: string | null }[]) {
    byKey.set(row.key, { at: new Date(row.updated_at), by: row.name });
  }
  return byKey;
}

function describeEdit(entry: { at: Date; by: string | null } | undefined) {
  if (!entry) return "Never edited — showing the original wording.";

  const when = entry.at.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return entry.by ? `Edited by ${entry.by} on ${when}` : `Edited on ${when}`;
}

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

  const edits = await lastEdited();

  return (
    <div>
      <p className="label-mono text-plum">Family only</p>
      <h1 className="font-display mt-3 text-3xl font-bold">Pages</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-smoke">
        Change any words or photos on the site. Saving puts the change live
        straight away — there is nothing to publish afterwards.
      </p>

      <ul className="mt-10 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8 sm:grid-cols-2">
        {documentKeys().map((key: DocumentKey) => {
          const doc = documents[key];
          return (
            <li key={key} className="bg-white">
              <Link
                href={`/app/edit/${key}`}
                className="group block h-full p-6 transition-colors hover:bg-sand"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">{doc.title}</h2>
                  {doc.path && (
                    <span className="font-mono text-xs text-smoke">
                      {doc.path}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-smoke">
                  {doc.description}
                </p>
                <p className="mt-4 text-xs text-smoke/80">
                  {describeEdit(edits.get(key))}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
