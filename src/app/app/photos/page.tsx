import { redirect } from "next/navigation";
import { beforeAfter } from "@/content/kitchen";
import { currentUser } from "@/lib/auth";
import { getBeforeAfterSources, getGalleryPhotos } from "@/lib/photos";
import { PageHeader } from "../ui";
import { Editor, type Slot } from "./editor";

/*
  The photo folder is read on every request, so a photo shows up the moment it
  lands. This used to say `export const dynamic = "force-dynamic"`, which Next 16
  removes once Cache Components is on. It isn't needed: this page reads the
  session cookie, which makes it request-time anyway, and the <Suspense> boundary
  in the /app layout is what keeps it out of the static shell.
*/
export default async function PhotosPage() {
  const user = await currentUser();
  if (!user) redirect("/app");

  const [gallery, sources] = await Promise.all([
    getGalleryPhotos(),
    getBeforeAfterSources(),
  ]);

  const beforeAfterSlots: Slot[] = [
    {
      key: "before",
      label: "B",
      caption: beforeAfter.before.heading,
      category: null,
      src: sources.before,
    },
    {
      key: "after",
      label: "A",
      caption: beforeAfter.after.heading,
      category: null,
      src: sources.after,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Photos"
        intro={
          <>
            The Kitchen Build gallery. Drop a photo onto a slot to fill it —
            slot 7 here is photo 7 on the Kitchen Build page. Photos save into{" "}
            <code className="font-mono text-xs">public/photos/kitchen/</code>,
            so you can also just copy files into that folder by hand.
          </>
        }
      />

      <div>
        <Editor gallery={gallery} beforeAfter={beforeAfterSlots} />
      </div>
    </div>
  );
}
