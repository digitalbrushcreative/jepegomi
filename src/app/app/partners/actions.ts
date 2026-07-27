"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { isPartnerKind } from "@/lib/giving";
import {
  revokePartnerLogin,
  setPartnerPassword,
  setPartnerVerified,
  updatePartnerDetails,
} from "@/lib/partners";

/**
 * Verifying a partner, and giving one a login.
 *
 * These are two separate acts and stay two separate buttons. Verifying is Simon
 * saying he knows who this church is — it is what lets their giving be counted
 * openly. A login is a convenience on top of that, for a church that wants to
 * watch its own record. Rolling them into one would mean either issuing
 * passwords to people who never asked, or refusing to verify a gift from a
 * church that does not want an account.
 */

type FormState = { error?: string; saved?: boolean; message?: string } | undefined;

function refresh() {
  revalidatePath("/app/partners");
}

export async function setVerifiedAction(partnerId: string, verified: boolean) {
  await requireUser();
  await setPartnerVerified(partnerId, verified);
  refresh();
}

export async function issueLoginAction(_prev: FormState, formData: FormData) {
  await requireUser();

  const partnerId = String(formData.get("partnerId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 10) {
    return { error: "Use a password of at least 10 characters." };
  }

  try {
    await setPartnerPassword(partnerId, password);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not set that password.",
    };
  }

  refresh();
  return {
    saved: true,
    message: "They can sign in at /partners with their email and that password.",
  };
}

export async function revokeLoginAction(partnerId: string) {
  await requireUser();
  await revokePartnerLogin(partnerId);
  refresh();
}

export async function updatePartnerAction(_prev: FormState, formData: FormData) {
  await requireUser();

  const partnerId = String(formData.get("partnerId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const rawKind = String(formData.get("kind") ?? "church");

  if (!name) return { error: "A partner needs a name." };

  try {
    await updatePartnerDetails(partnerId, {
      name,
      kind: isPartnerKind(rawKind) ? rawKind : "church",
      location: String(formData.get("location") ?? "").trim(),
      contactName: String(formData.get("contactName") ?? "").trim(),
      note: String(formData.get("note") ?? "").trim(),
    });
  } catch (error) {
    console.error("Partners: could not save details.", error);
    return { error: "Could not save that." };
  }

  refresh();
  return { saved: true };
}
