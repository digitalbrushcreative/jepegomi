"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { looksAutomated } from "@/lib/forms";
import { areaForDesignation, isPartnerKind } from "@/lib/giving";
import {
  type GiftDetails,
  giftNotification,
  giftReceipt,
  queue,
  send,
} from "@/lib/mail";
import { parseUsd, usd } from "@/lib/money";
import {
  NEEDS_TAG,
  claimNeed,
  getNeedBySlug,
  needTag,
  recordGeneralPledge,
  setPledgeStatus,
} from "@/lib/needs";
import { findOrCreatePartner } from "@/lib/partners";
import { releaseAbandonedPayments, startPayment } from "@/lib/payments";
import { isPesapalConfigured } from "@/lib/pesapal";
import { site } from "@/lib/site";

/**
 * Somebody offering a gift — the one action behind both giving forms.
 *
 * There are two shapes of gift and deliberately one path through them. A giver
 * either picks a costed item off the list, in which case the amount is held
 * against that item's balance, or they say in their own words what they want to
 * support, in which case it is recorded against nothing and reconciled by hand.
 * Both end as a row in `pledges` with the same status, because from the
 * ministry's side they are the same event: somebody has promised money and
 * somebody has to write back.
 *
 * This is a public endpoint — a server action always is — so nothing the form
 * says is trusted. The need is looked up by its slug rather than by an id posted
 * alongside it, the amount is re-checked against the balance inside the insert,
 * and the status the pledge lands in is 'pending' no matter what was submitted.
 * The worst a hand-written POST can do is put a claim in front of Simon that he
 * then declines.
 *
 * Two doors lead out of it, decided by which button was pressed:
 *
 *   pay now      the pledge is written and the giver goes to Pesapal. It turns
 *                from a promise into money in lib/payments.ts, when Pesapal
 *                confirms — never on the strength of the giver coming back.
 *   send it      nothing is charged. Simon is told, the giver is emailed the
 *                account details, and the gift is marked received in /app when
 *                it actually lands.
 *
 * The second is not a leftover. A church wiring five thousand dollars from Ohio
 * should not pay a card fee on it, and the ministry still does not publish
 * account numbers on the page (see the note in lib/site.ts) — they are sent by
 * reply, to the person giving. Both doors reach the same ledger, and in both the
 * figures on the site mean exactly what they say.
 */

export type GiveState =
  | {
      error?: string;
      done?: {
        amount: string;
        towards: string;
        email: string;
        /** Whether it was held against a costed item, which changes what we can promise. */
        listed: boolean;
        /**
         * Whether the giver's copy — the one carrying the account details —
         * actually left. The thank-you says "we have emailed you" or "Pastor
         * Simon will write to you himself" off the back of this, and it has to
         * be the truth: a giver told to watch their inbox for details that
         * never arrive is a giver who quietly does not give.
         */
        sent: boolean;
      };
    }
  | undefined;

/** The giver, as they described themselves. Shared by both branches below. */
function readGiver(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const rawKind = String(formData.get("kind") ?? "church");

  if (!name) return { error: "Tell us who the gift is from." as const };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter an email address we can reply to." as const };
  }

  return {
    giver: {
      name,
      email,
      kind: isPartnerKind(rawKind) ? rawKind : "church",
      location: String(formData.get("location") ?? "").trim(),
      contactName: String(formData.get("contactName") ?? "").trim(),
    },
  };
}

/**
 * The two emails a promise sets off, sent once the row is safely written.
 *
 * They are treated differently on purpose. Simon's copy is queued — it goes out
 * after the response, and if it fails that is a line in the logs, because the
 * ledger in /app is the real record and he will see the claim there regardless.
 *
 * The giver's copy is awaited, because it is the one carrying the account
 * details and the thank-you on screen says whether to expect it. Waiting the
 * extra moment buys the difference between "we have emailed you" and "Pastor
 * Simon will write to you himself" — and getting that wrong means somebody
 * waits for an email that is never coming, and gives up.
 *
 * Neither can fail the action. The promise is already in the database by the
 * time this runs, and an error page over the top of a recorded gift would be
 * the worst outcome available.
 */
async function tellEveryone(gift: GiftDetails) {
  queue(giftNotification(gift));

  const receipt = await send(giftReceipt(gift));
  return receipt.ok;
}

/**
 * The other door: pay now, by M-Pesa or card, through Pesapal.
 *
 * Everything the promise path does still happens. The pledge is written exactly
 * as it would be otherwise — against the same balance, in the same 'pending'
 * status — because that pending row is what holds the amount while the giver is
 * away at the payment page. Two churches sent off to pay for the last $450 of
 * one water tank would otherwise both come back having paid for it.
 *
 * What differs is only what happens next: instead of an email carrying account
 * details, the giver is redirected to Pesapal, and the pledge is turned from a
 * promise into money by lib/payments.ts when Pesapal says it was paid.
 *
 * Returns where to send them rather than going there itself, because `redirect`
 * throws and must be called outside the try/catch this needs.
 */
async function openPayment(input: {
  towards: string;
  amountCents: number;
  message: string;
  designation: string;
  giver: Parameters<typeof findOrCreatePartner>[0];
}): Promise<{ error: string } | { redirectUrl: string }> {
  /*
    Before anything else, put back what nobody paid for. A giver who reached
    Pesapal an hour ago and closed the tab is still holding part of this item's
    balance, and this — somebody else arriving to give — is the exact moment
    that stale hold does harm.
  */
  try {
    await releaseAbandonedPayments();
  } catch (error) {
    // Never fatal. A hold that lingers is a smaller problem than a giver who
    // cannot give because the sweep had a bad moment.
    console.error("Giving: could not release abandoned payments.", error);
  }

  let pledgeId: string;
  let description: string;
  let tags: string[];

  try {
    const partnerId = await findOrCreatePartner(input.giver);

    if (input.towards === "other") {
      if (!input.designation) {
        return { error: "Say what you would like the gift to go towards." };
      }

      pledgeId = await recordGeneralPledge({
        partnerId,
        amountCents: input.amountCents,
        designation: input.designation,
        area: areaForDesignation(input.designation),
        message: input.message,
      });
      description = input.designation;
      tags = [NEEDS_TAG];
    } else {
      const need = await getNeedBySlug(input.towards);

      if (!need || need.closed) {
        return { error: "That item is no longer open. Nothing has been recorded." };
      }
      if (input.amountCents > need.ledger.openCents) {
        return {
          error: `Only ${usd(need.ledger.openCents)} of that item is still open. Try that, or less.`,
        };
      }

      const claim = await claimNeed({
        needId: need.id,
        partnerId,
        amountCents: input.amountCents,
        message: input.message,
      });

      if (!claim.ok) {
        return {
          error:
            claim.reason === "too-much"
              ? "Somebody claimed part of this while you were typing, so that amount no longer fits. Reload the page for the balance."
              : "That item has just been closed. Nothing has been recorded.",
        };
      }

      pledgeId = claim.pledgeId;
      description = need.title;
      tags = [NEEDS_TAG, needTag(need.slug)];
    }
  } catch (error) {
    console.error("Giving: could not record a pledge before payment.", error);
    return {
      error:
        "We could not start that payment. Please email us instead and we will do it by hand.",
    };
  }

  let opened;
  try {
    opened = await startPayment({
      pledgeId,
      amountCents: input.amountCents,
      /*
        This is the line the giver reads on the Pesapal page and, weeks later,
        on their card statement — so it names the ministry as well as the item.
        "Cabro floor" on a statement is a charge somebody queries with their
        bank; "Jepegomi — cabro floor" is one they remember making.
      */
      description: `${site.name} — ${description}`,
      giver: { name: input.giver.name, email: input.giver.email },
    });
  } catch (error) {
    /*
      Pesapal would not open the order, so nothing is going to be paid and the
      pledge must not go on holding the balance. Withdrawing it here puts the
      amount back before the giver has even finished reading the error.
    */
    console.error("Giving: Pesapal would not open the order.", error);
    try {
      await setPledgeStatus(pledgeId, "declined");
    } catch (withdrawal) {
      console.error("Giving: could not withdraw the unpaid pledge.", withdrawal);
    }

    return {
      error:
        "We could not reach the payment page just now. Try again in a moment, or choose to send it another way.",
    };
  }

  // The hold is real the moment it is written, so the balance on screen has to
  // show it — including to this giver, who may well come back to look.
  for (const tag of tags) updateTag(tag);

  return { redirectUrl: opened.redirectUrl };
}

export async function giveAction(
  _prev: GiveState,
  formData: FormData,
): Promise<GiveState> {
  const towards = String(formData.get("towards") ?? "").trim();
  if (!towards) {
    return { error: "Choose something from the list, or tell us what to put it towards." };
  }

  const amountCents = parseUsd(String(formData.get("amount") ?? ""));
  if (amountCents === null) {
    return { error: "Enter the amount you would like to give, like 250." };
  }

  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);

  const parsed = readGiver(formData);
  if ("error" in parsed) return { error: parsed.error };

  /*
    The honeypot only — not the two-second clock the other public forms also
    use. See the note on `looksAutomated`: the clock's false positives are
    plausible (autofill plus a decisive click), and here a false positive means
    a gift silently not recorded underneath a thank-you saying it was. That is
    a worse outcome than the occasional junk row, which Simon can decline in
    /app in one click.

    A trip returns the same shape a real gift does, minus the row. A bot told it
    was caught comes back without the honeypot; a bot told "thank you" leaves.
    `sent: false` rather than true, so that in the event this ever does fire on
    a real person, the screen tells them to expect a reply from Simon rather
    than an email that is not coming.
  */
  if (looksAutomated(formData, { timing: false })) {
    /*
      `towards` here is still the raw slug from the select — the need has not
      been looked up, and deliberately will not be. So the thank-you is worded
      without it rather than rendering "recorded towards t-cabro-floor". Only a
      bot should ever read this, but "should" is doing work in that sentence,
      and the cost of it being wrong is a real giver seeing a machine's URL.
    */
    return {
      done: {
        amount: usd(amountCents),
        towards: "the ministry",
        email: parsed.giver.email,
        listed: false,
        sent: false,
      },
    };
  }

  /*
    Which of the two buttons was pressed. It is a value on the submit button
    rather than a second action, so both doors go through the validation above
    and neither can be reached with an amount the other would have refused.

    `isPesapalConfigured` is re-checked here and not merely on the page that
    drew the button. A server action is a public endpoint: the button being
    absent from the HTML is a fact about one render, not a fact about what can
    be posted. With Pesapal unset this falls through and records a promise,
    which is the honest thing to do with a gift somebody meant to make.
  */
  if (String(formData.get("intent") ?? "") === "pay" && isPesapalConfigured()) {
    const opened = await openPayment({
      towards,
      amountCents,
      message,
      designation: String(formData.get("designation") ?? "")
        .trim()
        .slice(0, 120),
      giver: parsed.giver,
    });

    if ("error" in opened) return { error: opened.error };

    // Outside every try/catch above, because redirect works by throwing.
    redirect(opened.redirectUrl);
  }

  /*
    "other" is the form's word for "not one of the listed items", and it is
    checked before the slug lookup rather than after — a need whose slug really
    was "other" would otherwise swallow every free-form gift on the site.
  */
  if (towards === "other") {
    const designation = String(formData.get("designation") ?? "")
      .trim()
      .slice(0, 120);

    if (!designation) {
      return { error: "Say what you would like the gift to go towards." };
    }

    try {
      const partnerId = await findOrCreatePartner(parsed.giver);
      await recordGeneralPledge({
        partnerId,
        amountCents,
        designation,
        area: areaForDesignation(designation),
        message,
      });
    } catch (error) {
      console.error("Giving: could not record a general pledge.", error);
      return {
        error:
          "We could not record that. Please email us instead and we will do it by hand.",
      };
    }

    const sent = await tellEveryone({
      amount: usd(amountCents),
      towards: designation,
      partnerName: parsed.giver.name,
      partnerEmail: parsed.giver.email,
      partnerKind: parsed.giver.kind,
      location: parsed.giver.location,
      contactName: parsed.giver.contactName,
      message,
    });

    return {
      done: {
        amount: usd(amountCents),
        towards: designation,
        email: parsed.giver.email,
        listed: false,
        sent,
      },
    };
  }

  const need = await getNeedBySlug(towards);

  if (!need || need.closed) {
    return { error: "That item is no longer open. Nothing has been recorded." };
  }
  if (amountCents > need.ledger.openCents) {
    return {
      error: `Only ${usd(need.ledger.openCents)} of that item is still open. Try that, or less.`,
    };
  }

  try {
    const partnerId = await findOrCreatePartner(parsed.giver);

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
            : "That item has just been closed. Nothing has been recorded.",
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
  updateTag(needTag(need.slug));

  const sent = await tellEveryone({
    amount: usd(amountCents),
    towards: need.title,
    needUrl: `${site.url}/needs/${need.slug}`,
    /*
      The balance as it stands *after* this gift. Read from the figure the page
      was rendered with rather than by asking the database again — this is the
      only number both emails quote, and the giver's copy has to agree with the
      balance they can see on screen behind the thank-you.
    */
    remaining: usd(need.ledger.openCents - amountCents),
    partnerName: parsed.giver.name,
    partnerEmail: parsed.giver.email,
    partnerKind: parsed.giver.kind,
    location: parsed.giver.location,
    contactName: parsed.giver.contactName,
    message,
  });

  return {
    done: {
      amount: usd(amountCents),
      towards: need.title,
      email: parsed.giver.email,
      listed: true,
      sent,
    },
  };
}
