import Image from "next/image";
import Link from "next/link";
import { paragraphs } from "@/cms/prose";
import { formatDay } from "@/lib/dates";
import type { NeedUpdate } from "@/lib/giving";

/**
 * What happened after the money arrived.
 *
 * This is the half of transparent giving that is not a number. A church that
 * paid for the water tank should be able to see the water tank — and the reason
 * it is a dated list rather than a gallery is that the dates are the argument:
 * they show the work moving, and they show how long it actually takes, which is
 * the part most appeals leave out.
 *
 * Photos are optional and often absent. A note posted from Nairobi with no
 * photograph is still worth more to the person who paid than silence, so an
 * update without one is laid out as an update rather than as a broken card.
 */

export type TimelineUpdate = NeedUpdate & {
  needTitle?: string;
  needSlug?: string;
};

function Entry({ update, showNeed }: { update: TimelineUpdate; showNeed?: boolean }) {
  return (
    <li className="relative pl-8">
      {/* The dot on the line. */}
      <span
        aria-hidden="true"
        className="absolute top-2 left-0 h-3 w-3 rounded-full border-2 border-cream bg-marigold"
      />

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <time
          dateTime={update.createdAt}
          className="eyebrow text-plum"
        >
          {formatDay(update.createdAt)}
        </time>
        {showNeed && update.needSlug && update.needTitle && (
          <Link
            href={`/needs/${update.needSlug}`}
            className="text-sm font-medium text-smoke underline underline-offset-4 hover:text-plum"
          >
            {update.needTitle}
          </Link>
        )}
      </div>

      {update.photo && (
        <div className="relative mt-4 aspect-[3/2] overflow-hidden rounded-xl bg-sand">
          <Image
            src={update.photo}
            alt={update.photoAlt || "Progress on this item"}
            fill
            sizes="(max-width: 768px) 100vw, 560px"
            loading="lazy"
            className="object-cover"
          />
        </div>
      )}

      {paragraphs(update.body).map((text) => (
        <p key={text} className="mt-4 leading-relaxed text-smoke">
          {text}
        </p>
      ))}

      {update.authorName && (
        <p className="mt-3 text-xs text-smoke/70">Posted by {update.authorName}</p>
      )}
    </li>
  );
}

export function NeedUpdates({
  updates,
  showNeed = false,
  emptyNote = "Nothing has been posted yet. Once work starts on this, progress and photographs appear here.",
}: {
  updates: TimelineUpdate[];
  /** On a partner's dashboard the updates come from several needs at once. */
  showNeed?: boolean;
  emptyNote?: string;
}) {
  if (updates.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-smoke/30 bg-sand px-6 py-5 leading-relaxed text-smoke">
        {emptyNote}
      </p>
    );
  }

  return (
    <ol className="relative space-y-12 border-l border-sand-deep pl-1">
      {updates.map((update) => (
        <Entry key={update.id} update={update} showNeed={showNeed} />
      ))}
    </ol>
  );
}
