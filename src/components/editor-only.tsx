import { Suspense, type ReactNode } from "react";
import { isEditor } from "@/lib/auth";

/**
 * A part of a public page that only Simon & Joyce see.
 *
 * The site keeps notes to itself on the pages they belong to — a service time
 * nobody has confirmed, a job nobody has priced, a link that is still guesswork.
 * Written where the gap is, they are a to-do list an editor cannot lose track
 * of, because it is standing in the hole it describes. Read by a stranger, the
 * same note is a ministry telling the open web which of its own facts it does
 * not know, in a dashed box that looks like scaffolding left on a finished
 * building.
 *
 * So the note stays where it was written and the audience narrows. A visitor
 * gets the page with the gap simply absent — which is the honest rendering
 * anyway: nothing is claimed about a Sunday morning that has not been fixed.
 *
 * ## Why it is a boundary and not an `await`
 *
 * Reading a cookie is request-time work, and this site is built on Cache
 * Components: a prerendered shell goes out at once and the parts that need a
 * request stream into it (see `cacheComponents` in next.config.ts). Awaited up
 * in the page body, one editorial note would hold the entire page out of the
 * static shell for every visitor on earth — the whole page made slower to
 * decide something almost every reader will be told "no" about.
 *
 * Inside a boundary with a null fallback, the shell is unchanged and unaffected:
 * the hole streams in empty for a visitor and filled for an editor.
 *
 * Keep the emptiness test outside this component —
 * `{unconfirmed.length > 0 && <EditorOnly>…</EditorOnly>}` — so a page with
 * nothing left to confirm has no boundary at all rather than a dynamic hole
 * that resolves to nothing.
 */
export function EditorOnly({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <WhenSignedIn>{children}</WhenSignedIn>
    </Suspense>
  );
}

async function WhenSignedIn({ children }: { children: ReactNode }) {
  return (await isEditor()) ? <>{children}</> : null;
}
