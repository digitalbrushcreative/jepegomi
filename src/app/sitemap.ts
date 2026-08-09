import type { MetadataRoute } from "next";
import { getPublishedNeeds } from "@/lib/needs";
import { site } from "@/lib/site";

/**
 * Every page worth finding.
 *
 * The fixed routes are typed out rather than derived from the nav in
 * lib/site.ts, because the two lists answer different questions. The nav is
 * what a person should be offered, which is why it groups the academy and the
 * college under Education and leaves /needs out of the bar entirely. This is
 * what exists — /needs is one of the most important pages on the site, and a
 * page nobody can reach from the header is exactly the page that needs telling
 * a crawler about.
 *
 * `priority` is a hint and a weak one, so it is used only to say something
 * true: the front page and the two pages that ask for money matter most.
 */
const routes: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "yearly", priority: 0.7 },
  { path: "/church", changeFrequency: "monthly", priority: 0.8 },
  { path: "/education", changeFrequency: "yearly", priority: 0.6 },
  { path: "/academy", changeFrequency: "monthly", priority: 0.8 },
  { path: "/college", changeFrequency: "monthly", priority: 0.7 },
  { path: "/programs", changeFrequency: "yearly", priority: 0.6 },
  { path: "/programs/food-at-school", changeFrequency: "monthly", priority: 0.8 },
  { path: "/programs/digital", changeFrequency: "monthly", priority: 0.6 },
  { path: "/programs/transport", changeFrequency: "monthly", priority: 0.6 },
  { path: "/projects", changeFrequency: "monthly", priority: 0.6 },
  { path: "/projects/kitchen", changeFrequency: "weekly", priority: 0.9 },
  { path: "/needs", changeFrequency: "daily", priority: 0.9 },
  { path: "/give", changeFrequency: "monthly", priority: 0.9 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const fixed = routes.map((route) => ({
    url: `${site.url}${route.path === "/" ? "" : route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  /*
    The costed items, each of which has a real page of its own at /needs/[slug].
    Published only — `getPublishedNeeds` is the same query the public list uses,
    so a draft Simon is halfway through writing cannot be announced to Google by
    a sitemap that went looking for rows the page itself would not show.

    Wrapped, and falling back to the fixed routes alone, for the reason given at
    the top of lib/db.ts: a database outage degrades the extras and never the
    site. A sitemap missing its needs is worth having; a 500 where the sitemap
    should be teaches a crawler the file is broken.
  */
  try {
    const needs = await getPublishedNeeds();

    return [
      ...fixed,
      ...needs.map((need) => ({
        url: `${site.url}/needs/${need.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: need.closed ? 0.4 : 0.7,
      })),
    ];
  } catch (error) {
    console.error("Sitemap: could not list the needs.", error);
    return fixed;
  }
}
