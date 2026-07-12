import { notFound, redirect } from "next/navigation";
import { getContent } from "@/cms/content";
import { documentKeys, documents, isDocumentKey } from "@/cms/schema";
import { currentUser } from "@/lib/auth";
import { ContentForm } from "./content-form";

/**
 * The set of editable documents is fixed and known at build time. Declaring it
 * lets the route's path be part of the static shell — without this, `[key]` is
 * runtime data, and the site header's usePathname() has nothing to resolve
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
  const values = await getContent(key);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold">{document.title}</h1>
      <p className="mt-3 leading-relaxed text-smoke">{document.description}</p>

      <ContentForm
        documentKey={key}
        path={document.path}
        fields={document.fields}
        values={values}
      />
    </div>
  );
}
