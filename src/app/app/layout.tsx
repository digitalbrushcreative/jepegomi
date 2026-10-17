import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JepegomiLogo } from "@/components/logos";
import { documents, groupedDocuments } from "@/cms/schema";
import { currentUser } from "@/lib/auth";
import { waitingCounts } from "@/lib/queue";
import { signOutAction } from "./actions";
import { AdminChrome, type NavSection } from "./nav";

export const metadata: Metadata = {
  title: "Manage",
  robots: { index: false, follow: false },
};

/**
 * The sidebar, assembled on the server.
 *
 * The Pages branch is built from the CMS schema rather than typed out here, so
 * a document added in src/cms/schema.ts appears in the rail in its own drawer
 * without this file being touched — the same rule the editor form already
 * follows. Everything else in the tool is a fixed screen, so it is a list.
 */
function buildSections(counts: {
  claims: number;
  enquiries: number;
  partners: number;
}): NavSection[] {
  const pageChildren = groupedDocuments().flatMap((group) =>
    group.keys.map((key) => ({
      href: `/app/pages/${key}`,
      label: documents[key].title,
      caption: group.label,
    })),
  );

  return [
    {
      label: null,
      items: [{ href: "/app", label: "Dashboard", icon: "dashboard" }],
    },
    {
      label: "Content",
      items: [
        {
          href: "/app/pages",
          label: "Pages",
          icon: "pages",
          children: pageChildren,
        },
        { href: "/app/photos", label: "Photos", icon: "photos" },
        /*
          Under Content rather than Giving, because what it is is a thing you
          write. It goes to the givers, but so does most of the site.
        */
        { href: "/app/email", label: "Email", icon: "email" },
      ],
    },
    {
      label: "Giving",
      items: [
        {
          href: "/app/needs",
          label: "Needs",
          icon: "needs",
          badge: counts.claims,
        },
        /*
          Directly under Needs, because the two are the same ledger read from
          opposite ends — what is being asked for, and what it came to. Anywhere
          else in the rail and somebody looking for "where did the kitchen money
          go" would look under Payments, which is card and M-Pesa traffic.
        */
        {
          href: "/app/spending",
          label: "Where the money went",
          icon: "spending",
        },
        { href: "/app/payments", label: "Payments", icon: "payments" },
        {
          href: "/app/partners",
          label: "Partners",
          icon: "partners",
          badge: counts.partners,
        },
        {
          href: "/app/enquiries",
          label: "Enquiries",
          icon: "enquiries",
          badge: counts.enquiries,
        },
      ],
    },
    {
      label: "Settings",
      items: [
        { href: "/app/pages/site", label: "Site details", icon: "settings" },
        { href: "/app/people", label: "People", icon: "people" },
      ],
    },
  ];
}

/** Signing in, setting up, or explaining what is missing — no rail for any of it. */
function SignedOutFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="border-b border-black/8 px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-3">
          <JepegomiLogo variant="color" title="Jepegomi" className="h-9 w-auto" />
          <span className="text-[11px] font-semibold tracking-[0.16em] text-plum uppercase">
            Manage
          </span>
        </Link>
      </div>
      <main id="main" className="flex flex-1 items-center justify-center px-6 py-16">
        {children}
      </main>
    </div>
  );
}

/*
  Anything that reads cookies has to sit inside a <Suspense> boundary now that
  Cache Components is on: the static shell is prerendered without a request, so
  the parts that need one stream in afterwards. The whole of the chrome depends
  on who is signed in, so the whole of it is what streams.
*/
async function Shell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) return <SignedOutFrame>{children}</SignedOutFrame>;

  const counts = await waitingCounts();

  return (
    <AdminChrome
      sections={buildSections(counts)}
      user={{ name: user.name, email: user.email }}
      signOut={signOutAction}
    >
      {/*
        A second boundary, so the rail paints as soon as the session is known
        and a slow screen behind it — the ledger, say — streams in on its own.
      */}
      <Suspense fallback={<p className="text-smoke">Loading…</p>}>
        {children}
      </Suspense>
    </AdminChrome>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream px-6 py-16">
          <p className="text-smoke">Loading…</p>
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
