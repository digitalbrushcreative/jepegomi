"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { JepegomiLogo } from "@/components/logos";
import { type NavLink, navLinks } from "@/lib/site";

/**
 * A plain white bar, the same on every page and at every scroll position.
 *
 * It used to be transparent over a dark hero and turn plum once you scrolled,
 * which made every page's first screen a colour block and obliged every hero
 * to stay dark for the white links to be readable. It is solid now, with the
 * full-colour mark and dark links, so a hero is free to be light, a photograph,
 * or anything else.
 *
 * The links go wide at `lg`, not `md`. Naming all four arms of the ministry grew
 * the nav, and grouping the school and the college under Education pulled it back
 * to seven — but seven plus the logo and the Give button still will not sit in
 * 768px. Below that it is the mobile menu, which does not care how many there are.
 *
 * The signed-in mark arrives as a prop for a different reason: this is a client
 * component, and who is signed in is a cookie only the server can read. It comes
 * in as an already-rendered element (see components/viewer-badge.tsx), wrapped
 * by the layout in its own Suspense boundary, so the bar stays in the static
 * shell and only the badge waits on a request. `null` on a signed-out visit,
 * which is nearly all of them, and the layout's fallback while it resolves — so
 * the header never reflows under somebody scrolling.
 *
 * The path arrives as a prop rather than out of usePathname(), so that the bar
 * can be drawn without one. On a route whose address is not known until a
 * request arrives — /needs/[slug], /app/needs/[id] — the pathname is runtime
 * data, and a header that insisted on it would keep the entire page out of the
 * static shell to decide which nav link to underline. See SiteHeaderBar below.
 */
export function SiteHeader({
  pathname,
  badge = null,
}: {
  pathname: string;
  /** The signed-in mark, or nothing. Rendered on the server; see above. */
  badge?: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  /*
    A link is lit when you are on it — or on anything hanging off it. The second
    half matters because a child need not live beneath its parent's path: the
    Academy is filed under Education in the nav but answers at /academy, and
    without this it would leave the whole menu dark while you stood on it.
  */
  const isActive = (link: NavLink) => {
    if (link.href === "/") return pathname === "/";
    if (pathname.startsWith(link.href)) return true;
    return link.children?.some((child) => pathname.startsWith(child.href)) ?? false;
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-charcoal/10 bg-white/95 px-6 backdrop-blur-sm"
    >
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <JepegomiLogo
            variant="color"
            title="Jepegomi — Jesus People Gospel Ministries"
            className="h-9 w-auto"
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) =>
            link.children ? (
              // Hover opens it for mice; focus-within keeps it reachable by keyboard.
              <div key={link.href} className="group relative">
                <Link
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded px-3 py-2 text-sm transition-colors ${
                    isActive(link)
                      ? "text-charcoal"
                      : "text-smoke hover:text-charcoal"
                  }`}
                >
                  {link.label}
                  <svg
                    width="8"
                    height="5"
                    viewBox="0 0 8 5"
                    aria-hidden="true"
                    className="opacity-50"
                  >
                    <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.3" fill="none" />
                  </svg>
                </Link>
                {/*
                  `impeccable detect` on a URL reports this as
                  content-hidden-at-rest — "37% of page text stays at opacity 0
                  after reveal handlers ran". It is a false positive and should
                  stay one: this is a hover menu, and the headless pass never
                  hovers, so the submenu copy is counted as text that shipped
                  and never appeared. It opens on focus-within as well as
                  hover, so it is reachable by keyboard, which is the thing that
                  rule actually exists to protect. Do not "fix" it by making the
                  panel visible at rest.
                */}
                <div className="invisible absolute left-0 top-full w-72 pt-2 opacity-0 transition-[opacity,visibility] group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="overflow-hidden rounded-sm border border-charcoal/10 bg-white">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-3 transition-colors hover:bg-sand"
                      >
                        <span className="block text-sm font-medium text-charcoal">
                          {child.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-smoke">
                          {child.blurb}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-2 text-sm transition-colors ${
                  isActive(link) ? "text-charcoal" : "text-smoke hover:text-charcoal"
                }`}
              >
                {link.label}
              </Link>
            ),
          )}
          {/*
            `empty:hidden` because `badge` is an element either way — it is a
            server component that renders nothing for a signed-out visitor, and
            an element is truthy however little it draws. Without this the nav
            would carry a stray 8px of margin for everybody who is not signed in.
          */}
          <div className="ml-2 flex items-center empty:hidden">{badge}</div>
          <Link
            href="/give"
            className="ml-2 rounded-sm bg-forest px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
          >
            Give
          </Link>
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
          {badge}
          <Link
            href="/give"
            className="rounded-sm bg-forest px-4 py-2 text-sm font-semibold text-white"
          >
            Give
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded text-charcoal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              {mobileOpen ? (
                <path
                  d="M4 4l12 12M16 4L4 16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="-mx-6 border-t border-charcoal/10 bg-white px-6 pt-2 pb-6 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {navLinks.map((link) => (
            <div key={link.href} className="border-b border-charcoal/8 last:border-0">
              <Link href={link.href} className="block py-3 text-sm font-medium text-charcoal">
                {link.label}
              </Link>
              {link.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className="block py-2 pl-4 text-sm text-smoke"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}

/**
 * The header as the site actually mounts it.
 *
 * Two components rather than one because of what happens on a route with a
 * dynamic segment. usePathname() there is runtime data: nothing can know the
 * address until somebody asks for it. The layout puts this behind a Suspense
 * boundary whose fallback is the same bar with no path — so pages whose address
 * *is* known keep a fully prerendered header, and pages whose address is not
 * ship the bar immediately and light the right link a moment later, instead of
 * holding the whole page back for it.
 */
export function LiveSiteHeader({ badge }: { badge?: ReactNode }) {
  return <SiteHeader pathname={usePathname()} badge={badge} />;
}
