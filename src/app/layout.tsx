import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { shareImage } from "@/lib/seo";
import { site } from "@/lib/site";
import "./globals.css";

/*
  Newsreader for headings, Inter for everything else. Newsreader is a text
  serif drawn for reading on screens — sober where the old display face was
  playful — and its optical-size axis keeps large headings from looking like
  enlarged body type. Inter carries the navigation, the body and the forms.
*/
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.longName}`,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
  /*
    The fallback card, for anything that does not build its own with pageMeta().
    Public pages all do — see lib/seo.ts, and the reason they have to: metadata
    merges shallowly, so a page that sets `openGraph` replaces this object whole
    rather than adding to it. What is left inheriting this is /app, which nobody
    shares, and it may as well unfurl as the ministry.
  */
  openGraph: {
    title: `${site.name} — ${site.longName}`,
    description: site.tagline,
    url: site.url,
    siteName: site.name,
    locale: "en_KE",
    type: "website",
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.longName}`,
    description: site.tagline,
    images: [shareImage.url],
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
      className={`${newsreader.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
