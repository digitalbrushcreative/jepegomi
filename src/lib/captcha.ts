import { callerKey } from "@/lib/rate-limit";
import { CAPTCHA_FIELD } from "@/lib/forms";

/**
 * reCAPTCHA v3, on the public forms.
 *
 * The honeypot and the clock in lib/forms.ts stop drive-by scripts, and for a
 * long time that was enough. It stopped being enough — the forms started
 * arriving filled in, which means somebody looked at the page once and wrote a
 * loop against it, and neither a hidden field nor a two-second timer has
 * anything to say about that. This does: v3 asks Google what it thinks of the
 * browser that submitted, and answers with a score between 0 and 1.
 *
 * Three things shape everything below.
 *
 * **It is off unless it is configured.** No keys, no calls to Google, and every
 * form behaves exactly as it did before this file existed. That keeps `npm run
 * dev` and the browser tests working without a Google account between them, and
 * it means a deployment that loses its keys degrades to the old traps rather
 * than refusing every visitor.
 *
 * **A score is an opinion, not a verdict.** Google is guessing, and it guesses
 * badly about people on shared connections, older phones, and anything using a
 * privacy browser — which describes a fair number of the people this site is
 * for. So the threshold is deliberately low, and the caller says how much a
 * wrong answer costs on its form (see `STRICT` and `LENIENT` below).
 *
 * **Google being down is not the visitor's fault.** If the verify call fails or
 * times out, the submission is allowed through on the older traps. The
 * alternative is a contact form that closes itself because a third party had a
 * bad minute, which is a worse failure than the one it would be preventing.
 */

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * The site key is public by design — it is in the page's HTML — and only the
 * secret is worth protecting. Both have to be present: a site key without a
 * secret means tokens are minted and never checked, which is worse than no
 * captcha at all, because it looks like one.
 */
export function isCaptchaConfigured() {
  return Boolean(
    process.env.RECAPTCHA_SECRET_KEY && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  );
}

/**
 * How suspicious a submission has to look before it is turned away, and what
 * happens when no token arrives at all.
 *
 * `required` is the interesting half. A token can only be minted by JavaScript,
 * so requiring one means turning away anybody browsing without it — for whom
 * these forms otherwise still work, because a server action degrades to a plain
 * POST. Whether that trade is worth making depends entirely on what the form
 * does when it is abused, which is different on each of them.
 */
export const STRICT = {
  /*
    The contact and enrolment forms. Both end in mail to a real inbox from the
    ministry's own sending domain, which is the thing being abused and the thing
    that pays for it, and both refuse in words with an address to write to
    instead — so a person wrongly turned away still has a way through. That is
    what makes requiring a token acceptable here and nowhere else.
  */
  required: true,
  floor: 0.5,
} as const;

export const LENIENT = {
  /*
    The giving forms and the partner code request. A token is checked when it
    arrives and never demanded, because the cost of being wrong here is not a
    message that can be sent again: it is a gift that was silently not recorded,
    or a partner who cannot get at their own dashboard. The floor is lower for
    the same reason — only a browser Google is confident about is refused, and
    the rate limits in lib/rate-limit.ts remain the real defence on these.
  */
  required: false,
  floor: 0.3,
} as const;

export type CaptchaPolicy = { required: boolean; floor: number };

/**
 * `ok: false` means "do not process this submission". The reason is for the
 * caller's wording, not for the visitor: `missing` is somebody without
 * JavaScript who needs to be told what to do instead, `refused` is a browser
 * Google scored badly and is answered like the honeypot — as though it worked.
 */
export type CaptchaVerdict = { ok: true } | { ok: false; reason: "missing" | "refused" };

/**
 * Check one submission.
 *
 * `action` must match the name the form minted its token under. It is what
 * stops a token being farmed from the loosest form on the site and spent on the
 * tightest one — Google returns the action it was created with, and a token
 * from the giving form arriving at the contact form is not a token, it is a
 * replay.
 */
export async function checkCaptcha(
  formData: FormData,
  action: string,
  policy: CaptchaPolicy,
): Promise<CaptchaVerdict> {
  if (!isCaptchaConfigured()) return { ok: true };

  const token = String(formData.get(CAPTCHA_FIELD) ?? "").trim();
  if (!token) return policy.required ? { ok: false, reason: "missing" } : { ok: true };

  /*
    A token is a URL-safe blob of a few hundred characters. Anything wildly
    longer is not one, and there is no reason to hand it to Google to be told
    so — this is a public endpoint and the body is whatever was posted.
  */
  if (token.length > 4_000) return { ok: false, reason: "refused" };

  const body = new URLSearchParams({
    secret: String(process.env.RECAPTCHA_SECRET_KEY),
    response: token,
  });

  /*
    Google scores better with the caller's address than without it, and this is
    the same value the rate limiter keys on. Omitted rather than sent as the
    string "unknown" when there is nothing to send.
  */
  const caller = await callerKey();
  if (caller && caller !== "unknown") body.set("remoteip", caller);

  let result: {
    success?: boolean;
    score?: number;
    action?: string;
    "error-codes"?: string[];
  };

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      /*
        The same ceiling the mail provider gets, for the same reason: a hung
        third party must not hold a serverless invocation open until the
        platform kills it. Five rather than ten, because a person is waiting
        with a form in front of them while this runs.
      */
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`${response.status}`);
    result = await response.json();
  } catch (error) {
    /*
      Unreachable, slow, or answering with something that is not JSON. Logged
      loudly, because a captcha that has quietly stopped checking anything is
      exactly the failure nobody notices — and let through, because see the
      note at the top of this file.
    */
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[captcha:${action}] could not verify, allowing through: ${reason}`);
    return { ok: true };
  }

  if (!result.success) {
    /*
      An expired token is the common one by far — v3 tokens last two minutes,
      and somebody who opened the form, was interrupted, and came back to press
      send has one. They are not a bot and must not be silently swallowed, so
      this is answered as `missing`: the wording that tells them to try again.
    */
    const codes = result["error-codes"] ?? [];
    if (codes.includes("timeout-or-duplicate")) return { ok: false, reason: "missing" };

    console.warn(`[captcha:${action}] rejected: ${codes.join(", ") || "no reason given"}`);
    return { ok: false, reason: "refused" };
  }

  if (result.action !== action) {
    console.warn(`[captcha:${action}] token was minted for "${result.action}"`);
    return { ok: false, reason: "refused" };
  }

  const score = typeof result.score === "number" ? result.score : 1;
  if (score < policy.floor) return { ok: false, reason: "refused" };

  return { ok: true };
}
