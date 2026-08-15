"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/lib/auth";
import { NEED_AREAS } from "@/lib/giving";
import { parseUsd } from "@/lib/money";
import {
  NEEDS_TAG,
  createNeed,
  deleteNeed,
  getNeedById,
  needTag,
  updateNeed,
} from "@/lib/needs";

/**
 * Recording what a project actually bought.
 *
 * ## Why this writes needs
 *
 * An expense here is a closed row in `needs`, and there is no `expenses` table.
 * That looks like a shortcut and is the opposite of one.
 *
 * A need is already "a thing this ministry wants, costing $X". Closing it
 * already means "the work on this is finished". Put an estimate beside the cost
 * and you have said the whole of what a receipt says: what it was, what we
 * thought it would come to, what it came to. Everything downstream is built on
 * that shape already — `getProjectBudget` reconciles from it, `showsAccounts`
 * gates it per project, and a partner's own share of the same rows is what the
 * dashboard prints above the accounts. A second table holding money-out would
 * have to be reconciled against this one by somebody, and that somebody would be
 * Pastor Simon, at a desk in Nairobi, for no benefit he can see.
 *
 * What was genuinely missing was not a table. It was a screen that says
 * "spent" — because "record that we bought cement by adding a need for cement
 * and then ticking Finished" is a sentence nobody should have to be told. That
 * is all this file is: the ledger's own vocabulary, from the other end.
 *
 * ## What it sets, and why the form does not ask
 *
 * `closed` because it is bought, and `published: false` because the site has no
 * business asking strangers for a thing that is already paid for. Both are
 * decided here rather than offered as checkboxes — an expense that arrived on
 * /needs with a Give button under it would be the single worst bug this screen
 * could have, and the way to not have it is to not have a control for it.
 *
 * Every action re-checks the session. A server action is a public endpoint
 * whatever page its form was rendered on, and this one moves money figures.
 */

type FormState = { error?: string; saved?: boolean } | undefined;

/*
  What has been spent changes a project's accounts, which are read on a
  partner's dashboard and — where Simon has opened them — on the project's own
  public page. The dashboard is uncached and picks it up on the next load; the
  public pages are not, so their tags go too.
*/
function refresh(slug?: string) {
  updateTag(NEEDS_TAG);
  if (slug) {
    updateTag(needTag(slug));
    revalidatePath(`/needs/${slug}`);
  }
  revalidatePath("/app/spending");
  revalidatePath("/app/needs");
  revalidatePath("/needs");
  revalidatePath("/projects/kitchen");
}

function knownArea(value: string) {
  return NEED_AREAS.some((area) => area.id === value) ? value : "other";
}

/**
 * The figures off the form.
 *
 * The one rule worth stating: **a blank Actual is not zero.** A line Pastor
 * Simon's letter marks "Used" is money that went, on a day nobody wrote the
 * amount down, and a ledger that cannot record that forces the honest answer out
 * of the accounts altogether. Blank and "0" both store zero cents, which
 * `getProjectBudget` reads back as "we do not know" and the table prints as
 * "Used" — never as "it cost nothing". Zero is allowed here and refused
 * everywhere else on the site for exactly this reason; see the column note in
 * lib/db.ts.
 *
 * A blank Estimated is a third thing again — no estimate was ever made — and
 * stores null, which the accounts read back as "it was expected to cost what it
 * cost". Three states, three storable values, no guessing.
 */
function readForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Say what was bought." as const };

  const rawActual = String(formData.get("actual") ?? "").trim();
  const actualCents =
    rawActual === "" || /^\$?0(\.0{1,2})?$/.test(rawActual)
      ? 0
      : parseUsd(rawActual);

  if (actualCents === null) {
    return {
      error:
        "Enter what it came to in dollars — like 1550 — or leave it blank if the amount was never written down." as const,
    };
  }

  const estimatedCents = parseUsd(String(formData.get("estimated") ?? ""));

  return {
    title,
    actualCents,
    estimatedCents,
    note: String(formData.get("note") ?? "").trim(),
  };
}

export async function recordSpendAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = readForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    const { slug } = await createNeed({
      title: parsed.title,
      summary: "",
      detail: "",
      area: knownArea(String(formData.get("area") ?? "other")),
      /*
        Never in a part. A part is a step of work still being asked for, and its
        whole job is deciding what opens for giving next — something already
        bought has no place in that queue.
      */
      partId: null,
      costCents: parsed.actualCents,
      estimatedCents: parsed.estimatedCents,
      note: parsed.note,
      icon: "",
      published: false,
      closed: true,
      position: Number(formData.get("position") ?? 0) || 0,
    });
    refresh(slug);
  } catch (error) {
    console.error("Giving: could not record what was spent.", error);
    return { error: "Could not save that. The database did not accept it." };
  }

  return { saved: true };
}

/**
 * Correcting a line.
 *
 * Reads the row back and writes it whole, because `updateNeed` takes a complete
 * need and this form shows four of its fields. Merging rather than defaulting is
 * what stops an edit here from silently unpublishing a row, emptying its
 * summary, or knocking it out of the part it sits in — the ordinary case being
 * a line that was a public ask first and became an expense when it was bought.
 */
export async function updateSpendAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const parsed = readForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const existing = await getNeedById(id);
  if (!existing) return { error: "That line no longer exists." };

  try {
    const { slug, previousSlug } = await updateNeed(id, {
      ...existing,
      title: parsed.title,
      costCents: parsed.actualCents,
      estimatedCents: parsed.estimatedCents,
      note: parsed.note,
      closed: true,
    });
    refresh(slug);
    if (previousSlug !== slug) refresh(previousSlug);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save that.",
    };
  }

  return { saved: true };
}

/**
 * Removing a line entirely — for one entered twice, or against the wrong
 * project.
 *
 * `deleteNeed` refuses any row a church has money against, and says so. That
 * matters more here than it does under Needs: the kitchen's six lines all carry
 * Encounter Church's giving, so the rows most likely to be tidied away on this
 * screen are the ones whose deletion would erase somebody's record of what they
 * paid for.
 */
export async function deleteSpendAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  try {
    const slug = await deleteNeed(String(formData.get("id") ?? ""));
    refresh(slug);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not remove that line.",
    };
  }

  return { saved: true };
}
