"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  deleteEnquiry,
  isEnquiryStatus,
  saveEnquiryNote,
  setEnquiryStatus,
} from "@/lib/enquiries";

/**
 * What Simon can do to an enrolment enquiry: mark where it has got to, keep a
 * note against it, or delete it.
 *
 * Every one of these starts with `requireUser`. A server action is a public
 * endpoint whether or not there is a page in front of it, and these read and
 * remove other people's children's names — the sign-in check is the whole of
 * the protection and it belongs in the action, not in the page that renders the
 * buttons.
 */

type FormState = { error?: string; saved?: boolean } | undefined;

function refresh() {
  revalidatePath("/app/enquiries");
}

export async function setEnquiryStatusAction(id: string, status: string) {
  const user = await requireUser();
  if (!isEnquiryStatus(status)) return;

  await setEnquiryStatus(id, status, user.id);
  refresh();
}

export async function saveEnquiryNoteAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);

  try {
    await saveEnquiryNote(id, note);
  } catch (error) {
    console.error("Enquiries: could not save a note.", error);
    return { error: "Could not save that." };
  }

  refresh();
  return { saved: true };
}

/**
 * Deletes the row, for good. There is no archive behind this and there should
 * not be: the reason the page offers it is that a family who asked about a
 * place and went elsewhere should stop being on a list, and a delete that
 * quietly keeps a copy would not do that.
 */
export async function deleteEnquiryAction(id: string) {
  await requireUser();
  await deleteEnquiry(id);
  refresh();
}
