import { readdir } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { photos as slots, type Photo } from "@/content/kitchen";
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME,
  MAX_BYTES,
  type SlotId,
} from "@/lib/photo-rules";
import { getPhotoWriter } from "@/lib/photo-writer";

/**
 * Photos live as files in public/photos/kitchen, named for the slot they fill
 * (07.jpg, before.jpg). The filename *is* the database — which is what lets
 * Simon copy files straight into the folder and lets the /app tool write to the
 * same place, with neither knowing about the other.
 */
export const PHOTO_DIR = path.join(process.cwd(), "public", "photos", "kitchen");
/** Same folder, addressed the way the GitHub API wants it. */
const REPO_DIR = "public/photos/kitchen";
const PUBLIC_BASE = "/photos/kitchen";

export type { SlotId };

export function isSlotId(value: unknown): value is SlotId {
  if (value === "before" || value === "after") return true;
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= slots.length
  );
}

export function parseSlotId(raw: string): SlotId | null {
  if (raw === "before" || raw === "after") return raw;
  const n = Number(raw);
  return isSlotId(n) ? n : null;
}

/** "07.jpg" -> 7, "before.png" -> "before", "notes.txt" -> null */
function slotFromFilename(filename: string): SlotId | null {
  const ext = path.extname(filename).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) return null;
  return parseSlotId(path.basename(filename, ext).toLowerCase());
}

/**
 * Everything that lists photos shares this tag. Uploading or deleting one
 * expires it, which is what makes a new photo appear on the Kitchen Build page
 * and in the /app grid at the same moment.
 */
export const PHOTOS_TAG = "photos";

/**
 * Maps each filled slot to its public URL. Missing slots are simply absent.
 *
 * Deliberately NOT cached: the write path calls this to find the file it is
 * about to replace, and that answer has to be the truth on disk right now, not
 * whatever was cached before the last upload.
 */
export async function readPhotoFiles(): Promise<Map<string, string>> {
  let filenames: string[];
  try {
    filenames = await readdir(PHOTO_DIR);
  } catch {
    return new Map();
  }

  const found = new Map<string, string>();
  for (const filename of filenames) {
    const slot = slotFromFilename(filename);
    if (slot === null) continue;
    found.set(String(slot), `${PUBLIC_BASE}/${filename}`);
  }
  return found;
}

/** The 23 gallery slots with any uploaded photo resolved onto them. */
export async function getGalleryPhotos(): Promise<Photo[]> {
  "use cache";
  cacheTag(PHOTOS_TAG);
  cacheLife("max");

  const files = await readPhotoFiles();
  return slots.map((photo) => ({
    ...photo,
    src: files.get(String(photo.id)) ?? "",
  }));
}

export async function getBeforeAfterSources() {
  "use cache";
  cacheTag(PHOTOS_TAG);
  cacheLife("max");

  const files = await readPhotoFiles();
  return {
    before: files.get("before") ?? "",
    after: files.get("after") ?? "",
  };
}

/** Removes whatever file currently occupies a slot, whatever its extension. */
async function clearSlot(slot: SlotId) {
  const files = await readPhotoFiles();
  const existing = files.get(String(slot));
  if (!existing) return;
  await getPhotoWriter(PHOTO_DIR, REPO_DIR).remove(path.basename(existing));
}

function slotFilename(slot: SlotId, mime: string) {
  const extension =
    mime === "image/jpeg" ? ".jpg" : `.${mime.slice("image/".length)}`;
  const name = typeof slot === "number" ? String(slot).padStart(2, "0") : slot;
  return `${name}${extension}`;
}

export async function savePhoto(slot: SlotId, file: File) {
  if (!ACCEPTED_MIME.includes(file.type)) {
    throw new Error("That file is not a JPEG, PNG, WebP or AVIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("That image is larger than 15 MB.");
  }

  // Replacing a .png with a .jpg would otherwise leave both files fighting over
  // the slot, so the old one goes first.
  await clearSlot(slot);

  const filename = slotFilename(slot, file.type);
  const writer = getPhotoWriter(PHOTO_DIR, REPO_DIR);
  await writer.write(filename, Buffer.from(await file.arrayBuffer()));

  return {
    src: `${PUBLIC_BASE}/${filename}`,
    message: writer.savedMessage,
    /** GitHub writes only land on the site after a rebuild. */
    immediate: writer.kind === "fs",
  };
}

export async function deletePhoto(slot: SlotId) {
  await clearSlot(slot);
  return { immediate: getPhotoWriter(PHOTO_DIR, REPO_DIR).kind === "fs" };
}
