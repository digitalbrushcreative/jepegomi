import { giving as givingDefaults, site as siteDefaults } from "@/lib/site";

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

export type CmsDocument = {
  title: string;
  /** The page this content appears on, for the "View page" link. Null for site-wide settings. */
  path: string | null;
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

const site = {
  title: "Site details",
  path: null,
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

const giving = {
  title: "Bank details",
  path: "/give",
  description: "How people send money. Check every character of this one.",
  fields: {
    bank: { type: "text", label: "Bank" },
    accountName: { type: "text", label: "Account name" },
    accountNumber: { type: "text", label: "Account number" },
    routingNumber: {
      type: "text",
      label: "Routing number",
      help: "Still needed — without it, nobody outside the US can send money.",
    },
    swift: {
      type: "text",
      label: "SWIFT / BIC",
      help: "Still needed for international transfers.",
    },
    reference: { type: "text", label: "Giving reference note" },
  },
  defaults: {
    bank: givingDefaults.bank,
    accountName: givingDefaults.accountName,
    accountNumber: givingDefaults.accountNumber,
    routingNumber: givingDefaults.routingNumber ?? "",
    swift: givingDefaults.swift ?? "",
    reference: givingDefaults.reference,
  },
} satisfies CmsDocument;

const about = {
  title: "About",
  path: "/about",
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

const home = {
  title: "Home",
  path: "/",
  description: "The front page — the hero and the three cards below it.",
  fields: {
    heading: { type: "text", label: "Headline" },
    intro: { type: "prose", label: "Intro" },
    cards: {
      type: "list",
      label: "Cards",
      itemLabel: "card",
      help: "The three panels below the hero. The link is a path on this site, like /give.",
      fields: {
        title: { type: "text", label: "Title" },
        body: { type: "prose", label: "Body" },
        href: { type: "text", label: "Link" },
        cta: { type: "text", label: "Link text" },
      },
    },
    closingEyebrow: { type: "text", label: "Closing eyebrow" },
    closingHeading: { type: "text", label: "Closing heading" },
    closingBody: { type: "prose", label: "Closing text" },
  },
  defaults: {
    heading: "Feeding children, building futures — in Nairobi.",
    intro:
      "Jesus People Gospel Ministries runs Jepegomi Academy and the Food at School program, giving children a hot meal and an education every day.",
    cards: [
      {
        title: "Food at School",
        body: "Every school day, children receive morning porridge and a hot lunch. For many it's their main meal of the day.",
        href: "/programs/food-at-school",
        cta: "See the program",
      },
      {
        title: "A real kitchen",
        body: "Right now meals are cooked outdoors over open fires. With Encounter Church, we're building a proper kitchen.",
        href: "/projects/kitchen",
        cta: "See the progress",
      },
      {
        title: "The ministry",
        body: `Led by ${siteDefaults.leaders}, Jepegomi serves its community through worship, education, and care.`,
        href: "/about",
        cta: "About Jepegomi",
      },
    ],
    closingEyebrow: "Partner With Us",
    closingHeading: "Help us finish the kitchen",
    closingBody:
      "Encounter Church of Palmyra, Pennsylvania gave $8,000 to replace the open fires with a proper kitchen. The structure is up. The finishing work is what's left.",
  },
} satisfies CmsDocument;

const academy = {
  title: "Academy",
  path: "/academy",
  description:
    "Jepegomi Academy. Fill in the four details at the bottom and they stop showing as “to be confirmed”.",
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
    founded: { type: "text", label: "Year founded" },
  },
  defaults: {
    eyebrow: "The School",
    heading: "Quality education with values",
    intro:
      "Jepegomi Academy educates children in the Kahawa community and anchors the Food at School program — the reason a hot meal reaches 50+ children every school day.",
    sectionEyebrow: "What we know",
    sectionTitle: "The school today",
    body: [
      `The Academy sits in ${siteDefaults.location}, run by the same hands as the church — ${siteDefaults.leaders}. Children come from families across the neighbourhood, many of whom cannot reliably provide meals at home.`,
      "Because the school feeds the children it teaches, the two are hard to separate: attendance, attention, and learning all move together with the meal.",
    ].join("\n\n"),
    // Deliberately blank: these are the open questions from SETUP.md. The page
    // flags each empty one instead of inventing a figure.
    ages: "",
    pupils: "",
    teachers: "",
    founded: "",
  },
} satisfies CmsDocument;

const foodAtSchool = {
  title: "Food at School",
  path: "/programs/food-at-school",
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
        body: "Children at Jepegomi Academy are fed twice a day — porridge when they arrive, and a cooked lunch in the middle of the day. More than 50 children eat this way, every day the school is open.",
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
      "With Encounter Church of Palmyra, Pennsylvania, we are building a real kitchen — with a store room and a dining area — to replace the open fires. The walls are up and the roof is on.",
  },
} satisfies CmsDocument;

const contact = {
  title: "Contact",
  path: "/contact",
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

export const documents = {
  home,
  about,
  academy,
  foodAtSchool,
  giving,
  contact,
  site,
};

export type DocumentKey = keyof typeof documents;

/** The shape of a document's content is exactly the shape of its defaults. */
export type ContentOf<K extends DocumentKey> = (typeof documents)[K]["defaults"];

export function documentKeys() {
  return Object.keys(documents) as DocumentKey[];
}

export function isDocumentKey(value: string): value is DocumentKey {
  return Object.hasOwn(documents, value);
}
