"use server";

import { redirect } from "next/navigation";
import { signInPartner, signOutPartner } from "@/lib/partners";

export type PartnerLoginState = { error?: string } | undefined;

export async function partnerSignInAction(
  _prev: PartnerLoginState,
  formData: FormData,
): Promise<PartnerLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  let ok = false;
  try {
    ok = await signInPartner(email, password);
  } catch (error) {
    console.error("Partners: sign-in failed.", error);
    return { error: "We could not sign you in just now. Try again shortly." };
  }

  if (!ok) {
    /*
      Deliberately one message for four different failures: wrong password, no
      such partner, verified but never given a login, and a login that has since
      been revoked. Distinguishing them would tell anybody with a list of church
      email addresses which of them give to this ministry — and that is exactly
      the fact this whole area exists to keep private.
    */
    return {
      error:
        "That email and password don't match an account here. If your church has not been given a login yet, write to us and we will set one up.",
    };
  }

  redirect("/partners/dashboard");
}

export async function partnerSignOutAction() {
  await signOutPartner();
  redirect("/partners");
}
