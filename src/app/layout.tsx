import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import { Suspense } from "react";
import { LiveSiteHeader, SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";
import "./globals.css";

/*
  Fraunces is a variable font, so no `weight` is passed — asking for fixed
  weights here would drop the variable file and take the SOFT and WONK axes
  down with it. Those two axes are the whole reason it is this face and not
  Playfair: they are what make the headings feel cut by a person.
*/
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.longName}`,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
  openGraph: {
    title: `${site.name} — ${site.longName}`,
    description: site.tagline,
    url: site.url,
    siteName: site.name,
    locale: "en_KE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
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
      </body>
    </html>
  );
}
