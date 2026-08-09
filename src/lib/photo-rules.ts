/**
 * Upload rules shared by the browser and the server.
 *
 * Kept apart from `photos.ts` on purpose: that module imports `node:fs`, so
 * anything a client component needs has to live somewhere it can reach without
 * dragging the filesystem into the browser bundle.
 */

export const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/**
 * The largest photo the site will take, and why it is this number.
 *
 * It used to say 15 MB, and that was a promise nothing could keep. An upload
 * goes through a Server Action, and two ceilings sit above this one:
 *
 *   1 MB    Next's own default for a Server Action body. Anything larger was
 *           refused by the framework before `savePhoto` ran at all — so the
 *           friendly "please compress it first" never appeared, and what an
 *           editor got instead was a failed upload with no reason on it. That
 *           is every photograph a phone has ever taken.
 *   4.5 MB  the hosting platform's cap on a serverless request body. This one
 *           cannot be configured at all: no amount of Next settings raises it,
 *           and a request over it never reaches the application.
 *
 * So the honest limit is under 4.5 MB, and the first ceiling is lifted to match
 * in next.config.ts. Four leaves room for the boundaries and part headers that
 * multipart/form-data adds around the file itself.
 *
 * A photo over this is a photo to compress. Everything already in
 * public/photos/ is well under it — see photos-source/README.md, which is the
 * workflow this number is sized for.
 */
export const MAX_BYTES = 4 * 1024 * 1024;

/**
 * The same figure in words, so the browser's warning, the server's refusal and
 * the hint under the file picker cannot drift apart from each other or from the
 * number actually enforced. They had all been typed out separately, which is
 * how three of them came to say 15.
 */
export const MAX_LABEL = `${MAX_BYTES / (1024 * 1024)} MB`;

export type SlotId = number | "before" | "after";
