import { site } from "@/lib/site";
import { copyToMinistry, inboxes, publicInbox } from "./inboxes";
import { type Message, named, oneLine } from "./send";
import {
  button,
  escape,
  facts,
  lead,
  p,
  panel,
  quote,
  renderEmail,
  rule,
  signoff,
  textFooter,
} from "./template";


/**
 * Every email the site sends, in one file.
 *
 * They are written here rather than beside the actions that trigger them for
 * one reason: an email is the ministry speaking, and the ministry should sound
 * like one thing. When the wording of the giving receipt and the wording of the
 * contact reply sit forty lines apart, somebody notices that one of them says
 * "we'll be in touch shortly" and the other promises a reply "within a day or
 * two", and fixes both.
 *
 * The pairs matter as much as the messages. Almost everything the site does
 * sends two: one *inward*, so Simon knows, and one *outward*, so the person who
 * filled in the form knows they were heard. A form that emails only the
 * ministry looks broken to the person who used it.
 */

const nothing = "—";

/* ------------------------------------------------------------------ contact */

export type ContactEnquiry = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function contactNotification(enquiry: ContactEnquiry): Message {
  const heading = `${enquiry.name} wrote in`;

  return {
    to: inboxes(),
    /*
      Reply-To, not From. The message leaves as noreply@jepegomi.org because
      that is the domain we have signed with DKIM — putting the sender's own
      address in From would be forgery as far as their provider is concerned,
      and gets us binned. This way "Reply" in any mail client still goes
      straight back to the person who wrote in.
    */
    replyTo: named(enquiry.name, enquiry.email),
    subject: oneLine(`Website enquiry: ${enquiry.subject}`),
    tag: "contact-notification",
    html: renderEmail({
      preheader: `${enquiry.name} — ${enquiry.subject}`,
      eyebrow: "From the website",
      heading,
      body:
        facts([
          ["Name", escape(enquiry.name)],
          [
            "Email",
            `<a href="mailto:${escape(enquiry.email)}" style="color:#7a1b5c;">${escape(enquiry.email)}</a>`,
          ],
          ["About", escape(enquiry.subject)],
        ]) +
        quote(enquiry.message) +
        p("Replying to this email goes straight back to them.", { small: true, muted: true }),
      footerNote: "Sent by the contact form on the website.",
    }),
    text: `${heading}\n\nName:  ${enquiry.name}\nEmail: ${enquiry.email}\nAbout: ${enquiry.subject}\n\n${enquiry.message}\n\nReplying to this email goes straight back to them.\n${textFooter()}`,
  };
}

export function contactAcknowledgement(enquiry: ContactEnquiry): Message {
  const heading = "Thank you — we have your message";

  return {
    to: [named(enquiry.name, enquiry.email)],
    replyTo: publicInbox(),
    subject: "We have your message — Jepegomi",
    tag: "contact-acknowledgement",
    html: renderEmail({
      preheader: `${site.leaders} will reply to you personally.`,
      eyebrow: "Jesus People Gospel Ministries",
      heading,
      body:
        lead(`Dear ${escape(enquiry.name)},`) +
        p(
          `Thank you for writing to us. Your message has reached ${escape(site.leaders)} in ${escape(site.location)}, and one of us will reply to you personally — usually within a day or two.`,
        ) +
        p("This is what you sent, so you have a copy:") +
        quote(enquiry.message) +
        rule() +
        p(
          "In the meantime, you are very welcome to look around the site — the school, the church, the feeding programme and the kitchen it cooks in are all there.",
          { small: true, muted: true },
        ) +
        button(site.url, "Visit jepegomi.org") +
        signoff(),
      footerNote: `You are getting this because someone used your address on the contact form at ${escape(site.domain)}. If that was not you, you can safely ignore it.`,
    }),
    text: `Dear ${enquiry.name},

Thank you for writing to us. Your message has reached ${site.leaders} in ${site.location}, and one of us will reply to you personally — usually within a day or two.

This is what you sent, so you have a copy:

  ${enquiry.message.replace(/\n/g, "\n  ")}

${site.leaders}
${site.longName}
${textFooter()}`,
  };
}

/* ------------------------------------------------------------- giving details */

/**
 * The account details, sent on request.
 *
 * They live in `GIVING_ACCOUNT_DETAILS` in the deployment environment — not in
 * this repository, and not in the CMS. That is the same rule lib/site.ts sets
 * out, kept: a published account number is a standing invitation to whoever
 * wants to impersonate the ministry, and a number in a CMS text box can be
 * quietly edited by anyone who gets into /app with nothing on the page to say
 * it changed. An environment variable can only be changed by someone holding
 * the hosting login, and changing it is a deliberate, logged act.
 *
 * If it is unset the email still goes — it just says Simon will reply himself,
 * which is what happened before this form existed. It must never send a blank
 * where a bank account should be.
 */
function accountDetails() {
  return (process.env.GIVING_ACCOUNT_DETAILS ?? "").trim();
}

export function givingDetails({ email }: { email: string }): Message {
  const details = accountDetails();
  const heading = "How to give to Jepegomi";

  const known =
    panel(
      `<div style="font-family:Georgia,'Times New Roman',Times,serif;font-size:16px;line-height:26px;color:#2a1c24;">${escape(details).replace(/\n/g, "<br />")}</div><div style="height:16px;"></div>`,
      { tone: "green" },
    ) +
    p(
      `Please send us a note when you have given, so we can thank you properly and tell you what your gift did. Write to <a href="mailto:${escape(publicInbox())}" style="color:#7a1b5c;">${escape(publicInbox())}</a>.`,
    );

  const unknown =
    panel(
      p(
        `${escape(site.leaders)} will reply to this address with the right account for wherever you are giving from — usually within a day or two.`,
      ),
      { tone: "marigold" },
    ) +
    p(
      "We keep this step by hand on purpose. Giving from Kenya, from the United States and from Europe each go a different way, and we would rather send you the one that works than publish a list and let you guess.",
      { small: true, muted: true },
    );

  return {
    to: [email],
    /*
      Copied to the ministry so Simon has the same thread the giver has. Without
      it he finds out that somebody is about to send money only when it arrives.
    */
    cc: copyToMinistry(),
    replyTo: publicInbox(),
    subject: "Giving to Jepegomi — the details you asked for",
    tag: "giving-details",
    html: renderEmail({
      preheader: details
        ? "The account details for giving to the ministry."
        : `${site.leaders} will reply with the right account for wherever you are giving from.`,
      eyebrow: "You asked for our details",
      heading,
      body:
        lead(
          "Thank you for wanting to give. Everything that comes to the ministry goes to the same three things: feeding the children, teaching them, and the church that holds it all together.",
        ) +
        (details ? known : unknown) +
        rule() +
        p(
          `If you would rather give towards one particular thing — a term of a teacher's pay, the kitchen, a water tank — the needs are costed and listed at <a href="${escape(site.url)}/needs" style="color:#7a1b5c;">${escape(site.domain)}/needs</a>, and you can take part of one.`,
          { small: true, muted: true },
        ) +
        button(`${site.url}/needs`, "See what is needed", "green") +
        signoff(),
      footerNote: `You are getting this because this address was entered on the giving page at ${escape(site.domain)}. If that was not you, ignore it — nothing has been set up and no money is owed.`,
    }),
    text: `${heading}

Thank you for wanting to give. Everything that comes to the ministry goes to the same three things: feeding the children, teaching them, and the church that holds it all together.

${
  details
    ? `${details}\n\nPlease send us a note when you have given, so we can thank you properly and tell you what your gift did: ${publicInbox()}`
    : `${site.leaders} will reply to this address with the right account for wherever you are giving from — usually within a day or two.\n\nWe keep this step by hand on purpose. Giving from Kenya, from the United States and from Europe each go a different way, and we would rather send you the one that works than publish a list and let you guess.`
}

If you would rather give towards one particular thing, the needs are costed and
listed at ${site.url}/needs, and you can take part of one.

${site.leaders}
${site.longName}
${textFooter()}`,
  };
}

/* -------------------------------------------------------------------- giving */

/**
 * One gift, in whichever of the two shapes the giving form allows.
 *
 * A giver either takes part of a costed item off the list, or says in their own
 * words what they want to support. `needUrl` and `remaining` are what tell the
 * two apart — a listed item has a page to link to and a balance that has just
 * moved, and a free-form gift has neither. Everything else about the two is the
 * same, which is exactly why they share these messages rather than getting a
 * near-identical pair each.
 */
export type GiftDetails = {
  /** Already formatted — "$250.00". The ledger's own words, not a second format. */
  amount: string;
  /** The item's title, or the giver's own description of what it is for. */
  towards: string;
  /** The item's page. Absent when the gift was not against a listed item. */
  needUrl?: string;
  /** What is left open on that item after this gift. Absent for the same reason. */
  remaining?: string;
  partnerName: string;
  partnerEmail: string;
  partnerKind: string;
  location: string;
  contactName: string;
  message: string;
  /**
   * Set when the money has already arrived through Pesapal, and absent when the
   * gift is a promise still to be sent by hand.
   *
   * It changes both of these emails more than its size suggests, which is why
   * it is one flag rather than a second pair of messages. A promise needs
   * account details and a paid gift must never be sent them; a promise is
   * "nothing has been charged" in the footer and a paid gift is a card
   * statement somebody may query. Two templates that agreed about the ministry
   * and disagreed about that would be worse than one that branches twice.
   */
  paid?: {
    /** "MPESA", "Visa" — Pesapal's own word for how it arrived. */
    method: string;
    /** The provider's reference, which is what a giver quotes if they query it. */
    confirmationCode: string;
    /** What was actually taken — "KES 32,375" — which is not always the amount. */
    charged: string;
  };
};

export function giftNotification(gift: GiftDetails): Message {
  const { paid } = gift;
  const heading = paid
    ? `${gift.partnerName} has given ${gift.amount}`
    : `${gift.partnerName} has promised ${gift.amount}`;
  const towards = gift.needUrl
    ? `<a href="${escape(gift.needUrl)}" style="color:#7a1b5c;">${escape(gift.towards)}</a>`
    : escape(gift.towards);

  /*
    The one thing Simon has to know at a glance, and it is different in the two
    cases: a promise is a job — write back with the account details — and a paid
    gift is emphatically not one. Getting this the wrong way round means either
    a giver waiting on an email nobody owes them, or somebody being sent bank
    details for money they have already paid.
  */
  const standing = paid
    ? panel(
        p(
          `The money has already arrived through Pesapal, and the ledger has marked it received — there is nothing to send them. Replying to this email goes straight back to them if you would like to say thank you.`,
        ),
        { tone: "green" },
      )
    : panel(
        p(
          "They are waiting on you for the account details — the site does not publish them. Replying to this email goes straight back to them.",
        ),
        { tone: "marigold" },
      );

  return {
    to: inboxes(),
    replyTo: named(gift.partnerName, gift.partnerEmail),
    subject: oneLine(
      paid
        ? `${gift.amount} received — ${gift.towards}`
        : `${gift.amount} promised — ${gift.towards}`,
    ),
    tag: paid ? "gift-paid-notification" : "gift-notification",
    html: renderEmail({
      preheader: gift.remaining
        ? `${gift.amount} towards ${gift.towards}. ${gift.remaining} still open.`
        : `${gift.amount} towards ${gift.towards}.`,
      eyebrow: paid ? "A gift, paid" : gift.needUrl ? "A new claim" : "A new gift",
      heading,
      body:
        facts([
          ["Towards", towards],
          ["Amount", escape(gift.amount)],
          ["Still open on this item", escape(gift.remaining ?? "")],
          ["Paid", paid ? escape(`${paid.charged} · ${paid.method}`) : ""],
          ["Confirmation", paid ? escape(paid.confirmationCode) : ""],
          ["From", escape([gift.partnerName, gift.location].filter(Boolean).join(" · "))],
          ["Contact", escape(gift.contactName || nothing)],
          [
            "Email",
            `<a href="mailto:${escape(gift.partnerEmail)}" style="color:#7a1b5c;">${escape(gift.partnerEmail)}</a>`,
          ],
          ["Kind", escape(gift.partnerKind)],
        ]) +
        (gift.message ? quote(gift.message) : "") +
        standing +
        button(`${site.url}/app/needs`, "Open the ledger"),
      footerNote: paid
        ? "Sent when somebody pays a gift on the website."
        : "Sent when somebody promises a gift on the website.",
    }),
    text: `${heading}

Towards:  ${gift.towards}${gift.needUrl ? `  (${gift.needUrl})` : ""}
Amount:   ${gift.amount}${gift.remaining ? `\nStill open on this item: ${gift.remaining}` : ""}${paid ? `\nPaid:     ${paid.charged} · ${paid.method}\nConfirmation: ${paid.confirmationCode}` : ""}
From:     ${[gift.partnerName, gift.location].filter(Boolean).join(" · ")}
Contact:  ${gift.contactName || nothing}
Email:    ${gift.partnerEmail}
Kind:     ${gift.partnerKind}
${gift.message ? `\nTheir message:\n\n  ${gift.message.replace(/\n/g, "\n  ")}\n` : ""}
${
  paid
    ? `The money has already arrived through Pesapal, and the ledger has marked it\nreceived — there is nothing to send them. Replying to this email goes straight\nback to them if you would like to say thank you.`
    : `They are waiting on you for the account details — the site does not publish\nthem. Replying to this email goes straight back to them.`
}

The ledger: ${site.url}/app/needs
${textFooter()}`,
  };
}

export function giftReceipt(gift: GiftDetails): Message {
  const { paid } = gift;
  const details = accountDetails();
  const heading = `Thank you — ${gift.amount} towards ${gift.towards}`;

  /*
    Only a listed item can promise that nobody else will be asked for the same
    money, because only a listed item has a balance. Saying it of a free-form
    gift would be a promise about a ledger entry that does not exist.

    A paid gift says "received" where a promise says "promised", and the
    difference is not cosmetic: the sentence a giver reads here is the sentence
    they will check the website against.
  */
  const opening = paid
    ? gift.remaining
      ? `Your gift has arrived and now shows as received on the website. The balance — ${escape(gift.remaining)} — stays open for somebody else to pick up.`
      : "Your gift has arrived, it is written down against your name, and Pastor Simon will make sure it goes where you have asked."
    : gift.remaining
      ? `That amount now shows as promised on the website, so nobody else will be asked for it. The balance — ${escape(gift.remaining)} — stays open for somebody else to pick up.`
      : "That is written down against your name, and Pastor Simon will make sure it goes where you have asked.";

  /*
    A paid gift is never sent account details. That is the whole point of the
    branch — a receipt that thanks somebody for money already taken and then
    tells them where to send it is the one mistake in this file that would
    actually cost the ministry a second payment.
  */
  const sending = paid
    ? p("This is what was taken, for your records:") +
      panel(
        `<div style="font-family:Georgia,'Times New Roman',Times,serif;font-size:16px;line-height:26px;color:#2a1c24;">${escape(
          `${paid.charged} · ${paid.method}${paid.confirmationCode ? `\nConfirmation ${paid.confirmationCode}` : ""}`,
        ).replace(/\n/g, "<br />")}</div><div style="height:16px;"></div>`,
        { tone: "green" },
      )
    : details
      ? p("These are the details for sending it:") +
        panel(
          `<div style="font-family:Georgia,'Times New Roman',Times,serif;font-size:16px;line-height:26px;color:#2a1c24;">${escape(details).replace(/\n/g, "<br />")}</div><div style="height:16px;"></div>`,
          { tone: "green" },
        )
      : p(
          `We do not publish bank or M-Pesa details on the site. ${escape(site.leaders)} will reply to this address with the right account for wherever you are giving from — usually within a day or two.`,
        );

  const following = paid
    ? "You will be able to follow what it paid for — including photographs — as the work goes on."
    : "Once the gift arrives it is marked received on the site, and you will be able to follow what it paid for — including photographs — as the work goes on.";

  return {
    to: [named(gift.partnerName, gift.partnerEmail)],
    cc: copyToMinistry(),
    replyTo: publicInbox(),
    subject: oneLine(`Thank you — ${gift.amount} towards ${gift.towards}`),
    tag: paid ? "gift-paid-receipt" : "gift-receipt",
    html: renderEmail({
      preheader: paid
        ? `${gift.amount} received towards ${gift.towards}. Thank you.`
        : gift.remaining
          ? `${gift.amount} now shows as promised, so nobody else will be asked for it.`
          : `${gift.amount} towards ${gift.towards}, and how to send it.`,
      eyebrow: "Your gift",
      heading,
      body:
        lead(opening) +
        facts([
          [
            "Towards",
            gift.needUrl
              ? `<a href="${escape(gift.needUrl)}" style="color:#7a1b5c;">${escape(gift.towards)}</a>`
              : escape(gift.towards),
          ],
          ["Your part", escape(gift.amount)],
          ["From", escape(gift.partnerName)],
        ]) +
        rule() +
        sending +
        p(following) +
        button(gift.needUrl ?? `${site.url}/needs`, gift.needUrl ? "Follow this item" : "See the other needs", "green") +
        signoff(),
      footerNote: paid
        ? `You are getting this because this address was used to give at ${escape(site.domain)}. The payment was taken by Pesapal on the ministry's behalf and will show on your statement under ${escape(site.longName)}. If anything about it looks wrong, reply to this email.`
        : `You are getting this because this address was used to promise a gift at ${escape(site.domain)}. Nothing has been charged and nothing is owed — a promise is a promise, and you can change your mind by replying.`,
    }),
    text: `${heading}

${
  paid
    ? gift.remaining
      ? `Your gift has arrived and now shows as received on the website. The balance —\n${gift.remaining} — stays open for somebody else to pick up.`
      : "Your gift has arrived, it is written down against your name, and Pastor Simon\nwill make sure it goes where you have asked."
    : gift.remaining
      ? `That amount now shows as promised on the website, so nobody else will be asked\nfor it. The balance — ${gift.remaining} — stays open for somebody else to pick up.`
      : "That is written down against your name, and Pastor Simon will make sure it goes\nwhere you have asked."
}

Towards:   ${gift.towards}${gift.needUrl ? `  (${gift.needUrl})` : ""}
Your part: ${gift.amount}
From:      ${gift.partnerName}

${
  paid
    ? `This is what was taken, for your records:\n\n${paid.charged} · ${paid.method}${paid.confirmationCode ? `\nConfirmation ${paid.confirmationCode}` : ""}`
    : details
      ? `These are the details for sending it:\n\n${details}`
      : `We do not publish bank or M-Pesa details on the site. ${site.leaders} will reply to this address with the right account for wherever you are giving from — usually within a day or two.`
}

${following}

${site.leaders}
${site.longName}
${textFooter()}`,
  };
}

/* ----------------------------------------------------------------- enrolment */

export type EnrolmentEnquiry = {
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childAge: string;
  startingWhen: string;
  message: string;
};

export function enrolmentNotification(enquiry: EnrolmentEnquiry): Message {
  const heading = `${enquiry.parentName} is asking about a place`;

  return {
    to: inboxes(),
    replyTo: named(enquiry.parentName, enquiry.email),
    subject: oneLine(`Academy enquiry: ${enquiry.childName || enquiry.parentName}`),
    tag: "enrolment-notification",
    html: renderEmail({
      preheader: `${enquiry.parentName} — ${enquiry.childName || "a place at the academy"}`,
      eyebrow: "Jepegomi Academy",
      heading,
      body:
        facts([
          ["Parent or guardian", escape(enquiry.parentName)],
          [
            "Email",
            `<a href="mailto:${escape(enquiry.email)}" style="color:#7a1b5c;">${escape(enquiry.email)}</a>`,
          ],
          ["Phone", escape(enquiry.phone || nothing)],
          ["Child", escape(enquiry.childName || nothing)],
          ["Age or class", escape(enquiry.childAge || nothing)],
          ["Hoping to start", escape(enquiry.startingWhen || nothing)],
        ]) +
        (enquiry.message ? quote(enquiry.message) : "") +
        p("Replying to this email goes straight back to them.", { small: true, muted: true }),
      footerNote: "Sent by the enrolment enquiry form on the website.",
    }),
    text: `${heading}

Parent or guardian: ${enquiry.parentName}
Email:              ${enquiry.email}
Phone:              ${enquiry.phone || nothing}
Child:              ${enquiry.childName || nothing}
Age or class:       ${enquiry.childAge || nothing}
Hoping to start:    ${enquiry.startingWhen || nothing}
${enquiry.message ? `\n  ${enquiry.message.replace(/\n/g, "\n  ")}\n` : ""}
Replying to this email goes straight back to them.
${textFooter()}`,
  };
}

export function enrolmentAcknowledgement(enquiry: EnrolmentEnquiry): Message {
  const heading = "Thank you for asking about a place";
  const child = enquiry.childName ? escape(enquiry.childName) : "your child";

  return {
    to: [named(enquiry.parentName, enquiry.email)],
    replyTo: publicInbox(),
    subject: "Your enquiry about Jepegomi Academy",
    tag: "enrolment-acknowledgement",
    html: renderEmail({
      preheader: "The school will be in touch to arrange a visit.",
      eyebrow: "Jepegomi Academy",
      heading,
      body:
        lead(`Dear ${escape(enquiry.parentName)},`) +
        p(
          `Thank you for asking about a place for ${child}. Your enquiry has reached the school in ${escape(site.location)}, and someone will be in touch to talk it through and arrange a time for you to visit.`,
        ) +
        panel(
          p(
            "Every child at the academy eats — porridge in the morning and a hot lunch every school day. That is not an extra; it is part of what the school is.",
          ),
          { tone: "green" },
        ) +
        p(
          "The best thing is to come and see it: the classrooms, the teachers, and the children at lunch. You are welcome any school day.",
        ) +
        button(`${site.url}/academy`, "About the academy") +
        signoff(),
      footerNote: `You are getting this because this address was used on the enrolment enquiry form at ${escape(site.domain)}.`,
    }),
    text: `Dear ${enquiry.parentName},

Thank you for asking about a place for ${enquiry.childName || "your child"}. Your enquiry has reached
the school in ${site.location}, and someone will be in touch to talk it through
and arrange a time for you to visit.

Every child at the academy eats — porridge in the morning and a hot lunch every
school day. That is not an extra; it is part of what the school is.

The best thing is to come and see it: the classrooms, the teachers, and the
children at lunch. You are welcome any school day.

${site.leaders}
${site.longName}
${textFooter()}`,
  };
}

/* ------------------------------------------------------------------ accounts */

/**
 * The six digits somebody asked for so they can look at their own giving.
 *
 * Written to be read in a notification on a phone, so the code is early and the
 * explanation is late. The one thing it must say clearly is what to do if it was
 * not them: this message goes to an address that has given to the ministry, and
 * an unexpected one means somebody typed that address into the site.
 *
 * No link that signs anybody in. The code is typed back into the page it was
 * asked for from, which is what keeps a mail scanner following links in an
 * incoming message from spending it before the recipient sees it — see the note
 * in lib/partner-codes.ts.
 */
export function partnerSignInCode(partner: {
  name: string;
  email: string;
  contactName: string;
  code: string;
  /** How long it lasts, in words — the page and the email have to agree. */
  lifetime: string;
}): Message {
  const heading = "Your sign-in code";

  return {
    to: [named(partner.name, partner.email)],
    replyTo: publicInbox(),
    subject: `${partner.code} — your Jepegomi sign-in code`,
    tag: "partner-sign-in-code",
    html: renderEmail({
      preheader: `Your code is ${partner.code}. It lasts ${partner.lifetime}.`,
      eyebrow: "Partners",
      heading,
      body:
        lead(`Dear ${escape(partner.contactName || partner.name)},`) +
        p(
          `Here is the code for seeing everything ${escape(partner.name)} has given, what it went to, and how each piece of work is going. Type it into the page you asked from.`,
        ) +
        panel(
          `<p style="margin:0 0 16px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;line-height:42px;font-weight:700;letter-spacing:8px;color:#7a1b5c;">${escape(partner.code)}</p>`,
          { tone: "plum" },
        ) +
        p(`It lasts ${escape(partner.lifetime)}, and works once.`, {
          small: true,
          muted: true,
        }) +
        rule() +
        p(
          "If you did not ask for this, somebody typed your address into the sign-in page and nothing has happened — the code is useless to them without this email. You do not need to do anything, but do reply and tell us if it keeps arriving.",
          { small: true, muted: true },
        ) +
        signoff(),
      footerNote: `You are getting this because somebody asked to sign in to the partner area with this address on ${escape(site.domain)}.`,
    }),
    text: `Dear ${partner.contactName || partner.name},

Here is the code for seeing everything ${partner.name} has given, what it went
to, and how each piece of work is going. Type it into the page you asked from.

    ${partner.code}

It lasts ${partner.lifetime}, and works once.

If you did not ask for this, somebody typed your address into the sign-in page
and nothing has happened — the code is useless to them without this email. You
do not need to do anything, but do reply and tell us if it keeps arriving.

${site.leaders}
${site.longName}
${textFooter()}`,
  };
}

/**
 * A partner church being handed the key to its own dashboard.
 *
 * The password is in the email, in plain text, because that is how the system
 * works: Simon issues one from /app and it has to reach them somehow. Two
 * things keep that honest rather than careless — the login opens a read-only
 * view of that church's own giving and nothing else, and the mail says plainly
 * that the address is the account, so a church that did not ask for this knows
 * immediately that something is wrong.
 */
export function partnerLoginIssued(partner: {
  name: string;
  email: string;
  contactName: string;
  password: string;
}): Message {
  const heading = "Your Jepegomi partner login";

  return {
    to: [named(partner.name, partner.email)],
    replyTo: publicInbox(),
    subject: "Your Jepegomi partner login",
    tag: "partner-login-issued",
    html: renderEmail({
      preheader: `A password has been set for ${partner.email}.`,
      eyebrow: "Partners",
      heading,
      body:
        lead(
          `Dear ${escape(partner.contactName || partner.name)},`,
        ) +
        p(
          `${escape(site.leaders)} have set up a login for ${escape(partner.name)}, so you can see everything ${escape(partner.name)} has given, what it went to, and how each piece of work is going.`,
        ) +
        facts([
          ["Sign in at", `<a href="${site.url}/partners/password" style="color:#7a1b5c;">${escape(site.domain)}/partners/password</a>`],
          ["Email", escape(partner.email)],
          [
            "Password",
            `<span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:17px;letter-spacing:0.5px;background:#f5ecdd;padding:4px 10px;border-radius:6px;">${escape(partner.password)}</span>`,
          ],
        ]) +
        button(`${site.url}/partners/password`, "Sign in") +
        rule() +
        p(
          "Keep this email somewhere safe, or write the password down and delete it — the page shows your giving, so it is worth treating like any other login. If you would like it changed, or you did not expect this, reply to this email and we will sort it out.",
          { small: true, muted: true,
          },
        ) +
        signoff(),
      footerNote: `You are getting this because ${escape(site.longName)} set up a partner login for this address.`,
    }),
    text: `Dear ${partner.contactName || partner.name},

${site.leaders} have set up a login for ${partner.name}, so you can see
everything ${partner.name} has given, what it went to, and how each piece of
work is going.

Sign in at: ${site.url}/partners/password
Email:      ${partner.email}
Password:   ${partner.password}

Keep this email somewhere safe, or write the password down and delete it. If you
would like it changed, or you did not expect this, reply and we will sort it out.

${site.leaders}
${site.longName}
${textFooter()}`,
  };
}

export function partnerLoginRevoked(partner: { name: string; email: string; contactName: string }): Message {
  const heading = "Your Jepegomi partner login has been turned off";

  return {
    to: [named(partner.name, partner.email)],
    replyTo: publicInbox(),
    subject: "Your Jepegomi partner login has been turned off",
    tag: "partner-login-revoked",
    html: renderEmail({
      preheader: "The dashboard login for this address no longer works.",
      eyebrow: "Partners",
      heading,
      body:
        lead(`Dear ${escape(partner.contactName || partner.name)},`) +
        p(
          `The login for ${escape(partner.name)} has been turned off, so the password you were sent no longer works. Nothing about your giving has changed and nothing has been deleted — it is only the sign-in that has gone.`,
        ) +
        p(
          "If this is a surprise, or you would like it turned back on, just reply to this email.",
        ) +
        signoff(),
      footerNote: `Sent by ${escape(site.longName)} because a partner login for this address was removed.`,
    }),
    text: `Dear ${partner.contactName || partner.name},

The login for ${partner.name} has been turned off, so the password you were sent
no longer works. Nothing about your giving has changed and nothing has been
deleted — it is only the sign-in that has gone.

If this is a surprise, or you would like it turned back on, just reply.

${site.leaders}
${site.longName}
${textFooter()}`,
  };
}

/** Somebody being let into the CMS at /app. */
export function cmsAccountCreated(user: { name: string; email: string; invitedBy: string }): Message {
  const heading = `You can now edit ${site.domain}`;

  return {
    to: [named(user.name, user.email)],
    replyTo: publicInbox(),
    subject: `You can now edit ${site.domain}`,
    tag: "cms-account-created",
    html: renderEmail({
      preheader: `${user.invitedBy} has given you an account on the website.`,
      eyebrow: "Website",
      heading,
      body:
        lead(`Dear ${escape(user.name)},`) +
        p(
          `${escape(user.invitedBy)} has set up an account for you on the ${escape(site.domain)} website, so you can change the wording on the pages, add photographs, and keep the list of needs up to date.`,
        ) +
        facts([
          ["Sign in at", `<a href="${site.url}/app" style="color:#7a1b5c;">${escape(site.domain)}/app</a>`],
          ["Email", escape(user.email)],
          ["Password", "The one you were given in person — it is not in this email."],
        ]) +
        button(`${site.url}/app`, "Open the editor") +
        rule() +
        p(
          "Whatever you save goes live on the public site straight away, so it is worth reading a page back after you change it.",
          { small: true, muted: true },
        ) +
        signoff(user.invitedBy),
      footerNote: `You are getting this because an account was created for this address on ${escape(site.domain)}.`,
    }),
    text: `Dear ${user.name},

${user.invitedBy} has set up an account for you on the ${site.domain} website, so you
can change the wording on the pages, add photographs, and keep the list of needs
up to date.

Sign in at: ${site.url}/app
Email:      ${user.email}
Password:   the one you were given in person — it is not in this email.

Whatever you save goes live on the public site straight away, so it is worth
reading a page back after you change it.

${user.invitedBy}
${site.longName}
${textFooter()}`,
  };
}
