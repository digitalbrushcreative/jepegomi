import { NEED_AREAS } from "@/lib/giving";
import {
  ACCOUNT_VISIBILITIES,
  DEFAULT_VISIBILITY,
  noteField,
  visibilityField,
} from "@/lib/project-accounts";
import { site as siteDefaults } from "@/lib/site";

/**
 * The CMS, declared once.
 *
 * Every editable thing on the site is a field in this file. A document's
 * `fields` drive the editor form; its `defaults` are both the fallback when
 * nothing has been saved and the source of the page's TypeScript type. Add a
 * field here and it appears in the editor and on the page — there is no second
 * place to register it, and no per-page editor screen to write.
 *
 * What is deliberately NOT in here: links, routes and layout. Those are
 * structure, not content. Simon & Joyce can change any word or photo on the
 * site; they cannot accidentally dismantle the nav or the design.
 */

export type LeafField =
  | { type: "text"; label: string; help?: string }
  | { type: "prose"; label: string; help?: string }
  | { type: "image"; label: string; help?: string }
  /*
    One of a fixed set of answers, rendered as radio buttons rather than a
    dropdown. Every option this site has is a decision about who can see
    something, and the differences between them need a sentence each — a select
    box shows one line at a time and hides the two you are choosing against.

    The saved value is checked against `options` when the form is parsed (see
    cms/form.ts). A field whose meaning is "who may read the accounts" cannot
    take whatever string arrives in a POST.
  */
  | {
      type: "choice";
      label: string;
      help?: string;
      options: readonly { value: string; label: string; help?: string }[];
    };

export type Field =
  | LeafField
  | {
      type: "list";
      label: string;
      /** Singular noun for the "Add another ___" button. */
      itemLabel: string;
      help?: string;
      fields: Record<string, LeafField>;
    };

/**
 * The filing cabinet the editor is organised by.
 *
 * A dozen pages in one flat list is a list you have to read; the same dozen in
 * five drawers is a list you can point at. The order here is the order of the
 * sidebar and of the Pages screen — the ministry first, then what it runs, then
 * the money, then the settings nobody touches twice a year.
 */
export const documentGroups = [
  {
    id: "main",
    label: "Main pages",
    description: "The front door, the story, and how to reach you.",
  },
  {
    id: "ministry",
    label: "The ministry",
    description: "The church, the school, and the college.",
  },
  {
    id: "programs",
    label: "Programs",
    description: "The work that runs alongside — food, media, transport.",
  },
  {
    id: "giving",
    label: "Giving",
    description: "How to give, and what is being asked for.",
  },
  {
    id: "settings",
    label: "Site-wide",
    description: "Details that appear on every page.",
  },
] as const;

export type DocumentGroup = (typeof documentGroups)[number]["id"];

export type CmsDocument = {
  title: string;
  /** The page this content appears on, for the "View page" link. Null for site-wide settings. */
  path: string | null;
  /** Which drawer of the editor this document is filed in. */
  group: DocumentGroup;
  description: string;
  fields: Record<string, Field>;
  defaults: Record<string, unknown>;
};

/*
  `prose` is a plain textarea. One blank line starts a new paragraph — that is
  the whole formatting language, and it is deliberately the whole thing. A rich
  text editor would let an editor paste in styled markup and drift the design;
  paragraphs cannot.
*/

/*
  The enrolment figure, and — because the school feeds every child it teaches —
  the number fed each day as well. Several pages say it in prose, so one
  constant seeds all of those defaults and the academy's own field, and they
  cannot start disagreeing with each other here.

  Numbers the *page* prints are read back from the saved academy field instead
  (see `getChildrenFed`), so they follow an editor's change. Prose is different:
  once a paragraph has been edited it belongs to whoever edited it, and updating
  this constant will not — must not — rewrite their words. Sentences with the
  figure in them are worth re-reading after the enrolment changes.
*/
const pupilsEnrolled = "131";

/*
  Scripture, on the four pages that carry it.

  The two hubs, the needs list and the giving page — and no page has two. The
  restraint is the point: a verse on every page is wallpaper, and wallpaper is
  not read. Any page can drop its verse by clearing the field, and a page that
  never had one is not missing anything.

  `text` rather than `prose`, so a pasted passage cannot break the band into
  several paragraphs — a verse is one.

  The reference ends in NKJV because the New King James Version asks for the
  initials after each quotation in media of this kind. Keeping it in the content
  rather than in the component means it is visible to whoever edits the verse,
  which is the person who needs to know.
*/
const verseFields = {
  verse: {
    type: "text",
    label: "Scripture",
    help: "Shown quietly between two sections. Leave blank for no verse on this page.",
  },
  verseRef: {
    type: "text",
    label: "Scripture reference",
    help: "Ends in NKJV — the New King James Version asks for the initials after each quotation.",
  },
} satisfies Record<string, LeafField>;

const site = {
  title: "Site details",
  path: null,
  group: "settings",
  description:
    "Used across every page — in the header, the footer, and page descriptions.",
  fields: {
    name: { type: "text", label: "Short name" },
    longName: { type: "text", label: "Full name" },
    tagline: { type: "text", label: "Tagline" },
    email: { type: "text", label: "Email address" },
    location: { type: "text", label: "Location" },
    leaders: { type: "text", label: "Led by" },
    /*
      One rate for the whole site, and the reason it is a field rather than a
      constant is that it moves. Two rates on one site drift apart the first time
      one of them is updated, and then the ministry quotes two different exchange
      rates on two different pages — so the bus and the playground both read this
      one, and nothing else converts anything.
    */
    kesPerUsd: {
      type: "text",
      label: "Shillings to the dollar",
      help: "Used wherever a price quoted in Kenyan shillings is shown in dollars — the bus, and the playground. Digits only. Change it when it has drifted far enough to matter and every dollar figure on the site follows.",
    },
  },
  defaults: {
    name: siteDefaults.name,
    longName: siteDefaults.longName,
    tagline: siteDefaults.tagline,
    email: siteDefaults.email,
    location: siteDefaults.location,
    leaders: siteDefaults.leaders,
    kesPerUsd: "129",
  },
} satisfies CmsDocument;

/*
  There is no account number field here, on purpose. Bank and M-Pesa details are
  never published on the site — they are sent by reply when somebody asks — so
  the giving page is words about the ministry's work, and nothing an editor can
  mistype into sending a gift to the wrong place.
*/
const giving = {
  title: "Give",
  path: "/give",
  group: "giving",
  description:
    "The giving page. Account details are deliberately not on the site — they are sent by email when somebody asks.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    waysHeading: { type: "text", label: "Section heading" },
    ways: {
      type: "list",
      label: "Where gifts go",
      itemLabel: "area",
      help: "The parts of the ministry a gift can support. Listed in order.",
      fields: {
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Text" },
      },
    },
    howHeading: { type: "text", label: "How to give — heading" },
    howBody: { type: "prose", label: "How to give — text" },
    designationNote: {
      type: "prose",
      label: "Note about choosing where a gift goes",
    },
    ...verseFields,
  },
  defaults: {
    heading: "Support the ministry",
    intro:
      "The church, the school, the meals and the building work are run day to day by the people who live here. When you give, you choose a named part of that work at a price we have quoted, and we send you photographs of it as it goes on.",
    waysHeading: "One ministry, four kinds of work",
    ways: [
      {
        title: "The church",
        body: "The congregation in Kahawa Sukari. Everything else grew out of it, and the people who run it day to day are here.",
      },
      {
        title: "The academy",
        body: "Jepegomi Academy: teachers' pay, books, desks, and the everyday cost of running a school at fees the families here can meet.",
      },
      {
        title: "Food at School",
        body: `Morning porridge and a hot lunch for all ${pupilsEnrolled} children, every school day — balanced enough to carry them through a full day of lessons.`,
      },
      {
        title: "Building work",
        body: "The kitchen build, and what comes after it. Gifts here buy materials and pay the trades doing the work.",
      },
    ],
    howHeading: "Or write to us and we will send the details",
    howBody: `We do not publish account details here. Ask, and ${siteDefaults.leaders} reply with the right account for wherever you are giving from — usually the better route for a transfer from overseas.`,
    designationNote:
      "Tell us if you would like your gift to go to something in particular. If you don't, we put it where it does the most that month, and tell you where that was.",
    verse:
      "So let each one give as he purposes in his heart, not grudgingly or of necessity; for God loves a cheerful giver.",
    verseRef: "2 Corinthians 9:7 NKJV",
  },
} satisfies CmsDocument;

/*
  The words around the giving ledger — not the ledger itself.

  The needs, their costs and what has been claimed against them live in the
  database, because they are records rather than copy: they are added to by
  churches on the other side of the world and they have to sum. What is editable
  here is the framing — how the page introduces the idea, and how it explains
  what happens after somebody claims something. Those are words, and Simon
  should be able to change them without anyone touching a table.
*/
const needs = {
  title: "What's needed",
  path: "/needs",
  group: "giving",
  description:
    "The wording around the giving list. The items and their costs are managed under Needs, not here.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    emptyNote: {
      type: "prose",
      label: "When nothing is listed",
      help: "Shown in place of the list while there is nothing published — so the page is never blank.",
    },
    howHeading: { type: "text", label: "How it works — heading" },
    steps: {
      type: "list",
      label: "How it works",
      itemLabel: "step",
      help: "The three or four steps between choosing an item and seeing the photographs.",
      fields: {
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Text" },
      },
    },
    partnerNote: {
      type: "prose",
      label: "Note about signing in",
      help: "Shown beside the sign-in form, explaining what signing in opens — the costings for anybody, and their own giving for somebody who has given.",
    },
    ...verseFields,
  },
  defaults: {
    heading: "What's needed, and what it costs",
    intro: [
      "Every item below is one thing the ministry is short of, with the price on it. You can take all of an item or part of one.",
      "The figures below are based on quotes and estimates for the work.",
    ].join("\n\n"),
    emptyNote:
      "Nothing is listed just now — nothing has been costed carefully enough to put a figure in front of you, and we would rather show you nothing than a guess. Write to us and we will tell you where things stand.",
    howHeading: "See what your giving does",
    steps: [
      {
        title: "Choose an item, and an amount",
        body: "All of it or part of it. What you take shows as promised at once.",
      },
      {
        title: "Pay it, or ask for the details",
        body: "M-Pesa or card — card details go to Pesapal, never to this site. Or ask for the account details and Pastor Simon writes back himself.",
      },
      {
        title: "The gift is marked received",
        body: "M-Pesa and card payments are recorded automatically. Anything sent another way is marked by hand when it arrives. Either way, the page updates.",
      },
      {
        title: "You get updates and photos",
        body: "We post progress and photographs of the work as it goes on, so you can see what your gift paid for.",
      },
    ],
    partnerNote:
      "No account to make and no password. We email a code to any address you can read, and the figures open up. If you have given before, use the address the gift came from and you will also see everything it paid for.",
    verse:
      "He who has pity on the poor lends to the Lord, And He will pay back what he has given.",
    verseRef: "Proverbs 19:17 NKJV",
  },
} satisfies CmsDocument;

/*
  Where Pesapal sends a giver back to. Only the banner is content — what the page
  actually says is decided by asking Pesapal what happened, and that answer is
  not something anybody types.
*/
const thanks = {
  title: "Thank you page",
  path: "/give/thanks",
  group: "giving",
  description:
    "The page a giver lands on after paying. The receipt below the banner is written by the payment itself.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: {
      type: "prose",
      label: "Intro",
      help: "Read for the moment it takes to confirm the payment, so keep it to a line.",
    },
  },
  defaults: {
    heading: "Thank you",
    intro: "One moment while we confirm this with Pesapal.",
  },
} satisfies CmsDocument;

const about = {
  title: "About",
  path: "/about",
  group: "main",
  description: "The church & the Nderitus.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    portrait: {
      type: "image",
      label: "Portrait",
      help: "The cut-out of Simon & Joyce that bleeds off the hero.",
    },
    portraitAlt: {
      type: "text",
      label: "Portrait description",
      help: "Read aloud to people who cannot see the photo.",
    },
    body: {
      type: "prose",
      label: "Body",
      help: "Leave a blank line between paragraphs.",
    },
    facts: {
      type: "list",
      label: "Fact cards",
      itemLabel: "fact",
      fields: {
        label: { type: "text", label: "Label" },
        value: { type: "text", label: "Value" },
      },
    },
  },
  defaults: {
    heading: "The church & the Nderitus",
    intro: `${siteDefaults.longName} is a church and academy in Nairobi led by ${siteDefaults.leaders}.`,
    portrait: "/photos/founders/simon-and-joyce.png",
    portraitAlt: `${siteDefaults.leaders}, who lead ${siteDefaults.longName}`,
    body: [
      "Their work joins the spiritual and the practical: a place to worship, a school to learn in, and the daily meals that keep the learning going. Everything on this site flows from that mission.",
      "Alongside the church and Jepegomi Academy, the ministry runs a Bible school, digital outreach, and school transport for children in the community.",
    ].join("\n\n"),
    facts: [
      { label: "Led by", value: siteDefaults.leaders },
      { label: "Location", value: siteDefaults.location },
      { label: "The Academy", value: "“Quality Education With Values”" },
      { label: "Feeding", value: "Porridge and hot lunch, every school day" },
    ],
  },
} satisfies CmsDocument;

/*
  The church and the college are the two arms of the ministry that had no page
  of their own — the site grew out of the Kitchen Build report, so it learned to
  talk about food first and everything else second. Both documents are shaped
  like `academy`: what is known is written, and what is not is a blank field
  that the page flags rather than fills in.
*/
const church = {
  title: "Church",
  path: "/church",
  group: "ministry",
  description:
    "Sunday services. Add the service times at the bottom and they stop showing as “to be confirmed”.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    sectionTitle: { type: "text", label: "Section title" },
    body: { type: "prose", label: "Body" },
    services: {
      type: "list",
      label: "Service times",
      itemLabel: "service",
      help: "Empty until you add them — the page says the times are still to be confirmed rather than guessing at one.",
      fields: {
        name: { type: "text", label: "Service" },
        time: { type: "text", label: "Day & time" },
        detail: {
          type: "text",
          label: "Note",
          help: "Optional — language, who it's for, anything worth saying.",
        },
      },
    },
    address: {
      type: "text",
      label: "Where we meet",
      help: "The address people should actually turn up to. Leave blank while it is unconfirmed.",
    },
  },
  defaults: {
    heading: "The church at the centre of it",
    intro: `${siteDefaults.longName} is a church in ${siteDefaults.location}, led by ${siteDefaults.leaders}. The academy, the college and the feeding program all belong to it.`,
    sectionTitle: "Sunday at Jepegomi",
    body: [
      "The congregation gathers each week to worship, pray and hear the Word together. It is the oldest thing the ministry does, and the thing the rest of it is built on.",
      "Visitors are welcome. You do not need to know anybody, and you do not need to bring anything.",
    ].join("\n\n"),
    /*
      Deliberately empty. Nobody has told us what time the service starts, and a
      church website that guesses at that is worse than one that admits it does
      not know: somebody turns up to a locked gate.
    */
    services: [] as { name: string; time: string; detail: string }[],
    address: "",
  },
} satisfies CmsDocument;

/*
  The college is the one page on the site that publishes an account number.

  Everywhere else — the giving page, the needs ledger — details are deliberately
  withheld and sent by reply, because a donor who mistypes a gift has lost it.
  Fees are the opposite case: they are a price list a student has to be able to
  read before enrolling, and the college already circulates these figures itself.
  So they are published here, and here only.
*/
const college = {
  title: "Bible College",
  path: "/college",
  group: "ministry",
  description:
    "The Contextual Bible Training College: the programmes, the fees, and where fees are paid.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    sectionTitle: { type: "text", label: "Section title" },
    body: { type: "prose", label: "Body" },
    students: { type: "text", label: "Students enrolled" },
    schedule: { type: "text", label: "When it meets" },
    enrolment: { type: "text", label: "How to enrol" },
    intake: {
      type: "text",
      label: "Next intake",
      help: "When the next class starts. Leave blank until the date is fixed — the page will say it is still to be confirmed rather than guess at one.",
    },
    feesTitle: { type: "text", label: "Fees — heading" },
    feesBody: { type: "prose", label: "Fees — text" },
    programs: {
      type: "list",
      label: "Programmes & fees",
      itemLabel: "programme",
      help: "One row per class, in the order a student would progress through them. The page works out the total from the monthly fee and the length, so those two need to be numbers.",
      fields: {
        name: { type: "text", label: "Programme" },
        fee: {
          type: "text",
          label: "Monthly fee",
          help: "The number only — the page adds “Ksh” and “a month”.",
        },
        months: {
          type: "text",
          label: "Length",
          help: "The number of months only.",
        },
      },
    },
    paymentsTitle: { type: "text", label: "Payments — heading" },
    bank: { type: "text", label: "Bank" },
    account: { type: "text", label: "Account number" },
    paybill: { type: "text", label: "M-Pesa paybill" },
    paymentsNote: {
      type: "prose",
      label: "Payments — note",
      help: "Why fees go through the bank rather than in cash.",
    },
  },
  defaults: {
    heading: "Contextual Bible Training College",
    intro: `The college is the training arm of ${siteDefaults.longName} — Bible teaching rooted in the community it serves, alongside the church and the school.`,
    sectionTitle: "The college today",
    body: [
      `The Contextual Bible Training College is run by ${siteDefaults.leaders} as part of the ministry in ${siteDefaults.location}, teaching the Scriptures in and for the community that the church and the academy already serve.`,
      "It teaches from certificate to doctorate, and a student pays month by month rather than in a lump at the start of a term.",
    ].join("\n\n"),
    // Still genuine unknowns. See SETUP.md.
    students: "",
    schedule: "",
    enrolment: "",
    intake: "",
    feesTitle: "What each class costs, and how long it runs",
    feesBody:
      "Fees are paid monthly for the length of the programme. The total beside each one is what the whole course comes to if it runs its full length.",
    programs: [
      { name: "Certificate", fee: "3,000", months: "12" },
      { name: "Associate", fee: "3,500", months: "24" },
      { name: "Bachelor", fee: "4,000", months: "24" },
      { name: "Masters", fee: "4,500", months: "24" },
      { name: "Doctorate", fee: "5,000", months: "30" },
    ],
    paymentsTitle: "Where fees are paid",
    bank: "Kenya Commercial Bank",
    account: "1324889675",
    paybill: "522522",
    paymentsNote:
      "No cash payments are accepted. Paying through the bank means every shilling paid to the college is accounted for, and the confirmation that comes to your phone is your own record of it — you can follow your account yourself without having to ask anybody.",
  },
} satisfies CmsDocument;

/*
  The front page, as an introduction to an institution rather than a summary of
  every page on the site.

  It used to open on a rotating slide per arm, then four cards, then every
  current appeal, then the closing ask — accurate, and a fundraising platform's
  shape. The order now is purpose, people, work, evidence, partnership: who the
  ministry is, what it does, what it has done, who leads it, and only then how
  somebody might stand with it. The appeals did not go anywhere. They live on
  /projects and /needs, one click from the partnership section, instead of on
  every screen of the front page.

  Every field name is new rather than reused. Saved content is laid over these
  defaults key by key, so a reused name — `heading`, `closingHeading` — would
  have brought the old page's words back into the new page's slots. The old
  keys are still in the stored JSON and nothing reads them; the next save from
  the editor drops them.

  Links are fixed in the page where a section has exactly one place to go (the
  story of the ministry is /about; a visit is /church). The ministries and the
  featured story keep a link field, because which arm or which story is shown
  is the editor's choice.

  No field here is a figure. The number of children fed is the academy's
  "Pupils enrolled" field read back (see lib/enrolment.ts), so the front page
  cannot quote a different count from the academy page.
*/
const home = {
  title: "Home",
  path: "/",
  group: "main",
  description:
    "The front page — who the ministry is, its four ministries, the figures, a featured story, the leadership, and the invitation to partner.",
  fields: {
    heroHeading: {
      type: "text",
      label: "Headline",
      help: "The one large line at the top of the page. Keep it short — it is set very large. The church comes first, then the school, then the food: the ministry's own order.",
    },
    heroBody: { type: "prose", label: "Text under the headline" },
    heroPhoto: {
      type: "image",
      label: "Photograph",
      help: "Fills most of the first screen. Wide (landscape) photographs of people work best — a Sunday service would be ideal. The headline sits over the bottom-left of it.",
    },
    heroPhotoAlt: {
      type: "text",
      label: "Photograph description",
      help: "Read aloud to people who cannot see the photo.",
    },

    introLabel: { type: "text", label: "Who we are — label" },
    introHeading: { type: "text", label: "Who we are — heading" },
    introBody: {
      type: "prose",
      label: "Who we are — text",
      help: "Leave a blank line between paragraphs.",
    },
    introPhoto: { type: "image", label: "Who we are — photograph" },
    introPhotoAlt: { type: "text", label: "Who we are — photograph description" },

    ministriesHeading: { type: "text", label: "Ministries — heading" },
    ministries: {
      type: "list",
      label: "Ministries",
      itemLabel: "ministry",
      help: "One large photographic panel each, two to a row. The link is a path on this site, like /academy.",
      fields: {
        name: { type: "text", label: "Name", help: "Shown small, above the title — e.g. Jepegomi Academy." },
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Text" },
        photo: { type: "image", label: "Photograph" },
        photoAlt: { type: "text", label: "Photograph description" },
        href: { type: "text", label: "Link" },
        cta: { type: "text", label: "Link text" },
      },
    },

    evidenceLabel: { type: "text", label: "Figures — label" },
    evidenceHeading: { type: "text", label: "Figures — heading" },
    childrenFedLabel: {
      type: "text",
      label: "Children fed — caption",
      help: "The number itself is the academy's “Pupils enrolled” field, so it changes when that does.",
    },
    figures: {
      type: "list",
      label: "Other figures",
      itemLabel: "figure",
      help: "Shown beside the number of children fed. Only publish figures you can stand behind — a modest true number is worth more than a large round one.",
      fields: {
        value: { type: "text", label: "Number" },
        label: { type: "text", label: "Caption" },
      },
    },
    figuresAsOf: {
      type: "text",
      label: "Figures are correct as of",
      help: "e.g. “October 2026”. Shown under the figures so a reader knows how current they are. Update it whenever you check them.",
    },
    evidenceNote: { type: "text", label: "Figures — closing line" },

    storyLabel: { type: "text", label: "Featured story — label" },
    storyHeading: { type: "text", label: "Featured story — heading" },
    storyBody: { type: "prose", label: "Featured story — text" },
    storyPhoto: { type: "image", label: "Featured story — photograph" },
    storyPhotoAlt: { type: "text", label: "Featured story — photograph description" },
    storyHref: {
      type: "text",
      label: "Featured story — link",
      help: "Where “Read the story” goes — a path on this site, like /projects/kitchen.",
    },
    storyCta: { type: "text", label: "Featured story — link text" },

    leadershipLabel: { type: "text", label: "Leadership — label" },
    leadershipHeading: { type: "text", label: "Leadership — heading" },
    leadershipBody: { type: "prose", label: "Leadership — text" },
    leadershipMessage: {
      type: "prose",
      label: "A word from the pastors",
      help: "In Simon & Joyce's own words, shown as a quotation. Blank until they write it — the section reads fine without it, and it should never be written for them.",
    },
    leadershipPhoto: {
      type: "image",
      label: "Leadership — portrait",
      help: "A cut-out with no background — a PNG with a transparent background, like the one of Simon & Joyce. It stands on the bottom edge of the section, so a photograph with a backdrop will look like a box.",
    },
    leadershipPhotoAlt: { type: "text", label: "Leadership — portrait description" },

    partnerLabel: { type: "text", label: "Partner with us — label" },
    partnerHeading: { type: "text", label: "Partner with us — heading" },
    partnerBody: { type: "prose", label: "Partner with us — text" },
    partnerPhoto: { type: "image", label: "Partner with us — photograph" },
    partnerPhotoAlt: { type: "text", label: "Partner with us — photograph description" },
    partnerCta: { type: "text", label: "Partner with us — link text" },

    welcomeHeading: { type: "text", label: "Closing — heading" },
    welcomeBody: { type: "prose", label: "Closing — text" },
    welcomePhoto: {
      type: "image",
      label: "Closing — photograph",
      help: "Runs the full width of the page behind the closing words, darkened so they can be read.",
    },
    welcomePhotoAlt: { type: "text", label: "Closing — photograph description" },
  },
  defaults: {
    heroHeading: "Faith that gathers, teaches and feeds.",
    heroBody:
      "Sunday worship, a school from kindergarten to Grade 6, and two meals a day for every pupil.",
    /*
      Children at their desks over lunch, rather than the congregation the
      brief asks for. The only photographs of a service are 636px crops out of
      the slide deck, and at the width of this hero they turn to mush. This one
      is sharp, full of people, and true of an ordinary school day. A photograph
      of a Sunday service, taken on a phone, should replace it.
    */
    heroPhoto: "/photos/school/lunch-classroom-03.jpg",
    heroPhotoAlt:
      "Children in green and white uniform at their classroom desks, eating lunch from red plates",

    introLabel: "About the ministry",
    introHeading: "A week at Jepegomi",
    introBody: [
      "On Sunday the congregation meets for worship in Kahawa Sukari. During the week, Jepegomi Academy teaches children from kindergarten to Grade 6, and every pupil gets porridge in the morning and a cooked lunch at midday. Alongside the school, the Contextual Bible Training College teaches the Bible to adults.",
      `All of it is led by ${siteDefaults.leaders}.`,
    ].join("\n\n"),
    introPhoto: "/photos/academy/assembly.jpg",
    introPhotoAlt:
      "A long line of children in green uniform standing outdoors at assembly, a teacher reading to them",

    ministriesHeading: "The four ministries",
    /*
      The church first, then what it runs — the same order as the nav and the
      about page. The college photograph is a seminar group outside the
      building, which is what the college has; it is not dressed up as a
      lecture.
    */
    ministries: [
      {
        name: "The Church",
        title: "Sunday services in Kahawa Sukari",
        body: "Worship, prayer and Bible teaching every week. Visitors are welcome.",
        photo: "/photos/church/congregation.jpg",
        photoAlt: "The congregation seated on white chairs inside the sanctuary during a service",
        href: "/church",
        cta: "Visit the church",
      },
      {
        name: "Jepegomi Academy",
        title: "Kindergarten to Grade 6",
        body: "Jepegomi Academy teaches the children of Kahawa Sukari. Its motto is “Quality Education With Values”.",
        photo: "/photos/academy/graduation.jpg",
        photoAlt: "Kindergarten graduates in green gowns and mortarboards, standing with two of their teachers",
        href: "/academy",
        cta: "About the academy",
      },
      {
        name: "Contextual Bible Training College",
        title: "Bible training for adults",
        body: "The Contextual Bible Training College teaches the Scriptures in and for the community the church serves.",
        photo: "/photos/college/seminar.jpg",
        photoAlt: "A group of pastors and ministry leaders standing together outside the church after a seminar",
        href: "/college",
        cta: "About the college",
      },
      {
        name: "Food at School",
        title: "Porridge and lunch, every school day",
        body: "Every pupil at the academy gets porridge in the morning and a cooked lunch at midday.",
        photo: "/photos/school/lunch-queue-01.jpg",
        photoAlt: "Children in green uniform queueing along a wall, plates in hand",
        href: "/programs/food-at-school",
        cta: "About the feeding programme",
      },
    ],

    evidenceLabel: "Jepegomi Academy",
    evidenceHeading: "The academy in figures",
    childrenFedLabel: "Pupils, every one of them fed at school",
    figures: [
      { value: "2", label: "Meals a day — porridge, then a cooked lunch" },
      { value: "KG–6", label: "Kindergarten to Grade 6" },
    ],
    /*
      Blank on purpose. Nobody has confirmed when these were last counted, and
      a date typed here by somebody who did not count them would be the one
      claim on the page that is invented.
    */
    figuresAsOf: "",
    evidenceNote:
      "The number of pupils is the academy's current enrolment. The school feeds every child it teaches, so it is also the number fed each day.",

    storyLabel: "The kitchen",
    storyHeading: "How the school stopped cooking over open fires",
    storyBody: [
      `For years the academy's meals were cooked over open fires in the school yard. A partner church in the United States paid for a kitchen and store room, and it has cooked for all ${pupilsEnrolled} pupils every school day since.`,
      "The dining area beside it is not finished yet. The kitchen page shows the build from the foundations up, and what is left to do.",
    ].join("\n\n"),
    storyPhoto: "/photos/kitchen/16.jpg",
    storyPhotoAlt: "A wood fire burning in the new kitchen's stove, two cooking plates above it",
    storyHref: "/projects/kitchen",
    storyCta: "Read about the kitchen build",

    leadershipLabel: "Leadership",
    leadershipHeading: siteDefaults.leaders,
    leadershipBody:
      "Simon and Joyce lead the church in Kahawa Sukari, and oversee the academy, the Bible college and the feeding programme.",
    leadershipMessage: "",
    leadershipPhoto: "/photos/founders/simon-and-joyce.png",
    leadershipPhotoAlt: `${siteDefaults.leaders}, standing together and smiling`,

    partnerLabel: "Giving",
    partnerHeading: "What is being raised for now",
    partnerBody: [
      "Four projects are open: the kitchen's dining area, a bus for the academy, a new playground, and the equipment the Sunday services are streamed on.",
      "Each has its own page, with photographs of where things stand and what is still needed.",
    ].join("\n\n"),
    partnerPhoto: "/photos/kitchen/11.jpg",
    partnerPhotoAlt:
      "The finished kitchen — plastered walls, a tiled roof and a chimney, standing in the school yard",
    partnerCta: "See the projects",

    welcomeHeading: "Visit, or get in touch",
    welcomeBody: `Services are held at the church in Kahawa Sukari, and visitors are welcome. For anything else — the academy, the college, or giving — write to ${siteDefaults.email}.`,
    welcomePhoto: "/photos/church/sanctuary-wide.jpg",
    welcomePhotoAlt: "The church building in Kahawa Sukari under a clear sky",
  },
} satisfies CmsDocument;

/*
  The words on a hub card. What is missing from it is the point: no link, no
  icon. Where a card goes is a route, and routes are structure — the pages a hub
  points at are fixed in the page file and the cards are matched to them in
  order, so an editor can rewrite any card on the site and cannot send one
  somewhere that does not exist.
*/
const hubCardFields = {
  eyebrow: { type: "text", label: "Label" },
  title: { type: "text", label: "Title" },
  blurb: { type: "prose", label: "Text" },
  cta: { type: "text", label: "Link text" },
} satisfies Record<string, LeafField>;

/** The help line under every hub's card list, since the caveat is the same one. */
const hubCardsHelp =
  "One card per page below, in the order they appear. Which page each card links to is set in the code, so adding a card here does nothing until there is a page for it.";

const education = {
  title: "Education",
  path: "/education",
  group: "ministry",
  description:
    "The landing page over the Academy and the college. The two pages themselves are edited separately.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    cards: {
      type: "list",
      label: "Cards",
      itemLabel: "card",
      help: hubCardsHelp,
      fields: hubCardFields,
    },
  },
  defaults: {
    heading: "Teaching children, and teaching the people who teach them",
    intro:
      "One arm of the ministry with two ends — a school for the children of Kahawa Sukari, and a Bible college for the adults who will lead and teach in it.",
    cards: [
      {
        eyebrow: "For children",
        title: "Jepegomi Academy",
        blurb:
          "Quality education with values — the school in Kahawa Sukari, teaching children from kindergarten to Grade 6 in classrooms the ministry built itself.",
        cta: "See the Academy",
      },
      {
        eyebrow: "For adults",
        title: "Contextual Bible Training College",
        blurb:
          "The ministry's training arm, teaching the Scriptures in and for the community the church already serves — from certificate to doctorate, with the fees on the page.",
        cta: "About the college",
      },
    ],
  },
} satisfies CmsDocument;

const academy = {
  title: "Academy",
  path: "/academy",
  group: "ministry",
  description:
    "Jepegomi Academy. Fill in the school details at the bottom and they stop showing as “to be confirmed”.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    sectionTitle: { type: "text", label: "Section title" },
    body: { type: "prose", label: "Body" },
    ages: {
      type: "text",
      label: "Ages / grades served",
      help: "Leave blank while it is still unknown — the page will say so rather than guess.",
    },
    pupils: { type: "text", label: "Pupils enrolled" },
    teachers: { type: "text", label: "Number of teachers" },
    staff: { type: "text", label: "Administrative staff" },
    founded: { type: "text", label: "Year founded" },
  },
  defaults: {
    heading: "Quality education with values",
    intro: `Jepegomi Academy teaches ${pupilsEnrolled} children in the Kahawa Sukari community, from kindergarten to Grade 6, a school the ministry built a classroom at a time and is building still.`,
    sectionTitle: "The school today",
    body: [
      `The Academy sits in ${siteDefaults.location}, run by the same hands as the church: ${siteDefaults.leaders}. Children come from families across the neighbourhood, and the fees are kept where those families can reach them.`,
      "It did not start where it stands. The first classrooms were a row of iron-sheet rooms on the roadside, with the school's name painted on by hand. Lessons happen in semi-permanent blocks now (stone to the window sill, iron sheet above, a proper roof over both), and the bigger classrooms the government requires are going up behind them.",
      "The classes are small enough that a child is known by name rather than by number. And what the school is for was painted on that first signboard and has not changed since: value-based education: character and Scripture taught alongside the syllabus, because the ministry has never thought those were two separate subjects.",
    ].join("\n\n"),
    ages: "Kindergarten to Grade 6",
    pupils: pupilsEnrolled,
    teachers: "9",
    staff: "3",
    founded: "2016",
  },
} satisfies CmsDocument;

const programs = {
  title: "Programs",
  path: "/programs",
  group: "programs",
  description:
    "The landing page over the three programs. Each program's own page is edited below it.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro", help: "Optional." },
    cards: {
      type: "list",
      label: "Cards",
      itemLabel: "card",
      help: hubCardsHelp,
      fields: hubCardFields,
    },
    ...verseFields,
  },
  defaults: {
    heading: "The ways Jepegomi serves its community day to day",
    intro: "",
    cards: [
      {
        eyebrow: "Feeding",
        title: "Food at School",
        blurb:
          "Morning porridge and a hot lunch, every school day, for children at Jepegomi Academy — balanced enough to carry them through a full day of lessons.",
        cta: "See the program",
      },
      {
        eyebrow: "Streaming",
        title: "Jepegomi Digital",
        blurb:
          "Sunday services and weekday fellowships, streamed from the sanctuary in Kahawa Sukari to whoever will watch — filmed, for now, on phones.",
        cta: "See the channel",
      },
      {
        eyebrow: "Getting to school",
        title: "School Transport",
        blurb:
          "The academy's van is being repaired, and the school is raising for a 26-seater bus that carries the school it is growing into.",
        cta: "See the appeal",
      },
    ],
    verse:
      "And let us not grow weary while doing good, for in due season we shall reap if we do not lose heart.",
    verseRef: "Galatians 6:9 NKJV",
  },
} satisfies CmsDocument;

const foodAtSchool = {
  title: "Food at School",
  path: "/programs/food-at-school",
  group: "programs",
  description: "The feeding program.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    sections: {
      type: "list",
      label: "Sections",
      itemLabel: "section",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Body" },
      },
    },
    closingHeading: { type: "text", label: "Closing heading" },
    closingBody: { type: "prose", label: "Closing text" },
  },
  defaults: {
    heading: "A hot meal, every school day",
    intro:
      "Food at School gives every child at Jepegomi Academy porridge in the morning and a cooked lunch at midday — balanced enough to carry them through a full day of lessons.",
    sections: [
      {
        eyebrow: "What it is",
        title: "Morning porridge. A hot lunch. Every school day.",
        body: `Children at Jepegomi Academy are fed twice a day — porridge when they arrive, and a cooked lunch in the middle of the day. All ${pupilsEnrolled} of them eat this way, every day the school is open.`,
      },
      {
        eyebrow: "Why it matters",
        title: "A well-fed child can concentrate.",
        body: "Porridge at the start of the day and a plate of rice and beans at midday give a child the carbohydrate and the protein to stay alert through afternoon lessons. That is what the food is for: attention holds, energy holds, and the teaching gets through. A balanced diet is part of the education, not a charity bolted onto the side of it.",
      },
      {
        eyebrow: "Where it is cooked",
        title: "In a kitchen of its own.",
        body: "For years the cooking was done outdoors over open flames. A partner church in the United States gave the kitchen that replaced it, and it is where every meal comes from today: a wood-burning jiko under a roof, a store room beside it, and a serving counter the children queue at. It is the single biggest step this program has taken, and we are grateful for it.",
      },
    ],
    closingHeading: "The kitchen cooks. Next comes the room they eat in.",
    closingBody:
      "The gift built the kitchen and did everything it was given for. Three things would finish the job: a water tank to harvest rainwater, cabro stones to floor the area where the children eat, and plastering and electricity in the dining hall.",
  },
} satisfies CmsDocument;

const digital = {
  title: "Jepegomi Digital",
  path: "/programs/digital",
  group: "programs",
  description:
    "The streaming ministry — the YouTube and Facebook channels, and what it takes to keep them running.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    sections: {
      type: "list",
      label: "Sections",
      itemLabel: "section",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Body" },
      },
    },
    /*
      The channel is Jepegomi Africa, confirmed against the channel itself
      rather than guessed at — a guessed handle either 404s or lands somebody on
      a stranger's channel while wearing this ministry's name. Facebook is still
      blank on the same terms, and the page says so rather than linking into the
      dark.
    */
    youtubeName: { type: "text", label: "YouTube channel name" },
    youtubeUrl: {
      type: "text",
      label: "YouTube channel address",
      help: "The full link, e.g. https://www.youtube.com/@jepegomiafrica. The page reads the channel's recent uploads from it and shows them. Leave blank and it says the link is still to be confirmed rather than guessing it.",
    },
    facebookUrl: {
      type: "text",
      label: "Facebook page address",
      help: "The full link. Same rule as YouTube — blank is better than wrong.",
    },
    /*
      What the streaming would take, costed.

      The page prints the total and not the list, and that is the same decision
      the playground made for the same reason: a public itemisation of a camera,
      a laptop and a pair of radio microphones is a delivery note for a compound
      in Nairobi. What a giver needs is the figure and what it buys, both of
      which the page says in words.
    */
    kitHeading: { type: "text", label: "What it would take — heading" },
    kitBody: { type: "prose", label: "What it would take — summary" },
    kit: {
      type: "list",
      label: "The kit, costed",
      itemLabel: "item",
      help: "One row per thing that has to be bought, priced in shillings, digits only. The page adds them up and shows the total in dollars — the lines themselves are not published. Our own estimates from Nairobi prices until somebody quotes for them; correct a figure here and every total follows.",
      fields: {
        item: { type: "text", label: "Item" },
        note: { type: "text", label: "Note" },
        priceKes: { type: "text", label: "Price (KSh)" },
      },
    },
    supportHeading: { type: "text", label: "Support heading" },
    supportIntro: { type: "prose", label: "Support intro" },
    support: {
      type: "list",
      label: "Ways to support",
      itemLabel: "way",
      fields: {
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Body" },
      },
    },
  },
  defaults: {
    heading: "The pulpit, online",
    intro:
      "When the lockdowns closed the doors, the sermons went out over the internet instead — and never stopped. Sunday services and weekday fellowships are streamed from the sanctuary in Kahawa Sukari to whoever will watch, wherever they are.",
    sections: [
      {
        eyebrow: "Where it started",
        title: "A closed church, and a camera.",
        body: "The streaming began during the COVID lockdown, for the plainest of reasons: the congregation could not come. What began as a way to reach the people who already belonged to the church has carried on reaching people who never could have — the messages now travel far past Kahawa Sukari.",
      },
      {
        eyebrow: "What goes out",
        title: "Sunday services and weekday fellowships, on two channels.",
        body: "Services are streamed on Sunday and again through the week, on both YouTube and Facebook. The teaching is given by Simon and Joyce under the GOFAMI banner — God for the Family Ministries — and the archive of past messages stays up for anyone who wants to go back to one.",
      },
      {
        eyebrow: "What would take it further",
        title: "Filmed on phones, and ready to go further.",
        body: "Everything is recorded on mobile phones, which has carried the ministry a long way and sets a ceiling on the picture and the sound. Better lighting, a camera and someone trained to run it would lift every recording — and turn an occasional stream into a steady one.",
      },
    ],
    youtubeName: "Jepegomi Africa",
    youtubeUrl: "https://www.youtube.com/@jepegomiafrica",
    // The Facebook page is still not known. See SETUP.md.
    facebookUrl: "",
    kitHeading: "What it would take",
    kitBody:
      "A laptop that can edit video, a camera, wireless microphones and a light — and a year of the connection it all goes out over. Bought once, it lifts every recording the ministry makes from here on.",
    kit: [
      {
        item: "Laptop able to edit and stream video",
        note: "Replaces the phones everything is recorded on now",
        priceKes: "120000",
      },
      {
        item: "DSLR camera and lens",
        note: "The picture, at last, from something built to make one",
        priceKes: "90000",
      },
      {
        item: "Wireless microphones — a pair",
        note: "The sound is what a viewer forgives least",
        priceKes: "35000",
      },
      {
        item: "Ring light and stand",
        note: "For the weekday recordings indoors",
        priceKes: "15000",
      },
      {
        item: "A year of internet for streaming",
        note: "The running cost that decides whether a service goes out at all",
        priceKes: "60000",
      },
    ],
    supportHeading: "How you can partner with us",
    supportIntro:
      "The cheapest way to help is free: watch a stream and share it. After that, it is equipment and connection.",
    support: [
      {
        title: "Watch, and share what you watch",
        body: "Every view and every share carries a message further than the ministry can carry it alone, and it costs nothing but the time.",
      },
      {
        title: "Give toward internet costs",
        body: "Consistent streaming needs consistent connection. This is the running cost that decides whether a service goes out at all.",
      },
      {
        title: "Give toward equipment",
        body: "A laptop able to edit video, a DSLR camera, wireless microphones and a ring light would lift every recording out of what a phone can manage.",
      },
      {
        title: "Help train somebody to run it",
        body: "The most useful gift is not a thing. Somebody in the church who knows how to record, edit and upload would make the channel steady rather than occasional.",
      },
    ],
  },
} satisfies CmsDocument;

const transport = {
  title: "School Transport",
  path: "/programs/transport",
  group: "programs",
  description:
    "The school run, and the appeal for a bigger bus, including what the bus costs.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    /*
      The bus, and the one figure this page prints: what it costs.

      These two were declared on the Digital document by mistake, which put them
      in the wrong drawer of the editor and left the page reading a figure Simon
      could not reach. They belong here, beside the words they price.

      There was a "held in the bank" figure alongside them once, wired to a
      percentage meter. It was zero, so none of it rendered — which made it the
      most dangerous line on the site, because the day somebody banked a gift
      toward the bus, a running total of the cash this ministry was holding would
      have published itself with nobody deciding anything. It is not here, and
      there is nothing to turn on by accident: what a stranger can read is the
      price of a bus, which is a dealer's public figure and the thing they are
      being asked for. What has come in against it is the ledger's business.
    */
    busSeats: { type: "text", label: "Bus — how many seats" },
    busPriceKes: {
      type: "text",
      label: "Bus — price in shillings",
      help: "What the dealer quoted, in Kenyan shillings, digits only. The dollar figure on the page is worked out from this and the rate in Site details, and rounded to the nearest hundred — the rate moves daily and the price is a negotiation, so a round figure tells the truth about its own accuracy.",
    },
    sections: {
      type: "list",
      label: "Sections",
      itemLabel: "section",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Body" },
      },
    },
    supportHeading: { type: "text", label: "Support heading" },
    supportIntro: { type: "prose", label: "Support intro" },
    support: {
      type: "list",
      label: "Ways to support",
      itemLabel: "way",
      fields: {
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Body" },
      },
    },
  },
  defaults: {
    heading: "The school run",
    intro:
      "Children come to Jepegomi Academy from across Kahawa Sukari, and how they get there decides how many can come at all. The school has a van, and it is raising for a bus that will carry the school it is growing into.",
    busSeats: "26",
    busPriceKes: "2000000",
    sections: [
      {
        eyebrow: "Where we are",
        title: "The van that started it.",
        body: "The academy has a van — a yellow Toyota, lettered for the school and the church. It was bought with money given toward a school vehicle and it did that work faithfully, and it is standing off the road while it waits on repairs.\n\nThe same partner church that built the kitchen has since given toward getting it running again, and we are grateful for it.",
      },
      {
        eyebrow: "Where that gift went",
        title: "The vehicle money became the van.",
        body: "What was given toward a school vehicle is what bought the van standing at the school — the gift became the vehicle, which is exactly what it was for.\n\nSo the bus is a fresh ask. The figure below is its whole cost, not a gap left over after a balance.",
      },
      {
        eyebrow: "Where we are going",
        title: "A van would be full the day it arrived.",
        body: "The school has grown and it keeps growing. Another small van would be at capacity on its first morning and too small by the following term. A 26-seater bus carries the school as it is now and leaves room for the children still to come — and it is a vehicle the church can use too, for services, rallies and outings.",
      },
      {
        eyebrow: "What it changes",
        title: "A safe ride, and a wider gate.",
        body: "Children who live too far to walk safely can enrol. Parents who cannot leave work to make the trip twice a day can send their child anyway. And the ministry stops paying to hire transport every time it needs to move anybody anywhere.",
      },
    ],
    supportHeading: "How you can partner with us",
    supportIntro:
      "Nothing is banked against the bus yet, so the whole cost is the ask. Every gift toward it is held for the bus and nothing else.",
    support: [
      {
        title: "Give toward the bus",
        body: "Any amount goes into the same fund, held for the vehicle. The figures above move as it fills.",
      },
      {
        title: "Give a vehicle",
        body: "If you are in a position to give a bus rather than money toward one, that is the fastest version of this and we would like to hear from you.",
      },
      {
        title: "Cover the running of it",
        body: "A bus is fuel, insurance, servicing and a driver. Giving toward the running costs keeps it on the road once it is bought.",
      },
    ],
  },
} satisfies CmsDocument;

const contact = {
  title: "Contact",
  path: "/contact",
  group: "main",
  description:
    "The contact page. The email and location themselves live in Site details.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
  },
  defaults: {
    heading: "Contact",
    intro:
      "We would love to hear from you — whether you want to give, partner, or just ask a question.",
  },
} satisfies CmsDocument;

/**
 * Who may read each project's line-by-line figures, and what you want to say
 * about them.
 *
 * Every field here is generated from `NEED_AREAS`, so every arm of the ministry
 * has a switch whether or not it has spent anything yet — and recording what a
 * project bought is enough to give its partners something to read. The
 * alternative, a field per project registered by hand, is a step somebody
 * eventually forgets; forgetting it used to mean figures that could not be
 * shown, and would now mean figures Simon entered that silently went nowhere.
 * See `accountFields` below, and the head of lib/project-accounts.ts.
 *
 * No `path`: this governs a dashboard and a page per project, so there is no
 * single one to offer a "View the page" link to.
 */



/*
  The kitchen photo gallery: which slot is which, and what each one says.

  The photographs themselves are files on disk named for their slot — 07.jpg is
  slot 7 — which is a deliberate design and stays (see lib/photos.ts). What was
  not deliberate is that the *captions* were in a TypeScript array beside them,
  so Simon could upload a photograph in /app and could not write a line under it.

  `slot` is the number in the filename and is the one field here nobody should
  touch: changing it re-labels a photograph that is already uploaded. It is shown
  rather than hidden because a row whose number you cannot see is a row you
  cannot line up against the grid in /app -> Photos.
*/
const projects = {
  title: "Projects",
  path: "/projects",
  group: "giving",
  description:
    "The landing page over the projects being raised for. Each card's figure — how far the kitchen has got, what the others come to — is added to its label automatically and is not typed here.",
  fields: {
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro", help: "Optional." },
    cards: {
      type: "list",
      label: "Cards",
      itemLabel: "card",
      help: `${hubCardsHelp} The current figure is appended to each label.`,
      fields: hubCardFields,
    },
    ...verseFields,
  },
  defaults: {
    heading: "The things we're building to serve better",
    intro: "",
    cards: [
      {
        eyebrow: "Cooking",
        title: "Kitchen Build",
        blurb:
          "The kitchen and store room that replaced the open fires — built with a partner church, cooking daily, with the dining area still to finish. Photos, budget and what is left.",
        cta: "See the build",
      },
      {
        eyebrow: "The yard",
        title: "The Playground",
        blurb:
          "Swings welded on site out of angle iron, a slide stripped to its frame, and all of it standing on bare packed earth. What proper equipment and a rubber crumb safe surface would cost.",
        cta: "See what it costs",
      },
      {
        eyebrow: "The school run",
        title: "Bus Upgrade",
        blurb:
          "The van the school has outgrown, on roads that carry lorries. What a 26-seater bus costs, and how many children are waiting on one.",
        cta: "See what it costs",
      },
      {
        eyebrow: "Streaming",
        title: "Service Livestream",
        blurb:
          "Services recorded on a phone and sent to the people who cannot get to the building. What a camera, a laptop that can edit and a year of connection would cost.",
        cta: "See the kit",
      },
    ],
    verse:
      "So they said, “Let us rise up and build.” Then they set their hands to this good work.",
    verseRef: "Nehemiah 2:18 NKJV",
  },
} satisfies CmsDocument;

const gallery = {
  title: "Kitchen photos",
  path: "/projects/kitchen",
  group: "giving",
  description:
    "The caption under each photograph of the build, and which run it belongs to. Upload the photographs themselves under Photos.",
  fields: {
    categories: {
      type: "list",
      label: "The runs of photographs",
      itemLabel: "run",
      help: "The tabs above the gallery. The id is what each photograph below is filed under — change a label freely, an id only if you change it on every photograph too.",
      fields: {
        id: { type: "text", label: "Id" },
        label: { type: "text", label: "Label" },
      },
    },
    photos: {
      type: "list",
      label: "The photographs",
      itemLabel: "photograph",
      help: "One row per slot in the grid under Photos. The slot number matches the filename — leave it alone unless you are re-ordering the photographs on disk as well.",
      fields: {
        slot: { type: "text", label: "Slot" },
        category: { type: "text", label: "Run" },
        caption: { type: "text", label: "Caption" },
      },
    },
  },
  defaults: {
    categories: [
      { id: "walls", label: "Walls & Structure" },
      { id: "roof", label: "Roof & Finish" },
      { id: "people", label: "Cooking & Eating" },
    ],
    photos: [
      { slot: "1", category: "walls", caption: "Laying the first courses of the kitchen wall" },
      { slot: "2", category: "walls", caption: "Blocks stacked and waiting, walls at knee height" },
      { slot: "3", category: "walls", caption: "The kitchen going up beside the school" },
      { slot: "4", category: "walls", caption: "Walls rising, timber props and ladder in place" },
      { slot: "5", category: "walls", caption: "Doorway and window openings formed" },
      { slot: "6", category: "walls", caption: "The passage between the kitchen and the store room" },
      { slot: "7", category: "walls", caption: "Concrete lintels cast over the openings" },
      { slot: "8", category: "walls", caption: "Inside, the cooking platforms take shape" },
      { slot: "9", category: "walls", caption: "The serving counter, plastered" },
      { slot: "10", category: "walls", caption: "Ring beam poured, walls at their full height" },
      { slot: "11", category: "roof", caption: "Roofed, plastered and standing" },
      { slot: "12", category: "roof", caption: "The kitchen from the yard" },
      { slot: "13", category: "roof", caption: "In the doorway, with cooking underway inside" },
      { slot: "14", category: "roof", caption: "Inside, the jiko in place on a tiled floor" },
      { slot: "15", category: "roof", caption: "The two-pot wood-burning jiko, close up" },
      { slot: "16", category: "people", caption: "The fire lit under the new jiko" },
      { slot: "17", category: "people", caption: "Rice and beans, plated for the children" },
      { slot: "18", category: "people", caption: "The meal laid out beneath the kitchen vents" },
      { slot: "19", category: "people", caption: "Food carried out to the children" },
      { slot: "20", category: "people", caption: "The queue at the kitchen door" },
      { slot: "21", category: "people", caption: "Lunch in the classroom" },
      { slot: "22", category: "people", caption: "Every child eating the same meal" },
      { slot: "23", category: "people", caption: "Plates in hand, on the way back to class" }
    ],
  },
} satisfies CmsDocument;

/*
  The Kitchen Build report.

  The last of what was once a source file. The reconciliation left first — it is rows
  in `needs` now, see the note in lib/db.ts — and this is everything else that
  file held: who gave, how far along the build is, and the before-and-after.

  The gift amount is here and is deliberately not on any public page. That
  another church built this kitchen is the invitation the page is for, and it
  stays. What it cost them is a different fact doing a different job: a stranger
  who reads it has learned what this ministry can be bought for, and the church
  that gave it never asked to have its cheque published. It is used by /app and
  by the accounts table, which is only ever drawn behind the partner door or on
  Simon's own say-so. Anything under app/(site) that reaches for it is a mistake.
*/
const kitchen = {
  title: "Kitchen Build report",
  path: "/projects/kitchen",
  group: "giving",
  description:
    "Who gave, how far along the build is, and the before-and-after. The costed items and the reconciliation are in Needs, not here.",
  fields: {
    donor: {
      type: "text",
      label: "Who gave — as it appears mid-sentence",
      help: "The giving congregation is not named anywhere on the public site: another church reading the page should see an invitation, not somebody else's project.",
    },
    donorTitled: { type: "text", label: "Who gave — to open a sentence" },
    donorLocation: { type: "text", label: "Where they are" },
    giftUsd: {
      type: "text",
      label: "What they gave (USD)",
      help: "Never shown on a public page. It appears in the accounts, which only partners and Simon see, and in /app. Digits only.",
    },
    percentComplete: {
      type: "text",
      label: "How far along the whole build is (%)",
      help: "Not the kitchen on its own — that is finished and cooking. The part still missing is the dining area beside it. Digits only.",
    },
    progressCaption: { type: "text", label: "Caption under the progress figure" },
    mealsPerDay: { type: "text", label: "Stat — hot meals cooked daily" },
    kitchensCooking: { type: "text", label: "Stat — kitchens cooking" },
    beforeHeading: { type: "text", label: "Before — heading" },
    beforeAlt: { type: "text", label: "Before — description for screen readers" },
    beforeBullets: {
      type: "list",
      label: "Before — bullets",
      itemLabel: "bullet",
      fields: { text: { type: "text", label: "Bullet" } },
    },
    afterHeading: { type: "text", label: "Now — heading" },
    afterAlt: { type: "text", label: "Now — description for screen readers" },
    afterBullets: {
      type: "list",
      label: "Now — bullets",
      itemLabel: "bullet",
      fields: { text: { type: "text", label: "Bullet" } },
    },
  },
  defaults: {
    donor: "a partner church",
    donorTitled: "A partner church",
    donorLocation: "the United States",
    giftUsd: "8000",
    percentComplete: "75",
    progressCaption: "Kitchen cooking · dining area still to finish",
    mealsPerDay: "2",
    kitchensCooking: "1",
    beforeHeading: "Before: cooking outdoors",
    beforeAlt:
      "A cooking pot balanced on stones over an open wood fire on bare ground",
    beforeBullets: [
      { text: "Open fire cooking outdoors" },
      { text: "No shelter, storage or dining space" },
      { text: "Exposed to weather & smoke" },
    ],
    afterHeading: "Now: the new kitchen",
    afterAlt: "The new kitchen building at Jepegomi Academy",
    afterBullets: [
      { text: "Brick walls & iron sheet roof" },
      { text: "Dedicated store room" },
      { text: "Dining area for 50+ children" },
    ],
  },
} satisfies CmsDocument;

/*
  The playground quote.

  Every figure on /projects/playground used to be a TypeScript array, with a
  comment at the top of it saying that when a supplier in Nairobi finally prices
  the job, "the priceKes figures here are the only lines to change" — a deploy,
  scheduled in a comment, for an event everybody knew was coming. It is a form
  now.

  Prices are in shillings because that is what a Kenyan job bought from Kenyan
  suppliers is quoted in. The dollars on the page are converted from these and
  never the other way round, so a move in the exchange rate moves the dollars and
  leaves the real cost alone. The rate is one field, in Site details.
*/
const playground = {
  title: "The Playground",
  path: "/projects/playground",
  group: "giving",
  description:
    "The playground appeal — what stands in the yard now, and what replacing it would cost. Prices are in Kenyan shillings; the dollars on the page are worked out from them and the rate in Site details.",
  fields: {
    equipmentHeading: { type: "text", label: "First half — heading" },
    equipmentBody: { type: "prose", label: "First half — summary" },
    equipment: {
      type: "list",
      label: "What they play on",
      itemLabel: "item",
      help: "One row per piece of equipment. Price in shillings, digits only.",
      fields: {
        item: { type: "text", label: "Item" },
        note: { type: "text", label: "Note" },
        priceKes: { type: "text", label: "Price (KSh)" },
      },
    },
    groundHeading: { type: "text", label: "Second half — heading" },
    groundBody: { type: "prose", label: "Second half — summary" },
    ground: {
      type: "list",
      label: "What they land on",
      itemLabel: "item",
      help: "Surfacing, footings and groundworks. Price in shillings, digits only.",
      fields: {
        item: { type: "text", label: "Item" },
        note: { type: "text", label: "Note" },
        priceKes: { type: "text", label: "Price (KSh)" },
      },
    },
    asItStands: {
      type: "list",
      label: "What is in the yard today",
      itemLabel: "line",
      help: "Read off the photograph. One line each; they render as a list.",
      fields: { text: { type: "text", label: "Line" } },
    },
    photo: { type: "image", label: "Photograph of the yard" },
    photoAlt: { type: "text", label: "Photograph — description for screen readers" },
    photoCaption: { type: "text", label: "Photograph — caption" },
  },
  defaults: {
    equipmentHeading: "What they play on",
    equipmentBody:
      "Five pieces of galvanised equipment — three that carry on from what is standing there now, and two that are new to the school.",
    equipment: [
      {
        item: "Swing set — four seats, galvanised steel frame",
        note: "Replaces the two welded frames standing there now",
        priceKes: "150000",
      },
      {
        item: "Climbing frame with monkey bars",
        note: "New to the school",
        priceKes: "180000",
      },
      {
        item: "Slide — 2.4 m, moulded deck on a steel frame",
        note: "Takes over from the frame standing in the yard",
        priceKes: "110000",
      },
      {
        item: "Merry-go-round — six seats",
        note: "New to the school",
        priceKes: "100000",
      },
      {
        item: "See-saw — two seats, galvanised steel",
        note: "Replaces the one made on site",
        priceKes: "55000",
      },
    ],
    groundHeading: "What they land on",
    groundBody:
      "80 m² of rubber crumb across the fall zone, on a base that drains, plus the footings that hold every frame in it.",
    ground: [
      {
        item: "Rubber crumb safety surfacing — 80 m² of fall zone",
        note: "40 mm wet-pour, supplied and laid at KSh 5,500/m²",
        priceKes: "440000",
      },
      {
        item: "Installation — concrete footings and fitting",
        note: "Every frame set in concrete below the surfacing",
        priceKes: "120000",
      },
      {
        item: "Levelling, edging and drainage under the surfacing",
        note: "The yard slopes and holds water; wet-pour needs a base that drains",
        priceKes: "80000",
      },
    ],
    asItStands: [
      {
        text: "Two swing frames welded from angle iron, with seats cut and folded by hand",
      },
      { text: "A slide frame, ready for a deck to be fitted to it" },
      { text: "A see-saw, made on site like the rest of it" },
      { text: "Bare packed earth underfoot, waiting for a soft surface" },
      {
        text: "All of it made at the church rather than bought, and out in the weather for years",
      },
    ],
    photo: "/photos/church/playground.jpg",
    photoAlt:
      "Two home-made steel swing frames with painted sheet-metal seats, a see-saw behind them and a rusted slide frame, all standing on bare earth beside the sanctuary",
    photoCaption:
      "The playground today — welded on site and painted by hand at the church.",
  },
} satisfies CmsDocument;

/*
  Two fields per arm of the ministry: who may read what it spent, and Simon's
  own paragraph about the figures.

  Generated from `NEED_AREAS` rather than from a registry of projects that have
  accounts, because there is no longer any such thing — a project has accounts
  the moment Simon records something it bought, in /app → Where the money went.
  Generating these from a list in a source file would mean he could enter a
  term's transport costs and have nothing appear, for a reason he cannot see.
  See the head of lib/project-accounts.ts.

  The keys come from that file too, so the schema, the form and the pages cannot
  drift apart on what a field is called.
*/
function accountFields() {
  const fields: Record<string, LeafField> = {};

  for (const area of NEED_AREAS) {
    fields[visibilityField(area.id)] = {
      type: "choice",
      label: `${area.label} — who may read the figures`,
      help: `What ${area.label.toLowerCase()} has bought, line by line, with what each thing was estimated at beside what it actually cost.`,
      options: ACCOUNT_VISIBILITIES,
    };

    fields[noteField(area.id)] = {
      type: "prose",
      label: `${area.label} — a note on the figures`,
      help: "The part a table cannot hold: why a line ran over, what you did about it, what you would do differently. Shown in a box under the table. Leave it blank and no box appears.",
    };
  }

  return fields;
}

function accountDefaults() {
  const defaults: Record<string, string> = {};

  for (const area of NEED_AREAS) {
    defaults[visibilityField(area.id)] = DEFAULT_VISIBILITY;
    defaults[noteField(area.id)] = "";
  }

  /*
    The kitchen's note, which lived in the accounts component as hard-coded
    English until this field existed. It is Pastor Simon's account of his own
    over-runs and it is the best thing on that page; it belongs where he can
    edit it.
  */
  defaults[noteField("kitchen")] =
    "Costs ran over on almost every line — cement, sand, drainage and ballast all cost more than planned, and the drainage work had to grow to satisfy NEEMA regulations. The one line that came in under was roofing and labour, because Pastor Simon did the building he knew how to do himself, and put the saved labour cost back into materials.";

  return defaults;
}

const projectAccounts = {
  title: "Project accounts",
  path: null,
  group: "giving",
  description:
    "Who can read what each project actually spent — the line-by-line figures behind it, and your own note on them. Record the spending itself under Where the money went. The public pages always show the totals and what is still needed; this is only about the detail underneath.",
  fields: accountFields(),
  defaults: accountDefaults(),
} satisfies CmsDocument;

/** Ordered as the ministry is: the church, then what it runs, then the rest. */
export const documents = {
  home,
  about,
  church,
  education,
  academy,
  college,
  programs,
  foodAtSchool,
  digital,
  transport,
  gallery,
  giving,
  projects,
  kitchen,
  needs,
  playground,
  projectAccounts,
  thanks,
  contact,
  site,
};

export type DocumentKey = keyof typeof documents;

/** The shape of a document's content is exactly the shape of its defaults. */
export type ContentOf<K extends DocumentKey> =
  (typeof documents)[K]["defaults"];

export function documentKeys() {
  return Object.keys(documents) as DocumentKey[];
}

/**
 * Every document, in its drawer, in `documentGroups` order. A group with
 * nothing in it is dropped rather than drawn empty.
 */
export function groupedDocuments() {
  return documentGroups
    .map((group) => ({
      ...group,
      keys: documentKeys().filter((key) => documents[key].group === group.id),
    }))
    .filter((group) => group.keys.length > 0);
}

export function isDocumentKey(value: string): value is DocumentKey {
  return Object.hasOwn(documents, value);
}
