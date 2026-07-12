import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth";
import { signOutAction } from "./actions";

export const metadata: Metadata = {
  title: "Manage",
  robots: { index: false, follow: false },
};

const tabs = [
  { href: "/app", label: "Pages" },
  { href: "/app/photos", label: "Photos" },
  { href: "/app/people", label: "People" },
];

/*
  Anything that reads cookies has to sit inside a <Suspense> boundary now that
  Cache Components is on: the static shell is prerendered without a request, so
  the parts that need one stream in afterwards. Both the bar and the page body
  read the session, so both are wrapped.
*/
async function AdminBar() {
  const user = await currentUser();
  if (!user) return null;

  return (
    <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b border-black/8 pb-5">
      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded px-4 py-2 text-sm font-medium text-smoke transition-colors hover:bg-sand hover:text-charcoal"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <span className="text-sm text-smoke">{user.name}</span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="cursor-pointer rounded border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-sand"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Suspense fallback={null}>
          <AdminBar />
        </Suspense>
        <Suspense fallback={<p className="text-smoke">Loading…</p>}>
          {children}
        </Suspense>
      </div>
    </section>
  );
}
