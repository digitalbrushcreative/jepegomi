/**
 * The bits every public form needs before it is allowed to send an email.
 *
 * A server action is a public endpoint whether or not there is a form in front
 * of it, and three of these actions end in "…and then mail Simon". That makes
 * them worth a moment's thought: an open form that emails a real person is a
 * free relay for anybody who finds it, and the ministry's sending reputation —
 * shared with every other message it sends — is what pays for the abuse.
 */

/** A form field, trimmed and length-capped so a 5MB "name" cannot reach a mailbox. */
export function text(formData: FormData, name: string, max = 200) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);
}

/**
 * Good enough to catch a typo, deliberately not a full RFC 5322 parser. The
 * only real test of an address is whether mail to it arrives, and the reply
 * these forms promise is that test.
 */
export function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

/**
 * The honeypot field's name. It is rendered hidden, so a person never sees it
 * and a bot filling every input it finds does. Nothing is announced to the
 * sender when it trips — a bot that is told it failed is a bot that tries again
 * without the field.
 */
export const TRAP = "website";

/**
 * Where the reCAPTCHA token rides in. It lives here rather than in lib/captcha.ts
 * so that `SpamTraps` — a client component — can name the field without pulling
 * the verifying half of the code, and the secret key it reads, into the browser
 * bundle. See lib/captcha.ts for what is done with what arrives.
 */
export const CAPTCHA_FIELD = "captchaToken";

/**
 * The question a person answers before the contact and enrolment forms send.
 *
 * Neither the honeypot nor the clock had anything to say about the spam that
 * kept arriving — sales pitches posted straight at the action by a script that
 * knew which fields were real. A question it was never written to answer is a
 * field it does not send, and the server refuses a submission without it.
 *
 * It is deliberately easy, and deliberately fixed. Easy, because the people
 * writing in include parents on old phones and grandparents on a shared
 * computer. Fixed, because varying it needs state kept between the page and the
 * action, and the scripts this stops are not reading the question at all.
 */
export const CHECK_FIELD = "check";
export const CHECK_QUESTION = "To show you are a person: what is three plus four?";
const CHECK_ANSWERS = ["7", "seven"];

/**
 * `missing` is a submission that never had the field — a script, since the
 * browser will not send the form with it blank — and is answered like the
 * honeypot. `wrong` is most likely a person who mistyped, and is told so.
 */
export function humanCheck(formData: FormData): "right" | "wrong" | "missing" {
  const answer = text(formData, CHECK_FIELD, 20).toLowerCase().replace(/[.!\s]+$/, "");
  if (!answer) return "missing";
  return CHECK_ANSWERS.includes(answer) ? "right" : "wrong";
}

/**
 * Whether any of these values carries U+FFFD, the character a decoder puts in
 * place of bytes that were not valid UTF-8. A browser always posts a form as
 * well-formed UTF-8, so it cannot arrive from a person typing into the page —
 * it is the fingerprint of a script that mangled its own emoji on the way in,
 * which is exactly what the spam that prompted this looked like.
 */
export function hasGarbledText(...values: string[]) {
  return values.some((value) => value.includes("�"));
}

/**
 * Whether a submission looks automated.
 *
 * Two cheap signals, both of which a real submission passes without noticing:
 * the hidden field is empty, and the form was on screen for more than a couple
 * of seconds. Neither stops a determined attacker — nothing this side of a
 * captcha does — but together they stop the drive-by scripts that are the
 * entire problem in practice, and they cost a visitor nothing: no puzzle, no
 * third-party script, no cookie.
 *
 * `timing` exists because the two signals are not equally safe. A person cannot
 * fill in a field they cannot see, so the honeypot's false-positive rate is
 * effectively zero. The clock's is not: a browser autofilling every box and a
 * decisive click can clear two seconds, and a returning giver on a fast
 * connection is exactly the person most likely to manage it.
 *
 * So the caller chooses, based on what a wrong answer costs. On the contact and
 * enrolment forms a false positive costs one message that can be sent again —
 * keep both. On the giving form it costs a gift that was silently never
 * recorded, with a thank-you on screen saying it was. There, the clock is not
 * worth it; see `giveAction`.
 */
export function looksAutomated(
  formData: FormData,
  { timing = true }: { timing?: boolean } = {},
) {
  if (text(formData, TRAP) !== "") return true;
  if (!timing) return false;

  /*
    Absent or unparseable means "no timing signal", and is explicitly NOT taken
    as evidence of a bot. `SpamTraps` stamps this in an effect, so it is empty
    for anybody submitting without JavaScript — for whom these forms still work,
    because a server action degrades to a plain POST. Reading a blank field as
    automated would silently swallow their message and thank them for it.

    That leaves the clock catching only submissions that ran the page's own
    JavaScript and then went too fast. It is the weaker of the two traps by
    some way, which is why the honeypot above is the one that runs everywhere.
  */
  const openedAt = Number(formData.get("openedAt"));
  if (!Number.isFinite(openedAt) || openedAt <= 0) return false;

  return Date.now() - openedAt < 2_000;
}
