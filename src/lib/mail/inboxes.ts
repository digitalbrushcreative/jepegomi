/**
 * Where the ministry's mail lands.
 *
 * Everything the site sends inward goes to both addresses, and that is on
 * purpose rather than belt-and-braces. `support@jepegomi.org` is the address on
 * the site and the one that outlives whoever is answering it this year;
 * `jepegomi@gmail.com` is the one Simon actually has open on his phone. Sending
 * to only the first risks an enquiry sitting unread for a week; sending to only
 * the second means the ministry's enquiries live in one man's personal Gmail.
 *
 * Both are overridable from the environment so the address can change without a
 * deploy — and so a staging deployment can point them somewhere harmless.
 */

const SUPPORT = "support@jepegomi.org";
const PERSONAL = "jepegomi@gmail.com";

function list(value: string | undefined, fallback: string[]) {
  const addresses = (value ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  return addresses.length > 0 ? addresses : fallback;
}

/** Everyone who should see an enquiry from the site. */
export function inboxes() {
  return list(process.env.MAIL_TO, [SUPPORT, PERSONAL]);
}

/**
 * The address a member of the public is given, and the one they should reply
 * to. One address, not two — a person told to "write to either of these" writes
 * to neither.
 */
export function publicInbox() {
  return inboxes()[0];
}

/**
 * Who gets copied when the site sends something *outward* — a giver's receipt,
 * the account details somebody asked for. Copying the ministry means Simon has
 * the same thread the giver has, without having to trust that a "we sent it"
 * log is telling the truth.
 */
export function copyToMinistry() {
  return list(process.env.MAIL_COPY, [PERSONAL]);
}
