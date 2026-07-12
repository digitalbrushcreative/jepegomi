import type { Metadata } from "next";
import { isConfigured, isSignedIn } from "@/lib/auth";
import { signOutAction } from "./actions";
import { Editor } from "./editor";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Photo Tool",
  description: "Update the Kitchen Build photo journal.",
  robots: { index: false, follow: false },
};

/** Storage has no driver yet — see SETUP.md. Flips to true once one is wired. */
const STORAGE_READY = false;

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
      <Shell
        title="Photo Tool"
        intro="This tool is not set up yet."
      >
        <div className="mt-8 rounded border border-dashed border-smoke/40 bg-sand p-6">
          <p className="label-mono text-plum">Needs configuration</p>
          <p className="mt-3 text-sm leading-relaxed text-smoke">
            Set <code className="font-mono">APP_PASSPHRASE</code> and{" "}
            <code className="font-mono">APP_SESSION_SECRET</code> in the
            environment to enable the passphrase gate. See{" "}
            <code className="font-mono">SETUP.md</code>.
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
              Drop a photo onto a numbered slot to fill it. The slots and
              categories match the Kitchen Build page exactly, so photo 7 here is
              photo 7 there.
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

        {!STORAGE_READY && (
          <div className="mt-10 rounded border border-dashed border-smoke/40 bg-sand p-6">
            <p className="label-mono text-plum">Not saving yet</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-smoke">
              No photo storage backend is connected, so anything you drop here
              previews locally and is lost on refresh — it will not reach the
              Kitchen Build page. Choosing and wiring a backend is the last
              step; see <code className="font-mono">SETUP.md</code>.
            </p>
          </div>
        )}

        <div className="mt-10">
          <Editor storageReady={STORAGE_READY} />
        </div>
      </div>
    </section>
  );
}
