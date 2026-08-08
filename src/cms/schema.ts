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
  | { type: "image"; label: string; help?: string };

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
  },
  defaults: {
    name: siteDefaults.name,
    longName: siteDefaults.longName,
    tagline: siteDefaults.tagline,
    email: siteDefaults.email,
    location: siteDefaults.location,
    leaders: siteDefaults.leaders,
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
    eyebrow: { type: "text", label: "Eyebrow" },
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    waysEyebrow: { type: "text", label: "Section eyebrow" },
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
    howEyebrow: { type: "text", label: "How to give — eyebrow" },
    howHeading: { type: "text", label: "How to give — heading" },
    howBody: { type: "prose", label: "How to give — text" },
    designationNote: {
      type: "prose",
      label: "Note about choosing where a gift goes",
    },
  },
  defaults: {
    eyebrow: "Partner With Us",
    heading: "Support the ministry",
    intro:
      "Gifts to Jepegomi keep children fed and taught, the church serving its neighbourhood, and the building work moving. Every one of them goes further here than it would almost anywhere else.",
    waysEyebrow: "Where gifts go",
    waysHeading: "One ministry, four kinds of work",
    ways: [
      {
        title: "The church",
        body: "The congregation in Kahawa — the ministry everything else grew out of, and the people who run it day to day.",
      },
      {
        title: "The academy",
        body: "Jepegomi Academy: teachers' pay, books, desks, and the everyday cost of keeping a school open for children whose families could not otherwise afford one.",
      },
      {
        title: "Food at School",
        body: `Morning porridge and a hot lunch for all ${pupilsEnrolled} children, every school day. For many of them it is the meal they can count on.`,
      },
      {
        title: "Building work",
        body: "The kitchen build, and what comes after it. Gifts here buy materials and pay the trades doing the work.",
      },
    ],
    howEyebrow: "The other way to give",
    howHeading: "Or write to us and we will send the details",
    howBody: `If you would rather not pay on the site — and a bank transfer from overseas is usually better sent that way — we will send you the account details instead. We do not publish bank or M-Pesa details here, so ${siteDefaults.leaders} reply with the right account for wherever you are giving from.\n\nIt also means we can thank you properly, and tell you what your gift did.`,
    designationNote:
      "Tell us if you would like your gift to go to something in particular. If you don't, it goes wherever the need is greatest that month.",
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
    eyebrow: { type: "text", label: "Eyebrow" },
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    emptyNote: {
      type: "prose",
      label: "When nothing is listed",
      help: "Shown in place of the list while there is nothing published — so the page is never blank.",
    },
    howEyebrow: { type: "text", label: "How it works — eyebrow" },
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
      label: "Note about partner logins",
      help: "Shown beside the sign-in link, explaining what a church gets a login for.",
    },
  },
  defaults: {
    eyebrow: "Transparent Giving",
    heading: "What's needed, and what it costs",
    intro: [
      "Every item below is one thing the ministry is short of, with the price on it. You can take all of an item or part of one — whatever you give is held against it, and the balance stays open for somebody else to pick up.",
      "The figures are the real ones. What has arrived, what has been promised and what is still open are all on the page, and they are the same numbers Pastor Simon works from.",
    ].join("\n\n"),
    emptyNote:
      "There is nothing listed at the moment. That does not mean nothing is needed — it means nothing has been costed carefully enough to put a figure in front of you, and we would rather show you nothing than a guess. Write to us and we will tell you where things stand.",
    howEyebrow: "How it works",
    howHeading: "From choosing an item to seeing the photographs",
    steps: [
      {
        title: "Choose an item, and an amount",
        body: "Take the whole thing or part of it. The moment you claim an amount it shows as promised on the page, so nobody else is asked for it — and the rest stays open.",
      },
      {
        title: "Pay it, or ask for the details",
        body: "Pay by M-Pesa or card and it is done in a minute — card details are entered on Pesapal's own page, never on this site. Or ask for the account details instead, and Pastor Simon replies himself with the right account for wherever you are giving from.",
      },
      {
        title: "The gift is marked received",
        body: "A payment on the site records itself the moment it clears. A gift sent another way is marked received by hand when it lands. Either way the page updates, and every figure on it is one somebody stands behind.",
      },
      {
        title: "You see what it did",
        body: "Progress on the item is posted back with photographs, so the thing you paid for is a thing you can look at.",
      },
    ],
    partnerNote:
      "Churches and regular partners can be given a login, which shows every item they have supported, what has arrived against each, and the updates as they are posted. It shows their own giving only — never anybody else's.",
  },
} satisfies CmsDocument;

const about = {
  title: "About",
  path: "/about",
  group: "main",
  description: "The church & the Nderitus.",
  fields: {
    eyebrow: { type: "text", label: "Eyebrow", help: "The small label above the heading." },
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
    eyebrow: "The Ministry",
    heading: "The church & the Nderitus",
    intro: `${siteDefaults.longName} is a church and academy in Nairobi led by ${siteDefaults.leaders}.`,
    portrait: "/photos/founders/simon-and-joyce.png",
    portraitAlt: `${siteDefaults.leaders}, who lead ${siteDefaults.longName}`,
    body: [
      "Their work joins the spiritual and the practical: a place to worship, a school to learn in, and a daily meal for children who need one. Everything on this site flows from that mission.",
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
    eyebrow: { type: "text", label: "Eyebrow" },
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    sectionEyebrow: { type: "text", label: "Section eyebrow" },
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
        detail: { type: "text", label: "Note", help: "Optional — language, who it's for, anything worth saying." },
      },
    },
    address: {
      type: "text",
      label: "Where we meet",
      help: "The address people should actually turn up to. Leave blank while it is unconfirmed.",
    },
  },
  defaults: {
    eyebrow: "The Church",
    heading: "The church at the centre of it",
    intro: `${siteDefaults.longName} is a church in ${siteDefaults.location}, led by ${siteDefaults.leaders}. The academy, the college and the feeding program all belong to it.`,
    sectionEyebrow: "Come and worship",
    sectionTitle: "Sunday at Jepegomi",
    body: [
      "The congregation gathers each week to worship, pray and hear the Word together. It is the oldest thing the ministry does, and the thing the rest of it is built on.",
      "Visitors are welcome — you do not need to know anybody, and you do not need to bring anything.",
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
    "The Contextual Bible Training College — the programmes, the fees, and where fees are paid.",
  fields: {
    eyebrow: { type: "text", label: "Eyebrow" },
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    sectionEyebrow: { type: "text", label: "Section eyebrow" },
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
    feesEyebrow: { type: "text", label: "Fees — eyebrow" },
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
    eyebrow: "The College",
    heading: "Contextual Bible Training College",
    intro: `The college is the training arm of ${siteDefaults.longName} — Bible teaching rooted in the community it serves, alongside the church and the school.`,
    sectionEyebrow: "What we know",
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
    feesEyebrow: "Programmes & fees",
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

const home = {
  title: "Home",
  path: "/",
  group: "main",
  description:
    "The front page — the rotating hero slides, and the four cards below them.",
  fields: {
    heading: { type: "text", label: "Headline" },
    intro: { type: "prose", label: "Intro" },
    slides: {
      type: "list",
      label: "Hero slides",
      itemLabel: "slide",
      help: "The rotating panels at the top of the front page — one for each arm of the ministry. The mark shown on a slide follows its link, so keep the link pointing where it does now.",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "text", label: "Headline" },
        body: { type: "prose", label: "Text" },
        href: { type: "text", label: "Link" },
        cta: { type: "text", label: "Link text" },
      },
    },
    cards: {
      type: "list",
      label: "Cards",
      itemLabel: "card",
      help: "The panels below the hero — one for each arm of the ministry. The link is a path on this site, like /give.",
      fields: {
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Body" },
        href: { type: "text", label: "Link" },
        cta: { type: "text", label: "Link text" },
      },
    },
    needsEyebrow: { type: "text", label: "Needs eyebrow" },
    needs: {
      type: "list",
      label: "Current needs",
      itemLabel: "need",
      help: "The appeal on the front page — one panel per need, switched by the buttons above it. The kitchen's figures and its pot are read from the budget and cannot be edited here; they would drift out of step with the Kitchen page. Put the need you most want giving to first.",
      fields: {
        label: {
          type: "text",
          label: "Short name",
          help: "What the button switching to this need says — two or three words.",
        },
        heading: { type: "text", label: "Heading" },
        body: { type: "prose", label: "Text" },
        status: {
          type: "text",
          label: "Where it stands",
          help: "Shown on the card beside the need. The kitchen ignores this and shows its pot instead.",
        },
        giveCta: { type: "text", label: "Give button text" },
        cta: { type: "text", label: "Second link text" },
        href: { type: "text", label: "Second link" },
      },
    },
    closingEyebrow: { type: "text", label: "Closing eyebrow" },
    closingHeading: { type: "text", label: "Closing heading" },
    closingBody: { type: "prose", label: "Closing text" },
  },
  defaults: {
    /*
      The headline names all four arms, because the front page used to name only
      one. This site began life as the Kitchen Build report and grew outwards,
      and it kept the report's centre of gravity long after it had stopped being
      a report: the feeding program was the headline, the pot, the numbers and
      the closing ask. The church it all belongs to was a card at the bottom.
    */
    heading: "A church, a school, a Bible college, and a hot meal every day.",
    intro: [
      `${siteDefaults.longName} is a church in ${siteDefaults.location}, led by ${siteDefaults.leaders}. Alongside it stand Jepegomi Academy, the Contextual Bible Training College, and the Food at School program.`,
      "Worship, education, training, and a meal a child can count on. It is one ministry, and all of it is the work.",
    ].join("\n\n"),
    /*
      One slide per arm, in the ministry's own order: the church, the school it
      runs, the college it trains in, and the program that feeds the children it
      teaches. Every slide carries the Give button, so leading with the church
      costs the appeal nothing.
    */
    slides: [
      {
        eyebrow: "Sunday Services",
        title: "The church at the centre of it.",
        body: "The congregation in Kahawa — the church that the academy, the college and the feeding program all belong to. Visitors are welcome.",
        href: "/church",
        cta: "Visit the church",
      },
      {
        eyebrow: "Jepegomi Academy",
        title: "Quality education with values.",
        body: "The school in Kahawa where the children learn — and where every one of those meals is served.",
        href: "/academy",
        cta: "See the Academy",
      },
      {
        eyebrow: "Contextual Bible Training College",
        title: "Bible training, rooted in this community.",
        body: "The training arm of the ministry, teaching the Scriptures in and for the community the church already serves.",
        href: "/college",
        cta: "About the college",
      },
      {
        eyebrow: "Food at School",
        title: "Every child eats, every school day.",
        body: "Children receive morning porridge and a hot lunch. For many of them it is the main meal of their day.",
        href: "/programs/food-at-school",
        cta: "See the program",
      },
    ],
    /*
      Four cards, one per arm, all the same size. The kitchen is not among them —
      not because it matters less, but because it now has the whole section
      below to itself, which is more than a quarter of a card row ever was.
    */
    cards: [
      {
        title: "Sunday Services",
        body: "Worship, prayer and teaching in Kahawa, week by week. The oldest thing the ministry does.",
        href: "/church",
        cta: "Visit the church",
      },
      {
        title: "Jepegomi Academy",
        body: "Quality education with values — the school at the heart of the community, and where the meals are served.",
        href: "/academy",
        cta: "See the Academy",
      },
      {
        title: "Bible College",
        body: "The Contextual Bible Training College — the ministry's training arm, teaching the Scriptures where they are lived.",
        href: "/college",
        cta: "About the college",
      },
      {
        title: "Food at School",
        body: "Morning porridge and a hot lunch, every school day. For many children it's their main meal of the day.",
        href: "/programs/food-at-school",
        cta: "See the program",
      },
    ],
    needsEyebrow: "Current needs",
    /*
      Both needs now have a costing, a donor and a figure still missing — the
      kitchen leads only because it is nearer to done.

      Neither body repeats the figures. They are rendered beside the words from
      content/kitchen.ts and content/transport.ts, and a number typed here as
      well would be a second copy free to drift away from the first the day
      anybody edits this page.
    */
    needs: [
      {
        label: "The kitchen",
        heading: "Help us finish the kitchen",
        body: "Every one of those meals is still cooked outdoors, over an open fire. A partner church in the United States gave $8,000 to replace the fires with a proper kitchen — the structure is up, and the finishing work is what's left.",
        status: "",
        giveCta: "Give to the kitchen",
        cta: "Follow the build",
        href: "/projects/kitchen",
      },
      {
        label: "The school bus",
        heading: "Get the children to school",
        body: "The academy's van is off the road. The same partner church that built the kitchen has given a further $1,000 to repair it and bring it back.\n\nBeyond that, the school has outgrown a van. A 26-seater bus carries it as it is now and leaves room for the children still to come, and the whole cost of it is still to raise.",
        status: "",
        giveCta: "Give to the bus",
        cta: "See the appeal",
        href: "/programs/transport",
      },
    ],
    closingEyebrow: "Partner With Us",
    closingHeading: "Stand with the whole ministry",
    closingBody:
      "A gift to Jepegomi holds up all of it — the church on Sunday, the classroom on Monday, the college that trains the next teachers, and the meal a child eats at school tomorrow.",
  },
} satisfies CmsDocument;

const academy = {
  title: "Academy",
  path: "/academy",
  group: "ministry",
  description:
    "Jepegomi Academy. Fill in the school details at the bottom and they stop showing as “to be confirmed”.",
  fields: {
    eyebrow: { type: "text", label: "Eyebrow" },
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
    sectionEyebrow: { type: "text", label: "Section eyebrow" },
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
    eyebrow: "The School",
    heading: "Quality education with values",
    intro:
      `Jepegomi Academy educates children in the Kahawa community and anchors the Food at School program — the reason a hot meal reaches all ${pupilsEnrolled} of them every school day.`,
    sectionEyebrow: "What we know",
    sectionTitle: "The school today",
    body: [
      `The Academy sits in ${siteDefaults.location}, run by the same hands as the church — ${siteDefaults.leaders}. Children come from families across the neighbourhood, many of whom cannot reliably provide meals at home.`,
      "It did not start where it stands. The first classrooms were a row of iron-sheet rooms on the roadside, with the school's name painted on by hand. Lessons happen in semi-permanent blocks now — stone to the window sill, iron sheet above, a proper roof over both — and the bigger classrooms the government requires are going up behind them.",
      "Because the school feeds the children it teaches, the two are hard to separate: attendance, attention, and learning all move together with the meal.",
    ].join("\n\n"),
    ages: "Kindergarten to Grade 6",
    pupils: pupilsEnrolled,
    teachers: "9",
    staff: "3",
    founded: "2016",
  },
} satisfies CmsDocument;

const foodAtSchool = {
  title: "Food at School",
  path: "/programs/food-at-school",
  group: "programs",
  description: "The feeding program.",
  fields: {
    eyebrow: { type: "text", label: "Eyebrow" },
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
    closingEyebrow: { type: "text", label: "Closing eyebrow" },
    closingHeading: { type: "text", label: "Closing heading" },
    closingBody: { type: "prose", label: "Closing text" },
  },
  defaults: {
    eyebrow: "A program of Jepegomi Academy",
    heading: "A hot meal, every school day",
    intro:
      "Food at School gives children at Jepegomi Academy morning porridge and a cooked lunch — for many of them, the most reliable meal of their day.",
    sections: [
      {
        eyebrow: "What it is",
        title: "Morning porridge. A hot lunch. Every school day.",
        body: `Children at Jepegomi Academy are fed twice a day — porridge when they arrive, and a cooked lunch in the middle of the day. All ${pupilsEnrolled} of them eat this way, every day the school is open.`,
      },
      {
        eyebrow: "Why it matters",
        title: "For many, this is the meal they can count on.",
        body: "A number of the children come from homes that cannot reliably put food on the table. The meal at school is the one they know is coming. A fed child can learn; a hungry one cannot.",
      },
      {
        eyebrow: "The challenge today",
        title: "It is all cooked outdoors, on open fires.",
        body: "There is no kitchen. Meals are cooked over open flames in the open air — slow, unsafe in bad weather, smoky, and hard to keep clean. There is nowhere proper to store food and nowhere for the children to sit and eat.",
      },
    ],
    closingEyebrow: "What's changing",
    closingHeading: "A proper kitchen is being built",
    closingBody:
      "With a partner church in the United States, we are building a real kitchen — with a store room and a dining area — to replace the open fires. The walls are up and the roof is on.",
  },
} satisfies CmsDocument;

const digital = {
  title: "Jepegomi Digital",
  path: "/programs/digital",
  group: "programs",
  description:
    "The streaming ministry — the YouTube and Facebook channels, and what it takes to keep them running.",
  fields: {
    eyebrow: { type: "text", label: "Eyebrow" },
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
      The channel's name is known — it is written across the screenshots in the
      deck. Its address is not, and a guessed YouTube handle is worse than none:
      it either 404s or lands somebody on a stranger's channel while wearing
      this ministry's name. Blank until Simon pastes the real one, and the page
      says so rather than linking into the dark.
    */
    youtubeName: { type: "text", label: "YouTube channel name" },
    youtubeUrl: {
      type: "text",
      label: "YouTube channel address",
      help: "The full link, e.g. https://youtube.com/@…. Leave blank and the page will say the link is still to be confirmed rather than guess it.",
    },
    facebookUrl: {
      type: "text",
      label: "Facebook page address",
      help: "The full link. Same rule as YouTube — blank is better than wrong.",
    },
    supportEyebrow: { type: "text", label: "Support eyebrow" },
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
    eyebrow: "Preaching the gospel in Kenya and beyond",
    heading: "The pulpit, online",
    intro:
      "When the lockdowns closed the doors, the sermons went out over the internet instead — and never stopped. Sunday services and weekday fellowships are streamed from the sanctuary in Kahawa to whoever will watch, wherever they are.",
    sections: [
      {
        eyebrow: "Where it started",
        title: "A closed church, and a camera.",
        body: "The streaming began during the COVID lockdown, for the plainest of reasons: the congregation could not come. What began as a way to reach the people who already belonged to the church has carried on reaching people who never could have — the messages now travel far past Kahawa.",
      },
      {
        eyebrow: "What goes out",
        title: "Sunday services and weekday fellowships, on two channels.",
        body: "Services are streamed on Sunday and again through the week, on both YouTube and Facebook. The teaching is given by Simon and Joyce under the GOFAMI banner — God for the Family Ministries — and the archive of past messages stays up for anyone who wants to go back to one.",
      },
      {
        eyebrow: "What makes it hard",
        title: "It is filmed on phones, and the lighting fights back.",
        body: "Everything is recorded on mobile phones, which sets a ceiling on how good the picture and the sound can be. The lighting is inconsistent, editing and uploading are slow, and nobody in the church has been trained to run any of it — so the whole thing rests on whoever has time that week.",
      },
    ],
    youtubeName: "Jepegomi Africa",
    // Neither of these is known. See SETUP.md.
    youtubeUrl: "",
    facebookUrl: "",
    supportEyebrow: "Pray. Give. Watch.",
    supportHeading: "How you can partner with us",
    supportIntro:
      "The cheapest way to help is free: watch a stream and share it. Everything after that is equipment and connection — the two things standing between a message worth hearing and a recording worth watching.",
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
    "The school run, and the appeal for a bigger bus. The cost itself lives in src/content/transport.ts, not here.",
  fields: {
    eyebrow: { type: "text", label: "Eyebrow" },
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
    supportEyebrow: { type: "text", label: "Support eyebrow" },
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
    eyebrow: "Getting the children to school",
    heading: "The school run",
    intro:
      "Children come to Jepegomi Academy from across Kahawa, and how they get there decides whether some of them get there at all. The van the school bought is off the road, and the ministry is raising for a bus of its own.",
    sections: [
      {
        eyebrow: "Where we are",
        title: "One van, off the road.",
        body: "The academy has a van — a yellow Toyota, lettered for the school and the church. It was bought with $5,000 given toward a school vehicle, and it did that work for as long as it could. It is not running now. It broke down and has been standing since, which means the school run it used to do is not being done.\n\nThe same partner church that built the kitchen has given a further $1,000 to repair it and get it back on the road.",
      },
      {
        eyebrow: "Where that money went",
        title: "The $5,000 is the van.",
        body: "Giving toward a school vehicle reached $5,000, and that is what bought the van standing at the school. It is a vehicle, not a balance — none of it is sitting in a bank account waiting, and none of it is left over to put toward a bus.\n\nSo the bus fund starts at nothing. The figures below are the whole cost of it, not a gap left over after a balance.",
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
    supportEyebrow: "Pray. Give. Sponsor.",
    supportHeading: "How you can partner with us",
    supportIntro:
      "The whole cost is the ask, because nothing is banked against it yet. Every gift toward it is held for the bus and nothing else — the way the $5,000 given for a school vehicle went to the van and nowhere else.",
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
    eyebrow: { type: "text", label: "Eyebrow" },
    heading: { type: "text", label: "Heading" },
    intro: { type: "prose", label: "Intro" },
  },
  defaults: {
    eyebrow: "Get in touch",
    heading: "Contact",
    intro:
      "We would love to hear from you — whether you want to give, partner, or just ask a question.",
  },
} satisfies CmsDocument;

/** Ordered as the ministry is: the church, then what it runs, then the rest. */
export const documents = {
  home,
  about,
  church,
  academy,
  college,
  foodAtSchool,
  digital,
  transport,
  giving,
  needs,
  contact,
  site,
};

export type DocumentKey = keyof typeof documents;

/** The shape of a document's content is exactly the shape of its defaults. */
export type ContentOf<K extends DocumentKey> = (typeof documents)[K]["defaults"];

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
