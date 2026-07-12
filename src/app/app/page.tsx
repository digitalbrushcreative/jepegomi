import type { Metadata } from "next";
import { beforeAfter } from "@/content/kitchen";
import { isConfigured, isSignedIn } from "@/lib/auth";
import { getBeforeAfterSources, getGalleryPhotos } from "@/lib/photos";
import { signOutAction } from "./actions";
import { Editor, type Slot } from "./editor";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Photo Tool",
  description: "Update the Kitchen Build photo journal.",
  robots: { index: false, follow: false },
};

/** The folder is read on every request, so a photo shows up the moment it lands. */
export const dynamic = "force-dynamic";

function Shell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-md">
        <p className="label-mono text-plum">Family only</p>
        <h1 className="font-display mt-3 text-3xl font-bold">{title}</h1>
        <p className="mt-3 leading-relaxed text-smoke">{intro}</p>
        {children}
      </div>
    </section>
  );
}

export default async function AppPage() {
  if (!isConfigured()) {
    return (
      <Shell title="Photo Tool" intro="This tool is not set up yet.">
        <div className="mt-8 rounded border border-dashed border-smoke/40 bg-sand p-6">
          <p className="label-mono text-plum">Needs configuration</p>
          <p className="mt-3 text-sm leading-relaxed text-smoke">
            Set <code className="font-mono">APP_PASSPHRASE</code> and{" "}
            <code className="font-mono">APP_SESSION_SECRET</code> in{" "}
            <code className="font-mono">.env.local</code> to enable the
            passphrase gate. See <code className="font-mono">SETUP.md</code>.
          </p>
        </div>
      </Shell>
    );
  }

  if (!(await isSignedIn())) {
    return (
      <Shell
        title="Photo Tool"
        intro="Enter the shared passphrase to update the Kitchen Build photos."
      >
        <LoginForm />
      </Shell>
    );
  }

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
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-mono text-plum">Family only</p>
            <h1 className="font-display mt-3 text-3xl font-bold">
              Kitchen Build photos
            </h1>
            <p className="mt-3 max-w-xl leading-relaxed text-smoke">
              Drop a photo onto a slot to fill it. Slot 7 here is photo 7 on the
              Kitchen Build page. Photos save into{" "}
              <code className="font-mono text-xs">public/photos/kitchen/</code>,
              so you can also just copy files into that folder by hand.
            </p>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="cursor-pointer rounded border border-black/15 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-sand"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-10">
          <Editor gallery={gallery} beforeAfter={beforeAfterSlots} />
        </div>
      </div>
    </section>
  );
}
