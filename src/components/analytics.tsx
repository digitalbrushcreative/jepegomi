import Script from "next/script";

/*
  The Google Analytics 4 measurement property for jepegomi.org.

  Not an environment variable, deliberately. A measurement ID is not a secret —
  it is served to every reader in the page source — and putting it in the
  environment would mean the one place it can go missing is a deployment nobody
  is looking at. Here it is in the repository, next to the note explaining it.
*/
const MEASUREMENT_ID = "G-26WYEN0BFM";

/*
  Development traffic is not traffic.

  `next dev` reloads a page on every keystroke in a file, and every one of those
  would arrive in the ministry's reports as a visit. So the tag is only written
  into the page in a production build — which is also why `next.config.ts` can
  keep the Google hosts out of nothing: the policy allows them either way, and
  in development there is simply nothing asking.
*/
const enabled = process.env.NODE_ENV === "production";

/**
 * Google Analytics, on the public site only.
 *
 * This is mounted from the `(site)` layout rather than the root one, for the
 * same reason the header is: /app is the ministry's own CMS, and a report that
 * counts Simon editing the kitchen page as a visitor is a report that has to be
 * read with an apology attached. Analytics measures readers; the tool the
 * ministry uses to write for them is not a reader.
 *
 * `afterInteractive` — the default, said out loud — is what analytics wants.
 * `beforeInteractive` would put a request to Google ahead of the page's own
 * JavaScript to measure a page that had not finished arriving, and `lazyOnload`
 * waits for an idle moment that a reader who bounces never gives it.
 *
 * The gtag bootstrap below is the snippet Google publishes, unchanged. It is
 * inline because it has to run before the library it configures has loaded —
 * the queue it pushes into is the whole mechanism — and it carries an `id` so
 * that next/script can track it and write it exactly once.
 */
export function Analytics() {
  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
