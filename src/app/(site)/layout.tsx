import { Suspense } from "react";
import { LiveSiteHeader, SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * The public site: everything a visitor sees.
 *
 * This is a route group, so the folder name adds nothing to any URL — it exists
 * only to say which routes wear the header and footer. `/app` sits outside it
 * and wears its own.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-charcoal"
      >
        Skip to content
      </a>
      {/*
        The bar is drawn either way; only the lit nav link waits on the URL.
        The fallback is the same header with no path, so a route with a
        dynamic segment gets its header in the static shell like every other
        page instead of holding the page back to underline something.
      */}
      <Suspense fallback={<SiteHeader pathname="" />}>
        <LiveSiteHeader />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
