/**
 * What people write to the ministry about.
 *
 * A subject line the sender picks from a short list rather than types is worth
 * the small loss of freedom: it means the notification's own subject says
 * "Website enquiry: A place at the academy" instead of "(no subject)", and a
 * full mailbox can be sorted by the thing being asked about.
 *
 * Its own file because the action beside it is a `"use server"` module, and
 * every export of one of those has to be an async function.
 */
export const CONTACT_SUBJECTS = [
  "Giving or partnership",
  "A place at the academy",
  "The Bible college",
  "Visiting the ministry",
  "Something else",
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export function isContactSubject(value: string): value is ContactSubject {
  return CONTACT_SUBJECTS.includes(value as ContactSubject);
}
