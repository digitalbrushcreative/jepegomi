import Link from "next/link";
import { redirect } from "next/navigation";
import { describeEdit, listEdits } from "@/cms/history";
import { documents, groupedDocuments } from "@/cms/schema";
import { currentUser } from "@/lib/auth";
import { PageHeader, Panel } from "../ui";

/**
 * Everything on the site that can be edited, in its drawer.
 *
 * Filed rather than listed: twelve documents in one run is a wall of names you
 * have to read through, while five short groups is a thing you can point at.
 * The grouping is the schema's — see `documentGroups` — so this screen and the
 * sidebar can never disagree about where a page lives.
 */
export default async function PagesIndex() {
  const user = await currentUser();
  if (!user) redirect("/app");

  const edits = await listEdits();
  const groups = groupedDocuments();

  return (
    <div>
      <PageHeader
        title="Pages"
        intro="Every word and photo on the site. Saving puts a change live straight away — there is nothing to publish afterwards."
      />

      <div className="space-y-6">
        {groups.map((group) => (
          <Panel key={group.id} title={group.label} hint={group.description}>
            <ul className="divide-y divide-black/6">
              {group.keys.map((key) => {
                const doc = documents[key];
                const edit = edits.get(key);

                return (
                  <li key={key}>
                    <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-sand/50">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/app/pages/${key}`}
                          className="font-medium hover:text-plum"
                        >
                          {doc.title}
                          {/* The whole row is the target, not just the words. */}
                          <span className="absolute inset-0" />
                        </Link>
                        <p className="mt-0.5 truncate text-sm text-smoke">
                          {doc.description}
                        </p>
                      </div>

                      {doc.path && (
                        <span className="hidden font-mono text-xs text-smoke/80 sm:block">
                          {doc.path}
                        </span>
                      )}

                      <span className="w-40 shrink-0 text-right text-xs text-smoke">
                        {describeEdit(edit)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
