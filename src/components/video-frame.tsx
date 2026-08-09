"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A video's still, which becomes the video when somebody asks for it.
 *
 * Until the button is pressed there is no player on the page: no iframe, no
 * script of Google's, no request to anywhere but this site. That is not only a
 * courtesy to the reader — it is what lets `img-src 'self'` and the rest of the
 * policy in next.config.ts stay as tight as they are. The still itself comes
 * through Next's image optimiser, so it is served from this domain even though
 * it was fetched from YouTube's.
 *
 * The trade is one click before the sermon plays, which is the same click
 * YouTube would have asked for anyway.
 */
export function VideoFrame({
  id,
  title,
  thumbnail,
  sizes,
  priority = false,
}: {
  id: string;
  title: string;
  thumbnail: string;
  /** What width the still will be shown at, for the srcset. */
  sizes: string;
  /** Set on the newest video only — it is the one above the fold. */
  priority?: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-charcoal shadow-warm">
      {playing ? (
        /*
          youtube-nocookie.com, not youtube.com. It is the same player and the
          same video; what it does not do is write an advertising cookie for
          somebody who came here to listen to a sermon.
        */
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play “${title}”`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          {/*
            No alt text: the button around it is already named for the video, and
            a screen reader announcing the title twice describes nothing.

            `object-cover` is doing real work here — see the note on hqdefault in
            lib/youtube.ts. The 4:3 fallback still has the wide frame letterboxed
            inside it, and cropping to 16:9 takes off exactly the black bars.
          */}
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 bg-charcoal/25 transition-colors group-hover:bg-charcoal/10" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-marigold shadow-warm transition-transform group-hover:scale-110">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="ml-1 h-7 w-7 fill-plum-deep"
              >
                <path d="M6 4.5v15l14-7.5z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
