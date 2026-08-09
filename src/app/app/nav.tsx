"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { JepegomiLogo } from "@/components/logos";

/**
 * The chrome around the CMS.
 *
 * Everything that is *always* on screen lives here: the sidebar with the whole
 * of the tool in it, the bar across the top saying where you are, and the
 * drawer those two collapse into on a phone. The page itself arrives as
 * children and stays a server component — this file is client-side only
 * because three things need the URL or a click: which link is lit, whether the
 * drawer is open, and closing it again once you have navigated.
 *
 * The shape is the one every CMS has settled on, and for a good reason: a fixed
 * rail means the whole tool is one click away from anywhere in it, and nobody
 * has to remember that Partners lives under Giving — they can see it.
 */

export type NavChild = { href: string; label: string; caption?: string };

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** A count of what is waiting. Zero and undefined both draw nothing. */
  badge?: number;
  /** Revealed in the rail when this branch is the one you are in. */
  children?: NavChild[];
};

export type NavSection = { label: string | null; items: NavItem[] };

/* --------------------------------------------------------------- the icons */

type IconName =
  | "dashboard"
  | "pages"
  | "photos"
  | "needs"
  | "payments"
  | "partners"
  | "enquiries"
  | "settings"
  | "people";

/*
  Line icons, drawn on the same 24px grid at the same weight so the rail reads
  as one set. They are decorative — every one of them sits next to its own
  label — so they are hidden from assistive tech rather than titled.
*/
const paths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  pages: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  photos: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m3 17 5-4 4 3 3-2 6 5" />
    </>
  ),
  needs: (
    <>
      <path d="M12 3v18" />
      <path d="M16.5 7.5A3.5 3.5 0 0 0 13 5h-1.5a3 3 0 0 0 0 6h1a3 3 0 0 1 0 6H11a3.5 3.5 0 0 1-3.5-2.5" />
    </>
  ),
  payments: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </>
  ),
  partners: (
    <>
      <path d="M3 21V9l6-4 6 4v12" />
      <path d="M15 13h6v8" />
      <path d="M8 21v-5h3v5" />
    </>
  ),
  enquiries: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.2 2.2M17.6 17.6l2.2 2.2M2 12h3M19 12h3M4.2 19.8l2.2-2.2M17.6 6.4l2.2-2.2" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 7M17.5 14.2A6.5 6.5 0 0 1 21.5 20" />
    </>
  ),
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-[18px] w-[18px]"}
    >
      {paths[name]}
    </svg>
  );
}

/* ------------------------------------------------------------ which is lit */

/**
 * One link is lit at a time: the one whose href is the longest head of the
 * current path. Without the "longest" part, Site details at
 * /app/pages/site would light Pages as well as itself, and Dashboard at /app
 * would light under every screen in the tool.
 */
function activeHref(pathname: string, sections: NavSection[]) {
  const candidates = sections.flatMap((section) =>
    section.items.flatMap((item) => [
      item.href,
      ...(item.children ?? []).map((child) => child.href),
    ]),
  );

  let best = "";
  for (const href of candidates) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && href.length > best.length) best = href;
  }
  return best;
}

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-auto min-w-5 rounded-full bg-marigold px-1.5 py-0.5 text-center text-[11px] font-bold text-brown tabular-nums">
      {count}
    </span>
  );
}

/* ------------------------------------------------------------- the sidebar */

function Rail({
  sections,
  active,
  onNavigate,
}: {
  sections: NavSection[];
  active: string;
  onNavigate: () => void;
}) {
  /*
    Whether a top-level link is itself the page we are on.

    One destination is in this rail twice on purpose: Site details is a document
    like any other, so it appears in the Pages drawer, and it is also the thing
    people come to Settings looking for. At /app/pages/site both of them matched
    and both lit up — two current pages in one rail, which is wrong for anybody
    reading it and worse for a screen reader, which is simply told there are two.

    So the rule is that the top-level link wins. It is the one with a section
    heading above it saying where you are, and the one still on screen when the
    drawer is shut.
  */
  const ownedByTopLevel = sections.some((section) =>
    section.items.some((item) => item.href === active),
  );

  const childLit = (href: string) => !ownedByTopLevel && active === href;

  return (
    <nav aria-label="Manage" className="flex-1 overflow-y-auto px-3 py-5">
      {sections.map((section, index) => (
        <div key={section.label ?? index} className={index > 0 ? "mt-7" : ""}>
          {section.label && (
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-cream/35 uppercase">
              {section.label}
            </p>
          )}

          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const lit = active === item.href;
              // The branch stays open while you are anywhere inside it.
              const inside =
                active === item.href || active.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={lit ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      lit
                        ? "bg-white/12 font-semibold text-white"
                        : "text-cream/70 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    {lit && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-1.5 -left-3 w-[3px] rounded-r bg-marigold"
                      />
                    )}
                    <Icon name={item.icon} />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? <Badge count={item.badge} /> : null}
                  </Link>

                  {inside && item.children && item.children.length > 0 && (
                    <ul className="mt-1 mb-2 ml-[26px] space-y-px border-l border-white/12 pl-3">
                      {item.children.map((child, childIndex) => {
                        const previous = item.children?.[childIndex - 1];
                        return (
                          <li key={child.href}>
                            {/* The drawer's own dividers: a caption starts a run. */}
                            {child.caption && child.caption !== previous?.caption && (
                              <p
                                className={`px-2 pb-1 text-[10px] font-semibold tracking-[0.12em] text-cream/30 uppercase ${
                                  childIndex > 0 ? "pt-3" : ""
                                }`}
                              >
                                {child.caption}
                              </p>
                            )}
                            <Link
                              href={child.href}
                              onClick={onNavigate}
                              aria-current={
                                childLit(child.href) ? "page" : undefined
                              }
                              className={`block truncate rounded px-2 py-1.5 text-[13px] transition-colors ${
                                childLit(child.href)
                                  ? "bg-white/10 font-semibold text-white"
                                  : "text-cream/55 hover:bg-white/6 hover:text-white"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* --------------------------------------------------------------- the whole */

export function AdminChrome({
  sections,
  user,
  signOut,
  children,
}: {
  sections: NavSection[];
  user: { name: string; email: string };
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  /*
    The drawer remembers which page it was opened on, and is open only while
    you are still on that page. Arriving somewhere new therefore closes it
    without anything having to notice the navigation and close it — on a phone
    it covers the page you just asked for, so this is not optional behaviour.
  */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;
  // Following a link to the page you are already on needs the explicit close.
  const close = () => setOpenedAt(null);

  const active = activeHref(pathname, sections);

  // Escape closes it too, for whoever opened it without meaning to.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* The trail across the top: which section, then which screen inside it. */
  const section = sections.find((entry) =>
    entry.items.some(
      (item) =>
        item.href === active ||
        (item.children ?? []).some((child) => child.href === active),
    ),
  );
  const item = section?.items.find(
    (entry) =>
      entry.href === active ||
      (entry.children ?? []).some((child) => child.href === active),
  );
  const child = item?.children?.find((entry) => entry.href === active);

  return (
    <div className="min-h-screen bg-cream lg:flex">
      {/* The scrim only exists while the drawer is over the page. */}
      {open && (
        <button
          type="button"
          aria-label="Close the menu"
          onClick={close}
          className="fixed inset-0 z-40 cursor-default bg-charcoal/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-plum-deep transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <JepegomiLogo
            variant="mono"
            title="Jepegomi"
            className="h-8 w-auto shrink-0 text-white"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-marigold uppercase">
              Manage
            </p>
            <p className="truncate text-xs text-cream/50">The site & the giving</p>
          </div>
        </div>

        <Rail
          sections={sections}
          active={active}
          onNavigate={close}
        />

        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-cream/45">{user.email}</p>
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="w-full cursor-pointer rounded border border-white/20 px-3 py-2 text-xs font-medium text-cream/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/8 bg-cream/90 px-4 py-3 backdrop-blur-sm sm:px-8">
          <button
            type="button"
            onClick={() => setOpenedAt(pathname)}
            aria-label="Open the menu"
            aria-expanded={open}
            className="-ml-1 cursor-pointer rounded p-2 text-smoke transition-colors hover:bg-sand hover:text-charcoal lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-2 text-sm">
              {section?.label && (
                <li className="hidden shrink-0 text-smoke sm:block">
                  {section.label}
                </li>
              )}
              {section?.label && (
                <li aria-hidden="true" className="hidden text-smoke/40 sm:block">
                  /
                </li>
              )}
              <li className="min-w-0">
                {child ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <Link
                      href={item?.href ?? "/app"}
                      className="shrink-0 text-smoke hover:text-charcoal"
                    >
                      {item?.label}
                    </Link>
                    <span aria-hidden="true" className="text-smoke/40">
                      /
                    </span>
                    <span className="truncate font-medium">{child.label}</span>
                  </span>
                ) : (
                  <span className="truncate font-medium">
                    {item?.label ?? "Manage"}
                  </span>
                )}
              </li>
            </ol>
          </nav>

          <Link
            href="/"
            className="shrink-0 rounded border border-black/12 px-3 py-1.5 text-xs font-medium text-smoke transition-colors hover:bg-sand hover:text-charcoal"
          >
            View site
          </Link>
        </header>

        <main id="main" className="flex-1 px-4 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
