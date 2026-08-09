import { cacheLife } from "next/cache";

/**
 * The channel's own recent uploads, read from YouTube's public feed.
 *
 * There is no API key here and there is not meant to be one. Every channel
 * publishes an Atom feed of its fifteen most recent uploads at a fixed address,
 * unauthenticated and unmetered — no console project, no quota to run out on a
 * Sunday, and nothing to rotate when whoever set it up has moved on. The whole
 * cost of this feature is a URL.
 *
 * Everything below fails to nothing. A channel that has not been pasted in yet,
 * a feed that will not answer, a page whose shape Google changed overnight —
 * each of them returns an empty list, and /programs/digital renders exactly what
 * it rendered before there were videos on it. A streaming ministry's page going
 * quiet is a disappointment; one throwing an error where the sermons should be
 * is a broken site.
 */

/** One upload, in the shape the page needs and nothing more. */
export type ChannelVideo = {
  /** The eleven-character YouTube id, which is what /embed/ wants. */
  id: string;
  title: string;
  /** Where the video lives on YouTube, taken from the feed rather than built. */
  url: string;
  /** ISO 8601, so it survives the `use cache` boundary. See lib/dates.ts. */
  published: string;
  thumbnail: string;
};

const FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=";

/*
  A channel id is the letters UC and twenty-two more. It is the only address the
  feed accepts — not the @handle a person actually copies out of their browser,
  which is why there is a resolution step below at all.
*/
const CHANNEL_ID = "(UC[\\w-]{22})";

/**
 * Turn whatever was pasted into the CMS into a channel id.
 *
 * `https://youtube.com/channel/UC…` already carries it. `@handle`, `/c/name`
 * and the old `/user/name` do not, so the channel page is fetched and the id
 * read out of it — canonical link first, because that is the one marker on the
 * page that is there to be read by machines rather than by YouTube's own
 * player, and two internal fields after it as belt and braces.
 *
 * Cached for a month on success: a handle points at the same channel for as
 * long as the channel exists. Cached for an hour on failure, so a bad afternoon
 * at Google's end does not leave the page empty until September.
 */
async function channelId(channelUrl: string): Promise<string> {
  "use cache";

  const direct = channelUrl.match(new RegExp(`/channel/${CHANNEL_ID}`))?.[1];
  if (direct) {
    cacheLife("max");
    return direct;
  }

  try {
    const response = await fetch(channelUrl, {
      headers: { "accept-language": "en" },
    });
    if (!response.ok) throw new Error(`the channel page answered ${response.status}`);

    const html = await response.text();
    const found =
      html.match(new RegExp(`<link rel="canonical" href="[^"]*/channel/${CHANNEL_ID}"`))?.[1] ??
      html.match(new RegExp(`"(?:externalId|channelId)":"${CHANNEL_ID}"`))?.[1];
    if (!found) throw new Error("no channel id on the page");

    cacheLife("max");
    return found;
  } catch (error) {
    console.error(`YouTube: could not resolve "${channelUrl}".`, error);
    cacheLife("hours");
    return "";
  }
}

/**
 * The most recent uploads from a channel, newest first.
 *
 * `channelUrl` is whatever is in the CMS — blank until Simon pastes it, in
 * which case nothing is fetched at all. The hour-long life is the shape of the
 * thing being described: services go out on Sunday and once or twice midweek,
 * so a page an hour behind the channel has never been wrong in a way anybody
 * could notice, and the feed is asked for at most twenty-four times a day
 * however many people are reading.
 */
export async function latestVideos(
  channelUrl: string,
  count = 4,
): Promise<ChannelVideo[]> {
  "use cache";
  cacheLife("hours");

  const url = channelUrl.trim();
  if (!url) return [];

  const id = await channelId(url);
  if (!id) return [];

  try {
    const response = await fetch(FEED + id);
    if (!response.ok) throw new Error(`the feed answered ${response.status}`);

    /*
      An entry with no id is dropped before the count is applied, not after —
      otherwise a single malformed entry would silently shorten the row. It has
      never been seen in a real feed; the ordering costs nothing to get right.
    */
    const entries = (await response.text())
      .split("<entry>")
      .slice(1)
      .map((entry) => ({
        id: textOf(entry, "yt:videoId"),
        title: textOf(entry, "title"),
        url: attributeOf(entry, /<link rel="alternate" href="([^"]+)"/),
        published: textOf(entry, "published"),
      }))
      .filter((entry) => entry.id !== "")
      .slice(0, count);

    return await Promise.all(
      entries.map(async (entry) => ({
        ...entry,
        url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
        thumbnail: await thumbnail(entry.id),
      })),
    );
  } catch (error) {
    console.error(`YouTube: could not read the feed for ${id}.`, error);
    return [];
  }
}

/**
 * The best still YouTube holds for a video.
 *
 * `maxresdefault` is the source frame at 1280×720 and is the one worth having
 * on a page this size — but it only exists if the upload was big enough for it,
 * and a phone-shot service often is not. Asking for it and getting a 404 would
 * put a broken image where the sermon is, so it is asked about first with a
 * HEAD and fallen back on.
 *
 * `hqdefault` always exists. It is 480×360, which is 4:3 with the wide frame
 * letterboxed inside it — `object-cover` in a 16:9 box crops exactly the black
 * bars off, so the two sizes are interchangeable on the page and only differ in
 * how sharp they are.
 */
async function thumbnail(id: string): Promise<string> {
  const still = (name: string) => `https://i.ytimg.com/vi/${id}/${name}.jpg`;

  try {
    const response = await fetch(still("maxresdefault"), { method: "HEAD" });
    if (response.ok) return still("maxresdefault");
  } catch {
    // Fall through: a still that cannot be reached is not one worth waiting on.
  }

  return still("hqdefault");
}

/*
  The feed is parsed by hand rather than with an XML library.

  It is a machine-generated document with a fixed shape and five fields are
  wanted out of it, so a parser would be a dependency carried for the life of
  the site to do what these two functions do — and the failure mode of getting
  it wrong is an empty list, which the page already handles.
*/
function textOf(entry: string, tag: string): string {
  const match = entry.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decode(match[1].trim()) : "";
}

function attributeOf(entry: string, pattern: RegExp): string {
  const match = entry.match(pattern);
  return match ? decode(match[1]) : "";
}

const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  /*
    Last, and it matters. `&amp;` decoded first would turn `&amp;quot;` — a
    title with a literal `&quot;` in it — into a quote mark that was never
    there. Replacing in one pass over the string cannot make that mistake.
  */
  "&amp;": "&",
};

function decode(value: string): string {
  return value.replace(
    /&(?:lt|gt|quot|apos|#39|amp);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
}
