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

export const MAX_BYTES = 15 * 1024 * 1024;

export type SlotId = number | "before" | "after";
