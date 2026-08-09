"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { JepegomiLogo } from "@/components/logos";
import { type NavLink, navLinks } from "@/lib/site";

/**
 * The header has no colour of its own.
 *
 * It is transparent and sits *on* the hero, so whatever the hero is wearing is
 * what the header wears — and on the homepage that means it turns over with the
 * slider: plum for the church, green for the Academy, charcoal for the college,
 * brown for Food at School. Every page on this site opens on a dark hero, which
 * is what makes white nav type safe to lay straight over it.
 *
 * "Dark" is now a promise the heroes have to keep rather than a fact about flat
 * colour. Once the homepage slides carried photographs, the outer links and the
 * menu button ended up over open picture — so HeroSlider lays a scrim band
 * across the top of any slide with a backdrop. A hero that puts a photograph up
 * there owes this header the same band.
 *
 * Once you scroll off the hero there is nothing dark left underneath, so it
 * takes on a solid plum of its own rather than leaving white links floating
 * over cream paper.
 *
 * The links go wide at `lg`, not `md`. Naming all four arms of the ministry grew
 * the nav, and grouping the school and the college under Education pulled it back
 * to seven — but seven plus the logo and the Give button still will not sit in
 * 768px. Below that it is the mobile menu, which does not care how many there are.
 *
 * The path arrives as a prop rather than out of usePathname(), so that the bar
 * can be drawn without one. On a route whose address is not known until a
 * request arrives — /needs/[slug], /app/needs/[id] — the pathname is runtime
 * data, and a header that insisted on it would keep the entire page out of the
 * static shell to decide which nav link to underline. See SiteHeaderBar below.
 */
export function SiteHeader({ pathname }: { pathname: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  // An open mobile menu needs something solid behind it whatever the scroll is.
  const solid = scrolled || mobileOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? "bg-plum-deep/95 shadow-warm backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="shell flex h-16 items-center justify-between gap-4 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <JepegomiLogo
            variant="mono"
            title="Jepegomi — Jesus People Gospel Ministries"
            className="h-9 w-auto text-white"
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
                      ? "text-white"
                      : "text-white/75 hover:text-white"
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
                <div className="invisible absolute left-0 top-full w-72 pt-2 opacity-0 transition-[opacity,visibility] group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="overflow-hidden rounded-xl bg-white shadow-warm-lg">
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
                  isActive(link) ? "text-white" : "text-white/75 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ),
          )}
          <Link
            href="/give"
            className="ml-2 rounded-full bg-green px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-green-light"
          >
            Give
          </Link>
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
          <Link
            href="/give"
            className="rounded-full bg-green px-4 py-2 text-sm font-bold text-white"
          >
            Give
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded text-white"
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
          className="border-t border-white/10 bg-plum-deep px-6 pt-2 pb-6 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {navLinks.map((link) => (
            <div key={link.href} className="border-b border-white/5 last:border-0">
              <Link href={link.href} className="block py-3 text-sm text-white/80">
                {link.label}
              </Link>
              {link.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className="block py-2 pl-4 text-sm text-white/45"
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
export function LiveSiteHeader() {
  return <SiteHeader pathname={usePathname()} />;
}
