import path from "node:path";
import { extensionFor, readImageUpload } from "@/lib/image-upload";
import { getPhotoWriter } from "@/lib/photo-writer";

/**
 * Photos attached to a progress update.
 *
 * The kitchen gallery has twenty-three numbered slots, so the filename on disk
 * is enough to say which photo is which and there is no database involved (see
 * lib/photos.ts). These are the other kind: one photo belonging to one update,
 * arriving whenever there is something to show. The `need_updates` row holds
 * the public path, so nothing here ever has to scan a directory to find out
 * what exists — the ledger already knows.
 *
 * Writing goes through the same PhotoWriter as everything else, which means the
 * same bargain in production: the file is committed to the repo and appears on
 * the site once it rebuilds.
 */

const PHOTO_DIR = path.join(process.cwd(), "public", "photos", "updates");
const REPO_DIR = "public/photos/updates";
const PUBLIC_BASE = "/photos/updates";

function writer() {
  return getPhotoWriter(PHOTO_DIR, REPO_DIR, "progress photo");
}

/**
 * Named for the update it belongs to, so a photo can never end up on the wrong
 * one and deleting the update is enough to know which file to take with it.
 */
export async function saveUpdatePhoto(updateId: string, file: File) {
  /* Verified from the bytes, not from the name. See lib/image-upload.ts. */
  const { bytes, mime } = await readImageUpload(file);

  const filename = `${updateId}${extensionFor(mime)}`;
  const target = writer();
  await target.write(filename, bytes);

  return {
    src: `${PUBLIC_BASE}/${filename}`,
    message: target.savedMessage,
    /** GitHub writes only land on the site after a rebuild. */
    immediate: target.kind === "fs",
  };
}

/** Takes the file with the update. A src we did not write is left alone. */
export async function removeUpdatePhoto(src: string) {
  if (!src.startsWith(`${PUBLIC_BASE}/`)) return;
  await writer().remove(path.basename(src));
}
