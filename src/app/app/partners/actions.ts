"use server";

import { revalidatePath, updateTag } from "next/cache";
import { budget, donation } from "@/content/kitchen";
import { requireUser } from "@/lib/auth";
import {
  type NeedArea,
  type PledgeStatus,
  areaOf,
  isPartnerKind,
} from "@/lib/giving";
import { partnerLoginIssued, partnerLoginRevoked, queue } from "@/lib/mail";
import { parseUsd, usd } from "@/lib/money";
import {
  NEEDS_TAG,
  createNeed,
  getNeedById,
  needTag,
  recordGeneralPledge,
  recordNeedPledge,
  setPledgeStatus,
} from "@/lib/needs";
import {
  createPartner,
  getPartner,
  getPartnerByEmail,
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

function refresh() {
  revalidatePath("/app/partners");
}

/**
 * A gift recorded here moves the same balances a claim on the public site does,
 * so it has to expire the same caches. Anything less and the item's own page
 * goes on offering money that has already been given.
 */
function refreshLedger(slug?: string) {
  updateTag(NEEDS_TAG);
  if (slug) {
    updateTag(needTag(slug));
    revalidatePath(`/needs/${slug}`);
  }
  revalidatePath("/needs");
  revalidatePath("/app/needs");
  refresh();
}

/* --------------------------------------------- entering one by hand */

/**
 * Adding a partner who never used the form.
 *
 * Verified is offered as a checkbox and starts checked, which is a departure
 * from how a partner arriving through /needs is treated — they land unverified
 * and stay that way until Simon says otherwise. The difference is who did the
 * typing. Verifying is Simon saying he knows who this church is, and he has just
 * written their name, their town and their pastor's name into a form; making him
 * then click a button to confirm he meant it is ceremony, not a check. The box
 * is there to be unticked for the case that does exist — entering a church whose
 * gift arrived through somebody else and whose details are still second-hand.
 */
export async function addPartnerAction(input: {
  name: string;
  email: string;
  kind: string;
  location: string;
  contactName: string;
  note: string;
  verified: boolean;
}) {
  await requireUser();

  const name = input.name.trim();
  const email = input.email.trim();

  if (!name) return { error: "A partner needs a name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter an email address — it is how they sign in." };
  }

  let result;
  try {
    result = await createPartner({
      name,
      email,
      kind: isPartnerKind(input.kind) ? input.kind : "church",
      location: input.location.trim(),
      contactName: input.contactName.trim(),
      note: input.note.trim(),
      verified: input.verified,
    });
  } catch (error) {
    console.error("Partners: could not add a partner.", error);
    return { error: "Could not add that partner." };
  }

  if (!result.ok) {
    return {
      error: `${result.existing.name} is already on this page with that address. Record the gift against them instead.`,
    };
  }

  /*
    No `revalidatePath` here: the caller reloads the page, for the same reason
    the Encounter Church seed does. This one adds a card to the list rather than
    deleting the form, so it is the less fragile of the two — but it is the same
    machinery, and one proven way of refreshing this page beats two.
  */
  return { saved: true };
}

/* ------------------------------------------------ the church that built it */

/**
 * Encounter Church, and the $8,000 that built the kitchen.
 *
 * The largest gift this ministry has received is the one the ledger knew
 * nothing about. It arrived years before this site did, by transfer, and was
 * reconciled in a letter — which is where every figure below comes from, read
 * out of src/content/kitchen.ts rather than retyped, so the ledger and the
 * budget panel on /projects/kitchen cannot come to disagree about what the
 * cement cost.
 *
 * The six lines go in as needs, closed and unpublished. Closed because the work
 * is done; unpublished because a site that goes on asking for cement somebody
 * bought in 2023 is a site nobody believes twice. `listNeedsForPartner` reads
 * them anyway, which is the point: Encounter signs in and sees the six things
 * their money actually bought, gathered under the kitchen, with whatever
 * progress has been posted since.
 *
 * Transport is the seventh line of the letter and is deliberately not here. It
 * is marked "Used" with no figure against it, and the six that do carry figures
 * sum to exactly $8,000 — inventing a number for it would put the ledger $240
 * out from the page that has always been careful not to.
 *
 * Nothing about the public site changes. The kitchen page names no donor, on
 * purpose (see the note in src/content/kitchen.ts), and none of these rows is
 * published.
 */
export async function seedEncounterChurchAction(rawEmail: string) {
  await requireUser();

  const email = rawEmail.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter Encounter Church's email address first." };
  }

  const existing = await getPartnerByEmail(email);
  if (existing) {
    return {
      error: `${existing.name} is already on this page with that address. Record anything missing against them by hand.`,
    };
  }

  const lines = budget.filter((line) => line.actualUsd !== null);
  const totalUsd = lines.reduce((sum, line) => sum + (line.actualUsd ?? 0), 0);

  /*
    A guard against this file and the kitchen content drifting apart. If somebody
    corrects a figure in the letter and the six no longer come to the gift, the
    right outcome is a refusal to write a ledger that does not balance — not
    eight thousand dollars of rows that are quietly $150 out.
  */
  if (totalUsd !== donation.amountUsd) {
    return {
      error: `The budget lines come to $${totalUsd}, not the $${donation.amountUsd} gift. Fix src/content/kitchen.ts before seeding.`,
    };
  }

  let partnerId: string;

  try {
    const created = await createPartner({
      name: "Encounter Church",
      email,
      kind: "church",
      location: donation.donorLocation,
      contactName: "",
      note: `Gave the $${donation.amountUsd.toLocaleString("en-US")} that built the kitchen, reconciled in Pastor Simon's letter. Not named on the public site.`,
      verified: true,
    });

    if (!created.ok) {
      return { error: `${created.existing.name} already holds that address.` };
    }
    partnerId = created.id;

    for (const [index, line] of lines.entries()) {
      const need = await createNeed({
        title: line.item,
        summary: line.note,
        detail: [
          `One of the six lines the $${donation.amountUsd.toLocaleString("en-US")} kitchen gift was spent on, as reconciled in Pastor Simon's letter.`,
          `Estimated $${line.estimatedUsd.toLocaleString("en-US")}, actually $${(line.actualUsd ?? 0).toLocaleString("en-US")} — ${line.note.toLowerCase()}.`,
        ].join("\n\n"),
        area: "kitchen",
        costCents: (line.actualUsd ?? 0) * 100,
        published: false,
        closed: true,
        position: index,
      });

      /*
        `recordNeedPledge` rather than `claimNeed`, because these needs are
        created closed and unpublished and the public claim path refuses both —
        rightly, for a stranger on the site, and wrongly for the church that
        paid for the work being closed. The balance check is the same one, and
        it cannot fail here: the need was created a moment ago, for exactly this
        amount, from the same figure.
      */
      const claim = await recordNeedPledge({
        needId: need.id,
        partnerId,
        amountCents: (line.actualUsd ?? 0) * 100,
        message: "",
      });

      if (!claim.ok) {
        return {
          error: `Could not record the ${line.item.toLowerCase()} line. Check the page above before running this again.`,
        };
      }

      await setPledgeStatus(claim.pledgeId, "received");
    }
  } catch (error) {
    console.error("Partners: could not seed Encounter Church.", error);
    return {
      error:
        "Could not write that. Anything already added is on the page above — check before running it again.",
    };
  }

  /*
    Not `refreshLedger`. Every row this wrote is unpublished and closed, so no
    public page's answer changes by one cent — /needs, /give and the front page
    read published needs only. Expiring the public giving caches here would be
    asking the site to rebuild every one of those pages to arrive back at
    exactly what they already said.

    The two screens that *do* change are the two /app screens the new rows
    appear on.
  */
  /*
    Returns rather than redirecting, and the caller reloads the page itself.

    This action is unusual in one way that turns out to matter: succeeding
    removes the very panel the button lives in, because the panel is only
    rendered while Encounter Church is missing. Neither `redirect` nor
    `revalidatePath` survives that. Both re-render /app/partners without the
    component that is awaiting this result, the transition never commits, and
    the button sits on "Adding…" while the work is already done — measured with
    timing probes: every row written and this line reached in 17ms, and the
    screen still saying "Adding…" ninety seconds later. Simon presses it again.

    So the navigation is the caller's, and it is a real one. See the note in
    `SeedEncounterForm`.
  */
  return { saved: true };
}

/* ------------------------------------------------- recording what arrived */

/**
 * A gift that came in by bank transfer, M-Pesa, or a cheque in an envelope.
 *
 * The public form is not how most of this ministry's money arrives — /give
 * publishes no account numbers and asks people to write, so the usual shape of a
 * gift is an exchange of emails and then a transfer. Until now none of that
 * could be written down: the ledger only knew about gifts that had come through
 * its own form, which meant the largest gifts it had were the ones it was
 * missing.
 *
 * A gift against a listed item goes through `claimNeed`, exactly as a public
 * claim does, so the balance check is the same one — Simon cannot record $900
 * against an $850 water tank here any more than a church could there. Then it is
 * moved to whatever status actually describes it, which is usually 'received',
 * because money he is typing in is money that has already landed.
 */
export async function recordGiftAction(input: {
  partnerId: string;
  amount: string;
  towards: string;
  designation: string;
  status: string;
  message: string;
}) {
  await requireUser();

  const { partnerId, towards } = input;
  const amountCents = parseUsd(input.amount);
  const message = input.message.trim().slice(0, 2000);
  const status: PledgeStatus = input.status === "promised" ? "promised" : "received";

  if (amountCents === null) {
    return { error: "Enter the amount, in dollars — like 850." };
  }
  if (!towards) return { error: "Say what the gift was towards." };

  let pledgeId: string;
  let slug: string | undefined;
  let towardsLabel: string;

  try {
    if (towards.startsWith("need:")) {
      const need = await getNeedById(towards.slice(5));
      if (!need) return { error: "That item no longer exists." };

      if (amountCents > need.ledger.openCents) {
        return {
          error: `Only ${usd(need.ledger.openCents)} of ${need.title} is unclaimed. Record that or less, or raise the item's cost first.`,
        };
      }

      const claim = await recordNeedPledge({
        needId: need.id,
        partnerId,
        amountCents,
        message,
      });

      if (!claim.ok) {
        return {
          error:
            claim.reason === "too-much"
              ? "That no longer fits against the item — reload the page for the balance."
              : "That item no longer exists. Nothing has been recorded.",
        };
      }

      pledgeId = claim.pledgeId;
      slug = need.slug;
      towardsLabel = need.title;
    } else {
      /*
        Not against a listed item: either an arm of the ministry, or words Simon
        types himself. The area is what lets the giver's dashboard show them the
        project rather than a line of text — see `listAreaGiftsForPartner`.
      */
      const area: NeedArea | null = towards.startsWith("area:")
        ? (areaOf(towards.slice(5)).id as NeedArea)
        : null;

      const designation = area
        ? areaOf(area).label
        : input.designation.trim().slice(0, 120);

      if (!designation) {
        return { error: "Say what the gift was towards." };
      }

      pledgeId = await recordGeneralPledge({
        partnerId,
        amountCents,
        designation,
        area,
        message,
      });
      towardsLabel = designation;
    }

    /*
      Written as 'pending' by both paths above and moved here, rather than
      inserted at its final status. It reuses the one function that knows to
      stamp received_at, which is the column every "given so far" figure on the
      site is filtered by — a row inserted straight to 'received' without it
      would count towards the totals and show no date on anybody's dashboard.
    */
    await setPledgeStatus(pledgeId, status);
  } catch (error) {
    console.error("Partners: could not record a gift.", error);
    return { error: "Could not record that gift." };
  }

  refreshLedger(slug);
  return {
    saved: true,
    message: `${usd(amountCents)} towards ${towardsLabel}, recorded as ${
      status === "received" ? "received" : "promised"
    }.`,
  };
}

/*
  The two buttons below leave the page to be reloaded by their caller rather
  than revalidating it here.

  Both change the shape of the card they sit on — un-verifying takes away the
  login badge and the Remove-login button with it, revoking takes away its own
  button — and refreshing a list from inside a control that the refresh deletes
  is what leaves this page's buttons spinning over work that is already done.
  The whole of /app is uncached, so a plain page load costs a single query and
  is the one refresh that cannot get this wrong.
*/
export async function setVerifiedAction(partnerId: string, verified: boolean) {
  await requireUser();
  await setPartnerVerified(partnerId, verified);
}

/**
 * Called with its arguments rather than a FormData, and driven by
 * `useTransition` rather than `useActionState`.
 *
 * Issuing a login puts a "Has a login" badge on the partner's card, and a
 * `useActionState` form that revalidates the page it is standing on while that
 * page's card grows a badge never settles — the password is set, the mail goes,
 * and the button reads "Saving…" until somebody reloads. The same shape is why
 * the two seed buttons on this page are plain transitions.
 */
export async function issueLoginAction(input: {
  partnerId: string;
  password: string;
  notify: boolean;
}) {
  await requireUser();

  const { partnerId, password } = input;

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

  /*
    Read back rather than trusted from the form: the address the mail goes to
    has to be the one on the row whose password was just changed, not one that
    arrived in the same POST. Otherwise a crafted request could have this send a
    working password for somebody else's account to an address of its choosing.
  */
  const partner = input.notify ? await getPartner(partnerId) : null;

  if (partner) {
    queue(
      partnerLoginIssued({
        name: partner.name,
        email: partner.email,
        contactName: partner.contactName,
        password,
      }),
    );
  }

  refresh();
  return {
    saved: true,
    message: partner
      ? `Sent to ${partner.email}. They can sign in at /partners with that address and password.`
      : "They can sign in at /partners with their email and that password.",
  };
}

export async function revokeLoginAction(partnerId: string) {
  await requireUser();

  /*
    Read before the revoke, not after — `revokePartnerLogin` clears the hash and
    a later read would still give us the row, but reading first keeps the two
    steps in the order a person would describe them and means a failure to load
    the partner stops the mail rather than the revoke.
  */
  const partner = await getPartner(partnerId);
  await revokePartnerLogin(partnerId);

  if (partner) {
    queue(
      partnerLoginRevoked({
        name: partner.name,
        email: partner.email,
        contactName: partner.contactName,
      }),
    );
  }
}

export async function updatePartnerAction(input: {
  partnerId: string;
  name: string;
  kind: string;
  location: string;
  contactName: string;
  note: string;
}) {
  await requireUser();

  const name = input.name.trim();
  if (!name) return { error: "A partner needs a name." };

  try {
    await updatePartnerDetails(input.partnerId, {
      name,
      kind: isPartnerKind(input.kind) ? input.kind : "church",
      location: input.location.trim(),
      contactName: input.contactName.trim(),
      note: input.note.trim(),
    });
  } catch (error) {
    console.error("Partners: could not save details.", error);
    return { error: "Could not save that." };
  }

  refresh();
  return { saved: true };
}
