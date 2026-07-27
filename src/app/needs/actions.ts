"use server";

import { updateTag } from "next/cache";
import { isPartnerKind } from "@/lib/giving";
import { parseUsd, usd } from "@/lib/money";
import { NEEDS_TAG, claimNeed, getNeedBySlug, needTag } from "@/lib/needs";
import { findOrCreatePartner } from "@/lib/partners";

/**
 * Somebody claiming part of a need.
 *
 * This is a public endpoint — a server action always is — so nothing the form
 * says is trusted. The need is looked up by its slug rather than by an id
 * posted alongside it, the amount is re-checked against the balance inside the
 * insert, and the status the claim lands in is 'pending' no matter what was
 * submitted. The worst a hand-written POST can do is put a claim in front of
 * Simon that he then declines.
 *
 * What deliberately does NOT happen here: taking a payment. The ministry does
 * not publish account details on the site and does not want to (see the note in
 * lib/site.ts) — Simon replies with the right account for wherever the giver is
 * giving from. So a claim is a promise, and the money is marked received in
 * /app when it actually lands. That is slower, and it is also the only version
 * of this page where the figures mean what they say.
 */

export type ClaimState =
  | {
      error?: string;
      done?: { amount: string; needTitle: string; email: string };
    }
  | undefined;

export async function claimNeedAction(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const slug = String(formData.get("slug") ?? "");
  const need = await getNeedBySlug(slug);

  if (!need || need.closed) {
    return { error: "That need is no longer open. Nothing has been recorded." };
  }

  const amountCents = parseUsd(String(formData.get("amount") ?? ""));
  if (amountCents === null) {
    return { error: "Enter the amount you would like to give, like 250." };
  }
  if (amountCents > need.ledger.openCents) {
    return {
      error: `Only ${usd(need.ledger.openCents)} of this is still open. Try that, or less.`,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);

  const rawKind = String(formData.get("kind") ?? "church");
  const kind = isPartnerKind(rawKind) ? rawKind : "church";

  if (!name) return { error: "Tell us who the gift is from." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter an email address we can reply to." };
  }

  try {
    const partnerId = await findOrCreatePartner({
      name,
      email,
      kind,
      location,
      contactName,
    });

    const claim = await claimNeed({
      needId: need.id,
      partnerId,
      amountCents,
      message,
    });

    if (!claim.ok) {
      return {
        error:
          claim.reason === "too-much"
            ? "Somebody claimed part of this while you were typing, so that amount no longer fits. Reload the page for the balance."
            : "That need has just been closed. Nothing has been recorded.",
      };
    }
  } catch (error) {
    console.error("Giving: could not record a claim.", error);
    return {
      error:
        "We could not record that. Please email us instead and we will do it by hand.",
    };
  }

  /*
    updateTag rather than revalidateTag: the giver has to see their own claim
    reflected in the balance the moment the page comes back, or the first thing
    the feature teaches them is that it did not work.
  */
  updateTag(NEEDS_TAG);
  updateTag(needTag(slug));

  return {
    done: { amount: usd(amountCents), needTitle: need.title, email },
  };
}
