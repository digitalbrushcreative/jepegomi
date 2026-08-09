import { readdir } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { getContent } from "@/cms/content";
import { readImageUpload } from "@/lib/image-upload";
import { ACCEPTED_EXTENSIONS, type SlotId } from "@/lib/photo-rules";
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

/**
 * How many numbered slots the grid has.
 *
 * A constant rather than the length of the caption list, and that is the point
 * of it: the slots are files on disk, and if somebody removed a row in the CMS
 * the upload for that slot would stop being reachable and the file would be
 * stranded. The captions describe the slots; they do not decide how many there
 * are.
 */
export const GALLERY_SLOTS = 23;

export type GalleryPhoto = {
  id: number;
  category: string;
  caption: string;
  src: string;
};

export function isSlotId(value: unknown): value is SlotId {
  if (value === "before" || value === "after") return true;
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= GALLERY_SLOTS
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

/**
 * Every gallery slot, with its caption from the CMS and any uploaded photo
 * resolved onto it.
 *
 * Driven by the slot count rather than by the caption rows, so a caption
 * somebody deleted leaves a photograph with no words under it rather than a
 * photograph nobody can see. The two are joined on the slot number, which is
 * also the filename — see the note on the gallery document in cms/schema.ts.
 *
 * Not tagged with the content tag on purpose: it is already tagged with the
 * photos one, and a caption edited in /app shows up when that expires or on the
 * next deploy. A photograph appearing is the urgent half; a caption is not.
 */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  "use cache";
  cacheTag(PHOTOS_TAG);
  cacheLife("max");

  const [files, content] = await Promise.all([
    readPhotoFiles(),
    getContent("gallery"),
  ]);

  const captions = new Map(
    content.photos.map((row) => [String(row.slot).trim(), row]),
  );

  return Array.from({ length: GALLERY_SLOTS }, (_, index) => {
    const id = index + 1;
    const row = captions.get(String(id));
    return {
      id,
      category: row?.category ?? "",
      caption: row?.caption ?? "",
      src: files.get(String(id)) ?? "",
    };
  });
}

/** The tabs above the gallery, as the CMS has them. */
export async function getGalleryCategories() {
  "use cache";
  cacheTag(PHOTOS_TAG);
  cacheLife("max");

  const content = await getContent("gallery");
  return content.categories.filter((category) => category.id && category.label);
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
  await getPhotoWriter(PHOTO_DIR, REPO_DIR, "kitchen photo").remove(
    path.basename(existing),
  );
}

function slotFilename(slot: SlotId, mime: string) {
  const extension =
    mime === "image/jpeg" ? ".jpg" : `.${mime.slice("image/".length)}`;
  const name = typeof slot === "number" ? String(slot).padStart(2, "0") : slot;
  return `${name}${extension}`;
}

export async function savePhoto(slot: SlotId, file: File) {
  /*
    The type comes back from the bytes, not from what the browser called the
    file — see lib/image-upload.ts. It decides the extension this is written
    under and therefore the Content-Type it is later served with, so it is not
    a thing to take anybody's word for.
  */
  const { bytes, mime } = await readImageUpload(file);

  // Replacing a .png with a .jpg would otherwise leave both files fighting over
  // the slot, so the old one goes first.
  await clearSlot(slot);

  const filename = slotFilename(slot, mime);
  const writer = getPhotoWriter(PHOTO_DIR, REPO_DIR, "kitchen photo");
  await writer.write(filename, bytes);

  return {
    src: `${PUBLIC_BASE}/${filename}`,
    message: writer.savedMessage,
    /** GitHub writes only land on the site after a rebuild. */
    immediate: writer.kind === "fs",
  };
}

export async function deletePhoto(slot: SlotId) {
  await clearSlot(slot);
  return { immediate: getPhotoWriter(PHOTO_DIR, REPO_DIR, "kitchen photo").kind === "fs" };
}
