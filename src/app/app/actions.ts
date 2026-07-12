"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSignedIn, signIn, signOut } from "@/lib/auth";
import { deletePhoto, parseSlotId, savePhoto } from "@/lib/photos";

export async function signInAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  const passphrase = String(formData.get("passphrase") ?? "");

  if (!passphrase) {
    return { error: "Enter the passphrase." };
  }

  if (!(await signIn(passphrase))) {
    return { error: "That passphrase is not correct." };
  }

  redirect("/app");
}

export async function signOutAction() {
  await signOut();
  redirect("/app");
}

export type PhotoResult =
  | { ok: true; src: string; message?: string; immediate: boolean }
  | { ok: false; error: string };

/** Both actions re-check the session — a server action is a public endpoint. */
async function guard() {
  if (!(await isSignedIn())) {
    throw new Error("Not signed in.");
  }
}

function refreshViews() {
  revalidatePath("/projects/kitchen");
  revalidatePath("/app");
}

export async function uploadPhotoAction(formData: FormData): Promise<PhotoResult> {
  try {
    await guard();

    const slot = parseSlotId(String(formData.get("slot") ?? ""));
    if (slot === null) {
      return { ok: false, error: "Unknown photo slot." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No image was received." };
    }

    const saved = await savePhoto(slot, file);
    refreshViews();
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
    await guard();

    const slot = parseSlotId(rawSlot);
    if (slot === null) {
      return { ok: false, error: "Unknown photo slot." };
    }

    const { immediate } = await deletePhoto(slot);
    refreshViews();
    return { ok: true, src: "", immediate };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed.",
    };
  }
}
