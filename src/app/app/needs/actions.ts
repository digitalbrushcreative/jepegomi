"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { NEED_AREAS, type PledgeStatus } from "@/lib/giving";
import { parseUsd } from "@/lib/money";
import { NEED_ICONS } from "@/lib/giving";
import { removeUpdatePhoto, saveUpdatePhoto } from "@/lib/need-photos";
import {
  NEEDS_TAG,
  attachUpdatePhoto,
  createNeed,
  createNeedUpdate,
  createPart,
  deleteNeed,
  deleteNeedUpdate,
  deletePart,
  getPartById,
  needTag,
  setPledgeStatus,
  slugOfNeed,
  updateNeed,
  updatePart,
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

function knownArea(value: string) {
  return NEED_AREAS.some((area) => area.id === value) ? value : "other";
}

/**
 * The fields of an item, checked.
 *
 * Async because of one rule: **the part decides the project**. An item filed
 * inside "walls up" belongs to whatever project that part belongs to, whatever
 * the area dropdown happened to be left on — otherwise a stray click files the
 * cement under the academy and it vanishes off the kitchen's list while its
 * heading goes on waiting for it. So when a part is chosen, its area is read
 * back from the database and used. The dropdown only has a say for the items
 * that are not in a part at all.
 *
 * A part id that does not resolve is treated as no part rather than as an
 * error: this is a public endpoint like every other server action, and the
 * worst a hand-written POST should achieve is an item that sits loose under a
 * project.
 */
/**
 * An icon name the form offered, or empty.
 *
 * Checked against the list rather than trusted, for the same reason the CMS
 * checks its choice fields: the select is a courtesy to people, and the action
 * behind it takes whatever a POST puts in it. An unknown name would render as
 * nothing at all, which on a card whose whole left-hand side is the icon reads
 * as a broken page.
 */
function iconName(raw: string) {
  return NEED_ICONS.some((icon) => icon === raw) ? raw : "";
}

async function readNeedForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const closed = formData.get("closed") === "on";

  /*
    Zero is allowed, but only on something already finished.

    `parseUsd` refuses it everywhere else and should: an open item costing
    nothing is an ask for nothing, and the giving form has no business accepting
    it. But a reconciliation has lines like the transport in Pastor Simon's
    letter — marked "Used", spent, with no figure ever put against it — and a
    ledger that cannot write that down forces the letter back into a source file.
    Zero on a closed line reads as "we do not know what this came to"; see the
    note in `getProjectBudget`.
  */
  const rawCost = String(formData.get("cost") ?? "").trim();
  const costCents =
    closed && /^\$?0(\.0{1,2})?$/.test(rawCost) ? 0 : parseUsd(rawCost);

  if (!title) return { error: "Give it a name." as const };
  if (costCents === null) {
    return { error: "Enter what it costs, in dollars — like 850." as const };
  }

  const rawPart = String(formData.get("partId") ?? "").trim();
  const part = rawPart ? await getPartById(rawPart) : null;

  /*
    Blank is not zero here. An estimate nobody recorded and an estimate of
    nothing are different facts, and only the first is ordinary — most items were
    never estimated at anything other than what they cost. `parseUsd` gives null
    for an empty box, which is exactly the answer to store.
  */
  const estimatedCents = parseUsd(String(formData.get("estimated") ?? ""));

  return {
    input: {
      title,
      summary: String(formData.get("summary") ?? "").trim(),
      detail: String(formData.get("detail") ?? "").trim(),
      area: knownArea(part ? part.area : String(formData.get("area") ?? "other")),
      partId: part?.id ?? null,
      costCents,
      estimatedCents,
      note: String(formData.get("note") ?? "").trim(),
      icon: iconName(String(formData.get("icon") ?? "")),
      published: formData.get("published") === "on",
      closed,
      position: Number(formData.get("position") ?? 0) || 0,
    },
  };
}

function readPartForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the part a name — “walls up”." as const };

  return {
    input: {
      area: knownArea(String(formData.get("area") ?? "other")),
      title,
      summary: String(formData.get("summary") ?? "").trim(),
      sequence: Number(formData.get("sequence") ?? 0) || 0,
    },
  };
}

/**
 * A step of a project — the thing an itemised list hangs off.
 *
 * Adding one changes nothing on the public site by itself. A part shows up
 * where its items do, so this is safe to do before the costs are known, which
 * is the order the work actually gets planned in.
 */
export async function createPartAction(_prev: FormState, formData: FormData) {
  await requireUser();

  const parsed = readPartForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await createPart(parsed.input);
  } catch (error) {
    console.error("Giving: could not create a part.", error);
    return { error: "Could not save that. The database did not accept it." };
  }

  refresh();
  return { saved: true };
}

/**
 * Renaming a part, or moving it in the running order.
 *
 * Changing the number is the whole point of this form and it has consequences:
 * moving a part earlier can open it for giving, and moving it later can shut a
 * part that was open. That is intended — the sequence is the rule — but it is
 * why every need tag is expired afterwards rather than just this page.
 */
export async function updatePartAction(_prev: FormState, formData: FormData) {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const parsed = readPartForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await updatePart(id, parsed.input);
  } catch (error) {
    console.error("Giving: could not save a part.", error);
    return { error: "Could not save that." };
  }

  refresh();
  return { saved: true };
}

export async function deletePartAction(id: string) {
  await requireUser();

  await deletePart(id);
  refresh();
}

export async function createNeedAction(_prev: FormState, formData: FormData) {
  await requireUser();

  const parsed = await readNeedForm(formData);
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
  const parsed = await readNeedForm(formData);
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

/* ------------------------------------------------ one-time installation data */

/*
  The three lines of Pastor Simon's letter the gift never reached.

  This is not the site's copy of the reconciliation — that is in the `needs`
  table, where Simon can correct it, and `getProjectBudget` reads it back. This
  is the *installer*: the figures typed in from the letter so the ledger could be
  populated without anybody re-keying ten rows into a form. It ran, and the rows
  it wrote are the accounts now.

  It stays because a seeder whose data has been deleted is a seeder that cannot
  be re-run against a fresh database, and because the letter is the provenance of
  every figure in that table. Nothing on the site reads it.
*/

type LetterLine = {
  item: string;
  estimatedUsd: number;
  note: string;
  /** The one-line description the kitchen page draws on its card. */
  summary: string;
  /** The picture the kitchen page used to draw beside this one. */
  icon: string;
};

/** Never started — the gift was fully spent before these could be reached. */
const neverReached: LetterLine[] = [
  {
    item: "Water tank for harvesting water, plus pipes",
    summary: "A water tank to harvest rainwater, and the pipes to run it",
    icon: "water",
    estimatedUsd: 850,
    note: "Not bought — funds ran out",
  },
  {
    item: "Cabro stones — the children's eating area floor",
    summary: "Cabro stones to floor the area where the children eat",
    icon: "paving",
    estimatedUsd: 1000,
    note: "Not done — funds ran out",
  },
  {
    item: "Dining hall — plastering and electricity",
    summary: "Plaster and power in the dining hall",
    icon: "light",
    estimatedUsd: 1138,
    note: "Not done — funds ran out",
  },
];

/**
 * The three things the $8,000 never reached, lifted straight out of the kitchen
 * report.
 *
 * These figures are already public — they are in the budget panel on the
 * Kitchen page — and they are the obvious first entries in a ledger built to
 * ask for exactly this kind of thing. The figures come from the transcription
 * above rather than being retyped here.
 */
export async function seedKitchenNeedsAction() {
  await requireUser();

  for (const [index, line] of neverReached.entries()) {
    await createNeed({
      title: line.item,
      summary: line.summary,
      detail: [
        "This is one of the three items the $8,000 kitchen gift could not reach — the money was fully spent before it got this far.",
        line.note,
      ].join("\n\n"),
      area: "kitchen",
      // Loose under the project, not in a part. These three are what is left of
      // a build that is otherwise done; there is no sequence left to respect.
      partId: null,
      icon: line.icon,
      costCents: line.estimatedUsd * 100,
      /*
        No separate estimate: nothing has been bought, so the estimate *is* the
        ask. The accounts fall back to the cost for a line like this.
      */
      estimatedCents: null,
      note: line.note,
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
