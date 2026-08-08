import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getContent } from "@/cms/content";
import { describeEdit, listEdits } from "@/cms/history";
import { documentGroups, documentKeys, documents, isDocumentKey } from "@/cms/schema";
import { currentUser } from "@/lib/auth";
import { PageHeader } from "../../ui";
import { ContentForm } from "./content-form";

/**
 * The set of editable documents is fixed and known at build time. Declaring it
 * lets the route's path be part of the static shell — without this, `[key]` is
 * runtime data, and the admin sidebar's usePathname() has nothing to resolve
 * against during prerender.
 */
export function generateStaticParams() {
  return documentKeys().map((key) => ({ key }));
}

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isDocumentKey(key)) notFound();

  const user = await currentUser();
  if (!user) redirect("/app");

  const document = documents[key];
  const [values, edits] = await Promise.all([getContent(key), listEdits()]);
  const group = documentGroups.find((entry) => entry.id === document.group);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={document.title}
        intro={document.description}
        actions={
          document.path && (
            <Link
              href={document.path}
              className="rounded border border-black/12 px-3 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-charcoal"
            >
              View page
            </Link>
          )
        }
      />

      <dl className="-mt-2 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="text-smoke">Filed under</dt>
          <dd className="font-medium">{group?.label ?? "Pages"}</dd>
        </div>
        {document.path && (
          <div className="flex gap-2">
            <dt className="text-smoke">Address</dt>
            <dd className="font-mono text-xs leading-5">{document.path}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="text-smoke">Last edited</dt>
          <dd className="font-medium">{describeEdit(edits.get(key))}</dd>
        </div>
      </dl>

      <ContentForm
        documentKey={key}
        path={document.path}
        fields={document.fields}
        values={values}
      />
    </div>
  );
}
