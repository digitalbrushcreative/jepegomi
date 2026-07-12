"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";

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
