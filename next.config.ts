import type { NextConfig } from "next";

/*
  The two iframes on the site — the map at the bottom of /contact, and the
  sermon player on /programs/digital. Named here rather than written into the
  policy string, because a policy with a bare hostname buried in it is a policy
  nobody can read.

  The player is the -nocookie host, and it is not loaded with the page: the
  video is a still with a play button until somebody presses it (see
  components/video-frame.tsx), so a reader who never presses play never reaches
  Google at all.
*/
const MAP_HOST = "https://www.openstreetmap.org";
const VIDEO_HOST = "https://www.youtube-nocookie.com";

/*
  Where a giver is sent to pay.

  This is in `form-action` and not `frame-src` for a reason that is easy to get
  wrong: the redirect to Pesapal is the *response to a form submission* — the
  give form posts to a server action, which answers with a redirect to the
  payment page. Browsers check `form-action` against the whole redirect chain,
  not just the first hop, so a policy of `form-action 'self'` would let the POST
  through and then silently refuse the navigation that carries the gift.

  Both hosts, because sandbox and live are different ones (see lib/pesapal.ts)
  and a staging deployment that cannot reach its own gateway is a staging
  deployment that tests nothing.
*/
const PESAPAL_HOSTS = ["https://pay.pesapal.com", "https://cybqa.pesapal.com"];

const isDev = process.env.NODE_ENV === "development";

/**
 * The content security policy.
 *
 * `'unsafe-inline'` on scripts is a real weakening and it is a considered one.
 * The alternative Next documents is a per-request nonce, which requires every
 * page to be dynamically rendered — and this site is built the other way round:
 * Cache Components serves a prerendered static shell and streams the parts that
 * need a request (see `cacheComponents` below). Buying a stricter policy by
 * making every page dynamic would trade the site's actual speed for defence in
 * depth against an injection route that does not exist here — there is no
 * `dangerouslySetInnerHTML` anywhere in src/, no third-party script, and the
 * only rich text an editor can write is paragraph breaks (see cms/prose.ts).
 *
 * So this policy is not the thing standing between the site and XSS; React's
 * escaping is. What it does is cheap and worth having anyway: it stops an
 * injected tag reaching an attacker's domain, it stops the page being framed,
 * and it stops a form being pointed somewhere else.
 */
function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    // 'unsafe-eval' is React's dev-only error reconstruction. Never in production.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    // Tailwind, and next/font's injected face declarations.
    "style-src 'self' 'unsafe-inline'",
    /*
      data: for inline SVG marks; blob: for the upload preview in /app/photos.

      Still no host but this one, and the video stills are the reason that is
      worth pointing out: they come from YouTube, but they come *through*
      next/image, which fetches them on the server and serves them from here.
      A directive that had to name i.ytimg.com would be a directive letting
      every reader's browser announce itself to Google before pressing play.
    */
    "img-src 'self' data: blob:",
    // next/font self-hosts, so nothing is fetched from Google at runtime.
    "font-src 'self' data:",
    `frame-src ${MAP_HOST} ${VIDEO_HOST}`,
    "connect-src 'self'",
    `form-action 'self' ${PESAPAL_HOSTS.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const nextConfig: NextConfig = {
  /*
    Cache Components (Next 16) is what lets the CMS be both fast and instant.
    Page content is read inside a `use cache` scope tagged per page, so visitors
    get a prerendered static shell. When an editor saves, the action calls
    `updateTag` for that one page, which expires only that entry — the editor
    sees their own write immediately and no other page is rebuilt.
  */
  cacheComponents: true,

  /* The framework's version is nobody's business but ours. */
  poweredByHeader: false,

  /*
    Photos are uploaded through a Server Action, and a Server Action body is
    capped at 1 MB unless this says otherwise — which meant the CMS offered a
    15 MB limit it could not honour and refused every photograph a phone has
    ever taken, before any of our own code ran and with no message on it.

    4.5 MB rather than something generous, because that is the hosting
    platform's own ceiling on a serverless request body and no setting here can
    lift it. `MAX_BYTES` in lib/photo-rules.ts sits at 4 MB underneath, so an
    over-large photo is refused by our code, in words, with the size in them —
    and the half-megabyte between the two is room for what multipart/form-data
    wraps around the file.
  */
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },

  /*
    The video stills on /programs/digital, and nothing else off-origin.

    Narrow on purpose: the hostname and the path both, so this permits exactly
    the thumbnail of a YouTube video and cannot be talked into optimising an
    arbitrary URL somebody found. Everything else on the site is a file under
    public/.
  */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
        search: "",
      },
    ],
  },

  /*
    `next dev` binds localhost and refuses to serve its own client chunks to a
    page loaded from a different origin — and 127.0.0.1 counts as a different
    origin, even though it is the same machine. The browser tests drive the site
    at 127.0.0.1 (see playwright.config.ts), so without this they were testing a
    site whose JavaScript never arrived: every client component sat unhydrated,
    and a form that relies on an onSubmit handler quietly fell back to whatever
    the browser does with a bare <form>.

    Development only — the setting has no meaning in a production build.
  */
  allowedDevOrigins: ["127.0.0.1"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
          /*
            Redundant beside `frame-ancestors` above for anything modern, and
            kept because it is one line and it is what an older browser reads.
            The screens worth framing are the partner dashboard and /app, and
            both are behind a session that a clickjacked click would carry.
          */
          { key: "X-Frame-Options", value: "DENY" },
          /*
            A photo the CMS wrote is served straight from public/. Its extension
            is derived from the image type on the way in (see lib/photos.ts), so
            it is already a JPEG called .jpg — this is the belt to that braces:
            no sniffing, no file talked into being script.
          */
          { key: "X-Content-Type-Options", value: "nosniff" },
          /*
            A partner's dashboard address says which church is signed in, and
            /needs/[slug] says what somebody is about to give towards. Neither
            belongs in a Referer header sent to another site — but the origin
            alone is fine, and keeping it means links out still attribute.
          */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          /*
            Nothing on this site asks for a camera, a microphone or a location.
            Saying so out loud costs a header and closes the door on anything
            that later tries to.
          */
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      /*
        HSTS in production only. Sent from a development server it would pin
        localhost to https in the browser of whoever is working on the site,
        which is a genuinely unpleasant afternoon to hand somebody.

        Two years, subdomains included, and no `preload` — preloading is a
        one-way door that needs a deliberate submission, not a config line.
      */
      ...(isDev
        ? []
        : [
            {
              source: "/:path*",
              headers: [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ],
            },
          ]),
      /*
        The screens behind a session, told not to be stored or indexed.

        Each of these already carries `robots: { index: false }` in its metadata
        and robots.ts disallows them, but a header is the one an intermediary
        cache reads — and a partner's giving cached by a proxy and handed to the
        next person through it is the failure this whole area exists to prevent.
      */
      ...["/app/:path*", "/partners/:path*"].map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, private",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      })),
    ];
  },
};

export default nextConfig;
