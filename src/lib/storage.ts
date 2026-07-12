/**
 * Storage for the photos the /app CMS uploads.
 *
 * Kept behind this interface on purpose: the backend is the one piece of the
 * stack still to be decided (see SETUP.md). Swapping Vercel Blob for R2,
 * Supabase Storage or a git-commit driver means writing one new implementation
 * of `PhotoStore`, not touching the CMS or the report page.
 */

import type { PhotoCategory } from "@/content/kitchen";

export type StoredPhoto = {
  /** Slot 1–23 on the report, or "before" / "after" for the comparison pair. */
  slot: number | "before" | "after";
  url: string;
  caption: string;
  category: PhotoCategory | null;
  updatedAt: string;
};

export interface PhotoStore {
  list(): Promise<StoredPhoto[]>;
  put(slot: StoredPhoto["slot"], file: File, caption: string): Promise<StoredPhoto>;
  remove(slot: StoredPhoto["slot"]): Promise<void>;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "No photo storage backend is configured. See SETUP.md — set BLOB_READ_WRITE_TOKEN " +
        "(Vercel Blob) or implement another PhotoStore driver.",
    );
    this.name = "StorageNotConfiguredError";
  }
}

export function getPhotoStore(): PhotoStore {
  throw new StorageNotConfiguredError();
}
