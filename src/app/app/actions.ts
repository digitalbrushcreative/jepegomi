"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { contentTag } from "@/cms/content";
import { parseDocumentForm } from "@/cms/form";
import { documents, isDocumentKey } from "@/cms/schema";
import {
  createFirstUser,
  createUser,
  currentUser,
  requireUser,
  signIn,
  signOut,
} from "@/lib/auth";
import { sql } from "@/lib/db";
import { PHOTOS_TAG, deletePhoto, parseSlotId, savePhoto } from "@/lib/photos";

type FormState = { error?: string; saved?: boolean } | undefined;

export async function signInAction(_prev: FormState, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (!(await signIn(email, password))) {
    // Deliberately vague: saying which half was wrong tells an attacker which
    // email addresses have accounts.
    return { error: "That email and password don't match." };
  }

  redirect("/app");
}

export async function createFirstUserAction(
  _prev: FormState,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { error: "Enter your name and email." };
  if (password.length < 10) {
    return { error: "Use a password of at least 10 characters." };
  }

  try {
    await createFirstUser({ name, email, password });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create the account.",
    };
  }

  redirect("/app");
}

export async function inviteUserAction(_prev: FormState, formData: FormData) {
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { error: "Enter a name and email." };
  if (password.length < 10) {
    return { error: "Use a password of at least 10 characters." };
  }

  try {
    await createUser({ name, email, password });
  } catch {
    return { error: "Could not add that person. Is the email already used?" };
  }

  revalidatePath("/app/people");
  return { saved: true };
}

export async function removeUserAction(userId: string) {
  const user = await requireUser();

  if (user.id === userId) {
    throw new Error("You cannot remove your own account.");
  }

  await sql()`DELETE FROM users WHERE id = ${userId}`;
  revalidatePath("/app/people");
}

export async function signOutAction() {
  await signOut();
  redirect("/app");
}

/** Every action re-checks the session — a server action is a public endpoint. */
export async function saveContentAction(_prev: FormState, formData: FormData) {
  const user = await currentUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const key = String(formData.get("__key") ?? "");
  if (!isDocumentKey(key)) return { error: "Unknown page." };

  const data = parseDocumentForm(key, formData);

  try {
    await sql()`
      INSERT INTO content (key, data, updated_at, updated_by)
      VALUES (${key}, ${JSON.stringify(data)}, now(), ${user.id})
      ON CONFLICT (key) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = now(),
            updated_by = EXCLUDED.updated_by
    `;
  } catch (error) {
    console.error(`CMS: could not save "${key}".`, error);
    return { error: "Could not save. The database did not accept the change." };
  }

  /*
    updateTag, not revalidateTag: it expires the entry immediately rather than
    serving stale-while-revalidate, so the editor sees their own words on the
    live page the instant they click through to it. Only this page's tag is
    touched, so nothing else on the site is rebuilt.
  */
  updateTag(contentTag(key));

  const path = documents[key].path;
  if (path) revalidatePath(path);

  return { saved: true };
}

export type PhotoResult =
  | { ok: true; src: string; message?: string; immediate: boolean }
  | { ok: false; error: string };

function refreshPhotoViews() {
  updateTag(PHOTOS_TAG);
  revalidatePath("/projects/kitchen");
}

export async function uploadPhotoAction(
  formData: FormData,
): Promise<PhotoResult> {
  try {
    await requireUser();

    const slot = parseSlotId(String(formData.get("slot") ?? ""));
    if (slot === null) {
      return { ok: false, error: "Unknown photo slot." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No image was received." };
    }

    const saved = await savePhoto(slot, file);
    refreshPhotoViews();
    return {
      ok: true,
      src: saved.src,
      message: saved.immediate ? undefined : saved.message,
      immediate: saved.immediate,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }
}

export async function deletePhotoAction(rawSlot: string): Promise<PhotoResult> {
  try {
    await requireUser();

    const slot = parseSlotId(rawSlot);
    if (slot === null) {
      return { ok: false, error: "Unknown photo slot." };
    }

    const { immediate } = await deletePhoto(slot);
    refreshPhotoViews();
    return { ok: true, src: "", immediate };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed.",
    };
  }
}
