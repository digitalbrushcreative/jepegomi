"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { JepegomiLogo } from "@/components/logos";
import { navLinks } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-charcoal">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <JepegomiLogo
            variant="mono"
            title="Jepegomi — Jesus People Gospel Ministries"
            className="h-9 w-auto text-white"
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) =>
            link.children ? (
              // Hover opens it for mice; focus-within keeps it reachable by keyboard.
              <div key={link.href} className="group relative">
                <Link
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded px-3 py-2 text-sm transition-colors ${
                    isActive(link.href)
                      ? "text-white"
                      : "text-white/60 hover:text-white"
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
                  <div className="overflow-hidden rounded border border-black/5 bg-white shadow-xl">
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
                  isActive(link.href) ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ),
          )}
          <Link
            href="/give"
            className="ml-2 rounded bg-green px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-green-light"
          >
            Give
          </Link>
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/give"
            className="rounded bg-green px-4 py-2 text-sm font-medium text-white"
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
          className="border-t border-white/10 bg-charcoal px-6 pt-2 pb-6 md:hidden"
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
