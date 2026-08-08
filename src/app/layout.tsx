import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
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

/**
 * The document, and nothing else.
 *
 * The site's header and footer used to hang here, which meant the CMS wore them
 * too — a marketing bar floating over a tool nobody visits as a visitor. They
 * now live in the `(site)` group's layout, and `/app` brings its own chrome.
 * Route groups change no URLs: `(site)/about` is still `/about`.
 */
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
