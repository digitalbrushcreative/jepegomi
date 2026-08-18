import {
  type PartnerAtDoor,
  currentPartnerView,
  partnerAtDoor,
  signOutPartner,
  startPartnerSession,
} from "@/lib/partners";
import { claimCode, issueCode } from "@/lib/partner-codes";
import {
  type Supporter,
  currentSupporter,
  findOrCreateSupporter,
  signInSupporter,
  signOutSupporter,
} from "@/lib/supporters";

/**
 * The one door into the site, and the two rooms behind it.
 *
 * Until the figures moved behind a sign-in there was only one kind of person
 * who signed in here — a partner, reading their own giving — and lib/partners.ts
 * owned the whole of it. There are two now, and they want opposite things:
 *
 *   a partner    has given, and comes back to read what their money did. The
 *                ledger already knows their address. See lib/partners.ts.
 *   a supporter  has given nothing, and wants to know what a thing costs before
 *                deciding whether to. See lib/supporters.ts.
 *
 * This file exists so that neither of those modules has to know about the other.
 * partners.ts stays a file about the ledger; supporters.ts stays a file about
 * an address somebody proved. What is shared between them — one form, one code,
 * one inbox to check — is shared here and nowhere else.
 *
 * ## Why one door and not two
 *
 * A second form would have to be labelled, and there is no label a visitor could
 * answer. "Are you a partner?" is a question about a database they cannot see:
 * a church that gave once through PayPal two years ago has no idea whether that
 * makes them a partner, and a person who *is* in the ledger under an address
 * they have forgotten would pick the wrong door and be told, correctly and
 * uselessly, that nothing is filed under them.
 *
 * So the visitor types an address and the site works out which of the two they
 * are, because the site is the one that knows. The partner table is asked first
 * and its answer is final — an address that gives is a partner and is never
 * demoted to a supporter, even for a moment, because the demoted version reads
 * strictly less and the difference is their own giving.
 *
 * ## What this quietly fixed
 *
 * The old door had a rule running through it that every failure must say the
 * same sentence as every success, so that a stranger with a list of church
 * addresses could not use the form to find out which of them give here. It was
 * carefully done and it had one hole nothing in the code could close: an
 * address that gives received an email and an address that did not received
 * nothing, so anybody who could watch an inbox could still tell the difference.
 *
 * Every address gets a code now. The two answers become distinguishable only
 * *after* somebody has proved they can read the inbox — which is to say, only to
 * the person whose address it is. The enumeration is closed by the feature
 * rather than by a promise, which is the only way these things ever really close.
 */

export type Arrival =
  | { kind: "partner"; at: PartnerAtDoor; code: string }
  | { kind: "supporter"; supporter: Supporter; code: string };

/**
 * Issues a code for an address, whoever it turns out to belong to.
 *
 * Never returns null. That is the change: `issueSignInCode` in lib/partners.ts
 * hands back null for an address it has no giving against, and the caller had to
 * silently send nothing while claiming it had sent something. There is always
 * somebody to send to now, so the sentence the page prints is true.
 */
export async function requestCode(email: string): Promise<Arrival> {
  const address = email.trim().toLowerCase();

  const at = await partnerAtDoor(address);
  if (at) {
    return {
      kind: "partner",
      at,
      code: await issueCode(address, { kind: "partner", id: at.partner.id }),
    };
  }

  const supporter = await findOrCreateSupporter(address);
  return {
    kind: "supporter",
    supporter,
    code: await issueCode(address, { kind: "supporter", id: supporter.id }),
  };
}

/**
 * Spends a code and starts whichever session it opens.
 *
 * Who the address belongs to is worked out again here rather than trusted from
 * the code row, for the reason `signInPartnerWithCode` gives: between the code
 * being sent and being typed, the answer may have changed. Two changes matter
 * and both are handled by asking again.
 *
 * A reader Simon has moved off a church resolves differently, and `claimCode`
 * misses — the code was issued against an answer that is no longer true.
 *
 * A supporter who gave in the meantime now resolves as a *partner*, so the
 * supporter's code misses on its kind. They ask for another one and arrive at
 * their own dashboard instead of at the figures, which is the better room and
 * the one they have just earned.
 */
export async function enterWithCode(email: string, code: string) {
  const address = email.trim().toLowerCase();

  const at = await partnerAtDoor(address);
  if (at) {
    if (!(await claimCode(address, { kind: "partner", id: at.partner.id }, code))) {
      return false;
    }
    await startPartnerSession(at);
    return true;
  }

  /*
    Found rather than created. A code cannot be spent for an address that never
    asked for one, and asking is what writes the row — so a missing row here is
    somebody typing digits at a door they never knocked on.
  */
  const supporter = await findOrCreateSupporter(address);
  if (!(await claimCode(address, { kind: "supporter", id: supporter.id }, code))) {
    return false;
  }

  await signInSupporter(supporter.id);
  return true;
}

/**
 * Clears whichever session is held.
 *
 * Both, unconditionally, rather than the one we think is there. The two cookies
 * are independent and a browser can hold both — a treasurer who read the
 * figures as a supporter in March and signed in as a partner in April has two,
 * and a sign-out that left one of them standing would look exactly like a
 * sign-out that did not work.
 */
export async function leave() {
  await signOutPartner();
  await signOutSupporter();
}

/**
 * Who is in front of us, if anybody.
 *
 * The partner session wins when both are held, for the same reason the partner
 * table is asked first at the door: it is the larger of the two and reads
 * strictly more.
 */
export type Viewer =
  | { kind: "partner"; name: string; email: string; onBehalfOf: string | null }
  | { kind: "supporter"; name: string; email: string };

export async function currentViewer(): Promise<Viewer | null> {
  const view = await currentPartnerView();
  if (view) {
    return {
      kind: "partner",
      name: view.partner.name,
      email: view.reader?.email ?? view.partner.email,
      onBehalfOf: view.reader ? view.partner.name : null,
    };
  }

  const supporter = await currentSupporter();
  if (supporter) {
    return {
      kind: "supporter",
      /*
        The name is the address's local part, because nobody ever asked them for
        a name. The door takes an address and a code and nothing else, and adding
        a name box to it would be asking a stranger to fill in a form to find out
        a price — which is most of what this gate was built to keep short.
      */
      name: supporter.email.split("@")[0] ?? supporter.email,
      email: supporter.email,
    };
  }

  return null;
}
