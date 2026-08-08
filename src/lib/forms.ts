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
