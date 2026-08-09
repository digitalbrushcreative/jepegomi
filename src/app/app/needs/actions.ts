"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { outstanding, remainingNeeds } from "@/content/kitchen";
import { requireUser } from "@/lib/auth";
import { NEED_AREAS, type PledgeStatus } from "@/lib/giving";
import { parseUsd } from "@/lib/money";
import { removeUpdatePhoto, saveUpdatePhoto } from "@/lib/need-photos";
import {
  NEEDS_TAG,
  attachUpdatePhoto,
  createNeed,
  createNeedUpdate,
  deleteNeed,
  deleteNeedUpdate,
  needTag,
  setPledgeStatus,
  slugOfNeed,
  updateNeed,
} from "@/lib/needs";

/**
 * The /app side of the giving ledger.
 *
 * Every action here re-checks the session, because a server action is a public
 * endpoint no matter which page its form was rendered on. That is the same rule
 * the content actions follow, and it is worth repeating in a file whose job is
 * moving money figures around.
 */

type FormState = { error?: string; saved?: boolean } | undefined;

/**
 * Anything that changes a need changes what the public pages say about it, so
 * every write goes through here. Both tags are expired rather than one: the
 * list page reads all needs, and the need's own page reads only itself.
 */
function refresh(slug?: string) {
  updateTag(NEEDS_TAG);
  if (slug) {
    updateTag(needTag(slug));
    revalidatePath(`/needs/${slug}`);
  }
  revalidatePath("/needs");
  revalidatePath("/app/needs");
}

function readNeedForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const costCents = parseUsd(String(formData.get("cost") ?? ""));
  const rawArea = String(formData.get("area") ?? "other");

  if (!title) return { error: "Give it a name." as const };
  if (costCents === null) {
    return { error: "Enter what it costs, in dollars — like 850." as const };
  }

  return {
    input: {
      title,
      summary: String(formData.get("summary") ?? "").trim(),
      detail: String(formData.get("detail") ?? "").trim(),
      area: NEED_AREAS.some((area) => area.id === rawArea) ? rawArea : "other",
      costCents,
      published: formData.get("published") === "on",
      closed: formData.get("closed") === "on",
      position: Number(formData.get("position") ?? 0) || 0,
    },
  };
}

export async function createNeedAction(_prev: FormState, formData: FormData) {
  await requireUser();

  const parsed = readNeedForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  let slug: string;
  try {
    ({ slug } = await createNeed(parsed.input));
  } catch (error) {
    console.error("Giving: could not create a need.", error);
    return { error: "Could not save that. The database did not accept it." };
  }

  refresh(slug);
  return { saved: true };
}

export async function updateNeedAction(_prev: FormState, formData: FormData) {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const parsed = readNeedForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    const { slug, previousSlug } = await updateNeed(id, parsed.input);
    refresh(slug);
    // Renaming moves the page. The old address has to stop being cached too, or
    // it keeps serving a need that has since moved somewhere else.
    if (previousSlug !== slug) refresh(previousSlug);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save that.",
    };
  }

  return { saved: true };
}

export async function deleteNeedAction(id: string) {
  await requireUser();

  const slug = await deleteNeed(id);
  refresh(slug);
  redirect("/app/needs");
}

export async function setPledgeStatusAction(
  pledgeId: string,
  status: PledgeStatus,
) {
  await requireUser();

  const slug = await setPledgeStatus(pledgeId, status);
  refresh(slug);
}

/**
 * Posting progress on a need.
 *
 * The row is written first and the photo named after it, so a photo can never
 * belong to an update that does not exist. If the upload then fails, the update
 * survives without its picture — which is the right way round: the words are
 * the thing the partner is waiting for, and a photo can be added to the next
 * one. The failure is reported rather than swallowed.
 */
export async function postUpdateAction(_prev: FormState, formData: FormData) {
  const user = await requireUser();

  const needId = String(formData.get("needId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const photoAlt = String(formData.get("photoAlt") ?? "").trim();

  if (!needId) return { error: "Unknown item." };
  if (!body) return { error: "Write something about what has happened." };

  let updateId: string;
  try {
    updateId = await createNeedUpdate({
      needId,
      body,
      photo: "",
      photoAlt,
      userId: user.id,
    });
  } catch (error) {
    console.error("Giving: could not post an update.", error);
    return { error: "Could not post that update." };
  }

  const file = formData.get("photo");
  let photoWarning: string | undefined;

  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUpdatePhoto(updateId, file);
      await attachUpdatePhoto(updateId, saved.src);
      if (!saved.immediate) photoWarning = saved.message;
    } catch (error) {
      photoWarning =
        error instanceof Error
          ? `The update was posted, but the photo was not: ${error.message}`
          : "The update was posted, but the photo was not.";
    }
  }

  refresh(await slugOfNeed(needId));
  return photoWarning ? { error: photoWarning, saved: true } : { saved: true };
}

export async function deleteUpdateAction(id: string) {
  await requireUser();

  const removed = await deleteNeedUpdate(id);
  if (!removed) return;

  if (removed.photo) await removeUpdatePhoto(removed.photo);
  refresh(await slugOfNeed(removed.needId));
}

/**
 * The three things the $8,000 never reached, lifted straight out of the kitchen
 * report.
 *
 * These figures are already public — they are in the budget panel on the
 * Kitchen page — and they are the obvious first entries in a ledger built to
 * ask for exactly this kind of thing. Costs are read from src/content/kitchen.ts
 * rather than retyped, so the ledger and the report cannot disagree about what
 * a water tank costs.
 */
export async function seedKitchenNeedsAction() {
  await requireUser();

  for (const [index, line] of outstanding.entries()) {
    await createNeed({
      title: line.item,
      summary: remainingNeeds[index]?.text ?? "",
      detail: [
        "This is one of the three items the $8,000 kitchen gift could not reach — the money was fully spent before it got this far.",
        line.note,
      ].join("\n\n"),
      area: "kitchen",
      costCents: line.estimatedUsd * 100,
      published: true,
      closed: false,
      position: index,
    });
  }

  /*
    The caller navigates. Seeding these three makes the panel this button lives
    in disappear — it is offered only while the ledger is empty — and a redirect
    or a revalidate re-renders the page without the component still waiting on
    the result, so the button sits on "Adding…" over three needs that already
    exist. The same shape was chased out of every control on /app/partners; see
    the note there.
  */
  refresh();
}
