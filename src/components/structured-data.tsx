import { getContent } from "@/cms/content";
import { ministryLd } from "@/lib/structured-data";

/**
 * One block of JSON-LD.
 *
 * A plain `<script>`, not next/script: that component exists to schedule the
 * loading and execution of JavaScript, and this is neither. It is a chunk of
 * data the browser must never run.
 *
 * `<` is escaped on the way out. Everything in these payloads comes from the
 * CMS, which means it comes from a text box — and a `</script>` typed into a
 * text box would otherwise close this tag early and turn the rest of the field
 * into markup. The unicode escape is still valid JSON, so parsers read it back
 * as the character it was.
 */
export function StructuredData({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * Who this site belongs to, on every public page.
 *
 * It hangs in the `(site)` layout rather than on the front page alone, because
 * a crawler does not necessarily arrive at the front page. Somebody searching
 * for a school in Kahawa Sukari lands on /academy, and the ministry that runs
 * it should be identifiable from wherever they came in. The `@id` is the same
 * on every page, so repeating it merges rather than multiplies.
 *
 * Reads its own content instead of taking props, for the reason the footer does
 * the same: the layout would otherwise have to fetch on behalf of a child and
 * pass it down through a component that has no other use for it.
 */
export async function MinistryStructuredData() {
  const [content, church, digital] = await Promise.all([
    getContent("site"),
    getContent("church"),
    getContent("digital"),
  ]);

  /*
    Only the channels that have been confirmed. Both of these are blank in the
    CMS until somebody pastes the real address in — the same rule the Digital
    page follows when it decides whether to link them or say they are still to
    come. `sameAs` is how a search engine ties this ministry to its YouTube
    channel; pointing it at a guessed handle ties it to a stranger's.
  */
  const sameAs = [digital.youtubeUrl, digital.facebookUrl].filter(
    (url): url is string => Boolean(url?.trim()),
  );

  return (
    <StructuredData
      data={ministryLd({
        longName: content.longName,
        email: content.email,
        streetAddress: church.address?.trim() || undefined,
        sameAs,
      })}
    />
  );
}
