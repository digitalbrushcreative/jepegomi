import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * What a crawler may look at.
 *
 * Three things are kept out, and none of them for secrecy — a robots file is a
 * request, not a lock, and every one of these is behind a session check that
 * does the actual work. What this prevents is the other failure: a partner
 * church searching for its own name and finding the address of its giving
 * dashboard in the results, or Simon's CMS sign-in ranking for "Jepegomi
 * manage". Pages that answer a redirect to strangers have nothing to offer an
 * index and something to lose by being in one.
 *
 * /api is here for the same reason rather than any other: the IPN endpoint
 * answers a JSON acknowledgement to anybody who asks, and that is by design
 * (see the note in its route handler). It is simply not a page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/app/", "/partners/dashboard", "/partners/preview", "/api/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
