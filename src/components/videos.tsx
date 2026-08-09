import { formatDay } from "@/lib/dates";
import type { ChannelVideo } from "@/lib/youtube";
import { VideoFrame } from "@/components/video-frame";

/**
 * The channel's recent uploads: the newest message given the room it deserves,
 * and the ones before it in a row underneath.
 *
 * Nothing here is written by an editor. The titles and the dates are whatever
 * was typed into YouTube when the service was uploaded, which is the point —
 * the page stays current because somebody uploaded a sermon, not because
 * somebody remembered to come back and say so.
 *
 * Renders nothing at all when the list is empty. See lib/youtube.ts: a channel
 * that has not been pasted in yet, or a feed that will not answer, leaves the
 * page exactly as it was before there were videos on it.
 */
export function LatestVideos({ videos }: { videos: ChannelVideo[] }) {
  if (videos.length === 0) return null;

  const [latest, ...earlier] = videos;

  return (
    <div>
      <div className="max-w-3xl">
        <VideoFrame
          id={latest.id}
          title={latest.title}
          thumbnail={latest.thumbnail}
          sizes="(max-width: 768px) 100vw, 720px"
          priority
        />
        <p className="eyebrow mt-4 text-plum">
          Most recent · {formatDay(latest.published)}
        </p>
        <h3 className="font-display mt-2 text-xl leading-snug font-semibold text-balance">
          {latest.title}
        </h3>
      </div>

      {earlier.length > 0 && (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {earlier.map((video) => (
            <li key={video.id}>
              <VideoFrame
                id={video.id}
                title={video.title}
                thumbnail={video.thumbnail}
                sizes="(max-width: 768px) 100vw, 340px"
              />
              {/*
                Two lines and no more. These are service recordings, and their
                titles run to the date, the passage and the speaker — left to
                run on, one card would stand a head taller than the two beside
                it for no reason a reader could see.
              */}
              <h3 className="mt-3 line-clamp-2 leading-snug font-semibold">
                {video.title}
              </h3>
              <p className="mt-1 text-sm text-smoke">
                {formatDay(video.published)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
