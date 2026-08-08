import Image from "next/image";

/**
 * The site's photographs, and the two shapes they come in.
 *
 * Everything here is a plain file under `public/photos/`, referenced by path.
 * That is deliberate and different from the Kitchen Build gallery, which reads
 * its folder at request time because Simon uploads to it: these are a fixed set
 * chosen once, so a scan at runtime would be work done to learn something the
 * code already knows.
 *
 * The alt text is not optional and there is no default, because a photograph of
 * children with no alt text is exactly the photograph a screen reader most needs
 * described.
 */
export type SitePhoto = {
  src: string;
  alt: string;
  /** Shown under the photo in a strip. Bands are wordless. */
  caption?: string;
};

/**
 * One photograph running the width of the page's shell, used to break between a
 * page's plum hero and its body.
 *
 * `aspect` is a prop rather than a constant because the photographs are crops
 * out of a slide deck and do not share a shape — forcing one ratio on all of
 * them would crop the wide ones to a slot and the tall ones to a slit.
 */
export function PhotoBand({
  photo,
  aspect = "aspect-[16/9]",
  className = "",
}: {
  photo: SitePhoto;
  aspect?: string;
  className?: string;
}) {
  return (
    <div className={`px-6 ${className}`}>
      <div className="shell">
        <div
          className={`relative ${aspect} overflow-hidden rounded-2xl bg-sand shadow-warm`}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width: 768px) 100vw, 1100px"
            className="object-cover"
          />
        </div>
        {photo.caption && (
          <p className="mt-3 text-sm leading-relaxed text-smoke">
            {photo.caption}
          </p>
        )}
      </div>
    </div>
  );
}

/*
  Written out rather than interpolated. `lg:grid-cols-${n}` would read correctly
  and render broken: Tailwind scans the source as text and never sees a class
  that only exists once the template literal has run.
*/
const columns: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/**
 * Two or three photographs side by side, each captioned.
 *
 * They stack on a narrow screen rather than shrinking, because three postage
 * stamps of a classroom tell a reader nothing that no photograph at all would
 * not have told them just as well.
 */
export function PhotoStrip({
  photos,
  className = "",
}: {
  photos: SitePhoto[];
  className?: string;
}) {
  if (photos.length === 0) return null;

  return (
    <ul
      className={`grid gap-6 sm:grid-cols-2 ${columns[photos.length] ?? "lg:grid-cols-3"} ${className}`}
    >
      {photos.map((photo) => (
        <li
          key={photo.src}
          className="overflow-hidden rounded-2xl bg-white shadow-warm"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-sand">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 768px) 100vw, 380px"
              className="object-cover"
            />
          </div>
          {photo.caption && (
            <p className="px-5 py-4 text-sm leading-relaxed text-smoke">
              {photo.caption}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
