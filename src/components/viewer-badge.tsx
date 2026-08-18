import Link from "next/link";
import { currentViewer } from "@/lib/door";

/**
 * The mark in the header that says somebody is signed in.
 *
 * ## Why the site needed one at all
 *
 * Because the figures now come and go. Before this, being signed in changed one
 * page — the dashboard, which you had to have navigated to on purpose — so
 * there was never any doubt about which state you were in. Now it changes every
 * price on the site, and a reader who cannot tell which state they are in reads
 * a blurred figure as a bug. Worse, a partner who has quietly been signed out by
 * a thirty-day cookie expiring sees the site they know go smudged, with nothing
 * anywhere saying why.
 *
 * So the header carries the answer, on every page, in the one place a person
 * already looks for it.
 *
 * ## Initials, and where they come from
 *
 * A partner has a name in the ledger — "Encounter Church" — and the two letters
 * off the front of it are recognisable to the person they belong to and to
 * nobody else, which is the whole specification for something that sits in a
 * public header on a shared screen. A supporter has never been asked for a name,
 * so it comes off the front of their address; see lib/door.ts for why the door
 * does not ask.
 *
 * The full name is in the `title` and in the screen-reader label, not printed
 * beside it. The nav is already tight enough that grouping two arms of the
 * ministry under one Education menu was needed to fit — see components/
 * site-header.tsx — and a church's name in the bar would put it straight back
 * over the edge.
 *
 * ## Where it goes
 *
 * A partner to their dashboard, which is the thing they signed in for. A
 * supporter to /partners, which is the only page that has anything to say to
 * them: that they are signed in, that the figures are open, and how to sign out.
 * Not a menu — the header is a client component already juggling a scroll
 * listener and a mobile drawer, and a third piece of open/closed state to hold
 * one link is not worth what it costs to get right on a touch screen.
 */

function initialsOf(name: string) {
  const words = name
    .split(/[\s._-]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export async function ViewerBadge() {
  const viewer = await currentViewer();
  if (!viewer) return null;

  const href = viewer.kind === "partner" ? "/partners/dashboard" : "/partners";

  /*
    A reader added to a church's giving is told whose books they are holding, not
    just that they are signed in. It is the one case where the name on the badge
    is not their own, and somebody who forgets that is somebody about to be
    confused by a dashboard full of a stranger's gifts.
  */
  const whose =
    viewer.kind === "partner" && viewer.onBehalfOf
      ? `${viewer.onBehalfOf} — signed in as ${viewer.email}`
      : viewer.name;

  return (
    <Link
      href={href}
      title={`Signed in — ${whose}`}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 text-xs font-bold tracking-wide text-white transition-colors hover:border-white/60 hover:bg-white/25"
    >
      <span aria-hidden="true">{initialsOf(viewer.name)}</span>
      <span className="sr-only">
        Signed in as {whose}.{" "}
        {viewer.kind === "partner"
          ? "Go to your giving."
          : "Figures are visible."}
      </span>
    </Link>
  );
}
