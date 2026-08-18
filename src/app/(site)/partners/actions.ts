"use server";

import { redirect } from "next/navigation";
import { enterWithCode, leave, requestCode as codeForAddress } from "@/lib/door";
import { partnerSignInCode, queue, supporterSignInCode } from "@/lib/mail";
import { CODE_LIFETIME } from "@/lib/partner-codes";
import { signInPartner } from "@/lib/partners";
import {
  RATES,
  callerKey,
  consume,
  forget,
  retryWording,
} from "@/lib/rate-limit";

/**
 * The doors into the partner area.
 *
 * Two of them, and one rule runs through both: **nothing said here may reveal
 * whether an address gives to this ministry.** A stranger with a list of church
 * addresses must not be able to use this page to find out which of them are on
 * it. That is not a hypothetical — the list is the one fact the whole partner
 * area exists to keep private, and it is worth more to somebody than any single
 * church's totals.
 *
 * So every failure below says the same thing as every other failure, and the
 * code request says the same thing as a success. It costs a little clarity for
 * the one person in fifty who mistyped their address, and the alternative costs
 * everybody.
 *
 * The code door now keeps that rule properly rather than nearly. It used to
 * *say* the same sentence either way while sending an email only to addresses
 * that give, so anybody who could watch an inbox could still tell — the promise
 * was kept in the words and broken in the traffic. Every address gets a code
 * now, because there is somewhere for a stranger to be let into: the figures.
 * See lib/door.ts, which decides which of the two rooms an address opens, and
 * lib/supporters.ts for what the smaller one is.
 */

/* ---------------------------------------------------------- the code door */

export type CodeSignInState =
  | { step: "email"; error?: string }
  | { step: "code"; email: string; error?: string }
  | undefined;

/**
 * Both steps, behind one action.
 *
 * One `useActionState` and one state machine, rather than a form per step with
 * a state each: the second step needs the address the first one accepted, and
 * threading that between two independent hooks is how a resend ends up sending
 * to an address the person has since edited. The step is submitted rather than
 * inferred from which fields arrived, so a form posted by hand cannot pick the
 * branch by leaving a field out.
 */
export async function codeSignInAction(
  _prev: CodeSignInState,
  formData: FormData,
): Promise<CodeSignInState> {
  return String(formData.get("step") ?? "") === "code"
    ? signInWithCode(formData)
    : requestCode(formData);
}

async function requestCode(formData: FormData): Promise<CodeSignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { step: "email", error: "Enter the email address you gave with." };
  }

  const byEmail = await consume(`code:${email}`, RATES.codeRequest);
  const byCaller = await consume(
    `code:ip:${await callerKey()}`,
    RATES.codeRequestByIp,
  );

  if (!byEmail.ok || !byCaller.ok) {
    const wait = Math.max(byEmail.retryAfterSeconds, byCaller.retryAfterSeconds);
    return {
      step: "email",
      error: `A code has been sent to that address already. Check your junk folder, or try again ${retryWording(wait)}.`,
    };
  }

  try {
    const arrival = await codeForAddress(email);

    /*
      `queue`, not `send`: the message goes out after the response has already
      left, so the page moves on at the speed of a database write. It also means
      the reply takes the same time whichever message it was, which is the timing
      half of saying the same sentence either way.
    */
    if (arrival.kind === "partner") {
      /*
        The code goes to the address that asked for it, which is not always the
        partner's own — Simon can add a treasurer or a missions pastor to a
        church's giving, and they sign in here like anybody else. See
        lib/partner-readers.ts. What the message says changes with that; who it
        is addressed to is the part that must not be got wrong.
      */
      const { partner, reader } = arrival.at;
      const to = reader
        ? { name: reader.name, email: reader.email }
        : { name: partner.contactName, email: partner.email };

      queue(
        partnerSignInCode({
          partnerName: partner.name,
          to,
          onBehalf: Boolean(reader),
          code: arrival.code,
          lifetime: CODE_LIFETIME,
        }),
      );
    } else {
      /*
        A different message for somebody with no giving behind their name, not a
        branch inside the partner one: it is the first thing this ministry ever
        says to them, and "here is everything your church has given" would be
        addressed to a church that does not exist. See mail/messages.ts.
      */
      queue(
        supporterSignInCode({
          email: arrival.supporter.email,
          code: arrival.code,
          lifetime: CODE_LIFETIME,
        }),
      );
    }
  } catch (error) {
    /*
      Logged, and then answered exactly as a success would be. A visible
      difference here — "something went wrong" for an address we hold and the
      calm sentence for one we do not — is the enumeration this whole file is
      written to avoid, handed over by an error path.
    */
    console.error("Partners: could not issue a sign-in code.", error);
  }

  return { step: "code", email };
}

async function signInWithCode(formData: FormData): Promise<CodeSignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();

  // Lost the address somehow — send them back to the first step rather than
  // failing at a code that could never match anything.
  if (!email) return { step: "email", error: "Enter your email address." };

  if (!code) {
    return { step: "code", email, error: "Enter the code from your email." };
  }

  let ok = false;
  try {
    ok = await enterWithCode(email, code);
  } catch (error) {
    console.error("Partners: code sign-in failed.", error);
    return {
      step: "code",
      email,
      error: "We could not sign you in just now. Try again shortly.",
    };
  }

  if (!ok) {
    /*
      One message for every way of getting here: wrong digits, a code that has
      expired, one already spent, one burned by five wrong guesses, and one
      issued against an answer that has since changed — a reader Simon moved, or
      a supporter who has given in the meantime and is a partner now. The tries
      are counted on the code's own row — see lib/partner-codes.ts — so there is
      nothing to gain by being specific about which of those it was.
    */
    return {
      step: "code",
      email,
      error:
        "That code is not right, or it has expired. Ask for a new one and we will send it.",
    };
  }

  /*
    Everybody lands on the dashboard, including a supporter who has never given
    a penny — that page is where it is explained what their sign-in did and did
    not do, and dropping them back on the door they just came through would read
    as a sign-in that failed. See partners/dashboard/page.tsx.
  */
  redirect("/partners/dashboard");
}

/* ------------------------------------------------------- the password door */

export type PartnerLoginState = { error?: string } | undefined;

export async function partnerSignInAction(
  _prev: PartnerLoginState,
  formData: FormData,
): Promise<PartnerLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  /*
    Counted before the password is checked, and counted on every attempt rather
    than only the failures — a success clears the counter on its way out, so a
    church that knows its password never sees this and an attacker guessing at
    one gets eight tries a quarter of an hour.

    Two counters, because they catch different attacks. The address catches
    somebody working through a dictionary at one church; the caller catches
    somebody working through a list of churches. Either one refusing is enough.
  */
  const emailKey = `signin:partner:${email}`;
  const attempt = await consume(emailKey, RATES.signIn);
  const byCaller = await consume(
    `signin:partner:ip:${await callerKey()}`,
    RATES.signInByIp,
  );

  if (!attempt.ok || !byCaller.ok) {
    const wait = Math.max(attempt.retryAfterSeconds, byCaller.retryAfterSeconds);
    return {
      error: `Too many sign-in attempts. Try again ${retryWording(wait)}, or write to us and we will help.`,
    };
  }

  let ok = false;
  try {
    ok = await signInPartner(email, password);
  } catch (error) {
    console.error("Partners: sign-in failed.", error);
    return { error: "We could not sign you in just now. Try again shortly." };
  }

  if (ok) await forget(emailKey);

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
        "That email and password don't match an account here. If you have not been given a password, go back and sign in with a code instead.",
    };
  }

  redirect("/partners/dashboard");
}

export async function partnerSignOutAction() {
  await leave();
  redirect("/partners");
}
