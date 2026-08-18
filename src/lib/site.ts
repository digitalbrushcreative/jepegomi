export const site = {
  name: "Jepegomi",
  longName: "Jesus People Gospel Ministries",
  domain: "jepegomi.org",
  /*
    The www host, deliberately, while `domain` above stays bare.

    Vercel serves the site at www and answers the apex with a 308 to it. So the
    bare address still *works* everywhere a person types it — but anything the
    code emits as a link should point at the host that answers, not at the one
    that redirects: a canonical URL in a page's metadata, an Open Graph tag, the
    "see what is needed" button in an email. A redirect is free for a reader and
    not free for a crawler deciding which of two addresses is the real page.

    `domain` is what gets *printed* — "jepegomi.org/needs" reads better than the
    www — so the two are separate on purpose. Display the bare one, link the
    real one.
  */
  url: "https://www.jepegomi.org",
  /*
    The address printed on the site, and the one every form tells people to
    reply to. It is at the ministry's own domain rather than at gmail.com for
    two reasons: a personal Gmail address on a fundraising site invites the
    obvious impersonation, and an address at the domain outlives whoever happens
    to be answering it this year. Mail to it is delivered to the ministry's
    mailbox *and* forwarded to jepegomi@gmail.com, so nothing waits to be read —
    see lib/mail/inboxes.ts, and MAIL.md for the DNS behind it.
  */
  email: "support@jepegomi.org",
  location: "Kahawa Sukari, Nairobi, Kenya",
  /*
    The same place as `location` above, broken into the fields a search engine
    and a map want it in. It is deliberately a restatement rather than something
    parsed out of that string: splitting "Kahawa Sukari, Nairobi, Kenya" on
    commas works until the day somebody writes the address with an estate name
    or a postal code in it, and then the country silently becomes "Nairobi".

    No `streetAddress` here, and that is the point — nobody has confirmed one.
    The CMS has a church address field that is blank on purpose (see the note on
    it in cms/schema.ts), and the structured data picks it up if it is ever
    filled in. A guessed street on a map listing sends somebody to a stranger's
    gate.
  */
  address: {
    locality: "Kahawa Sukari",
    region: "Nairobi",
    country: "KE",
  },
  leaders: "Pastor Simon & Joyce Nderitu",
  tagline:
    "A church, a school and a Bible college in Nairobi — teaching children, training adults, and building what they learn in.",
} as const;

/*
  Account numbers are deliberately not here, and not anywhere else in this
  repository. The site tells people how to ask for them; Simon & Joyce send the
  details themselves, to the person giving. A published account number is a
  standing invitation to whoever wants to impersonate the ministry — and a
  number on a page can be quietly edited by anyone who gets into the CMS, with
  nothing on the page to say it changed.
*/
export const giving = {
  /** Prefills the subject so the reply is easy to find among everything else. */
  subject: "Giving to Jepegomi",
} as const;

export type NavLink = {
  label: string;
  href: string;
  /**
   * One line saying what is behind the link.
   *
   * The dropdowns have carried these from the start, for a reader deciding
   * which of two pages they want. The top-level entries have them now for the
   * same reason plus a second one: the footer prints the whole tree with its
   * blurbs on every page, so these are the words that describe this site's
   * pages to anything reading it — a person skimming the bottom of the page, a
   * search engine weighing what /programs is *about*, an assistant summarising
   * the ministry. A link labelled "Programs" says nothing on its own.
   *
   * Optional only because Home does not need one: it is the page the footer is
   * already sitting on, and "the front page" is not a description.
   */
  blurb?: string;
  children?: { label: string; href: string; blurb: string }[];
};

/*
  All four arms of the ministry are reachable from the top level, but they are
  not four separate items: the school and the college are both the ministry
  teaching, so they sit together under Education. That keeps the nav to seven
  and — more to the point — says something true. The academy teaches children
  and the college teaches adults; they are one arm with two ends, not rivals for
  a slot in the bar.

  Both keep their own short URLs. /academy is what a parent would type, and a
  school's address should not be three words long just because the nav groups it.
*/
export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  {
    label: "About",
    href: "/about",
    blurb:
      "Who Jepegomi is, and the family who started it — Pastor Simon & Joyce Nderitu.",
  },
  {
    label: "Church",
    href: "/church",
    blurb:
      "The congregation in Kahawa Sukari, and the oldest thing the ministry does.",
  },
  {
    label: "Education",
    href: "/education",
    blurb:
      "Two schools under one ministry: an academy for children, a Bible college for adults.",
    children: [
      {
        label: "Jepegomi Academy",
        href: "/academy",
        blurb: "Quality education with values — the school in Kahawa Sukari.",
      },
      {
        label: "Bible College",
        href: "/college",
        blurb:
          "The Contextual Bible Training College — the ministry's training arm.",
      },
    ],
  },
  {
    label: "Programs",
    href: "/programs",
    blurb:
      "What the ministry runs week by week — feeding, streaming and school transport.",
    children: [
      {
        label: "Food at School",
        href: "/programs/food-at-school",
        blurb: "Morning porridge and a hot lunch, every school day.",
      },
      {
        label: "Jepegomi Digital",
        href: "/programs/digital",
        blurb: "Services streamed from Kahawa Sukari on YouTube and Facebook.",
      },
      {
        label: "School Transport",
        href: "/programs/transport",
        blurb: "The school van, and the bus the academy is raising for.",
      },
    ],
  },
  {
    label: "Projects",
    href: "/projects",
    blurb:
      "The things being raised for — the kitchen that cooks the meals, the playground that needs replacing, the bus, and the kit the services go out on.",
    children: [
      {
        label: "Kitchen Build",
        href: "/projects/kitchen",
        blurb: "From open fires to a proper kitchen. See what is left.",
      },
      {
        label: "The Playground",
        href: "/projects/playground",
        blurb: "Welded on site, standing on bare earth. What replacing it costs.",
      },
      /*
        These two point into /programs, which is where the work they belong to
        is written up. The programme runs whether or not anybody gives; the
        project is the one purchase that would change it, and this menu is a
        list of those. Naming them apart is what stops "give to school
        transport" reading like a subscription to a bus route.
      */
      {
        label: "Bus Upgrade",
        href: "/programs/transport",
        blurb: "The van the school has outgrown, and what a 26-seater costs.",
      },
      {
        label: "Service Livestream",
        href: "/programs/digital",
        blurb: "The camera, the laptop and the connection the services go out on.",
      },
    ],
  },
  {
    label: "Contact",
    href: "/contact",
    blurb: "How to reach the ministry, visit, or ask a question.",
  },
];

/*
  The two giving pages, kept out of `navLinks` because they are not part of the
  bar — it is already at seven items plus the Give button — but they belong in
  any list of this site's pages that is meant to be complete. The footer prints
  them, and they are the two most valuable pages here to anybody arriving from a
  search: one says what is needed, the other says how to send it.

  /partners is deliberately absent. It is a door for the handful of churches who
  have been given a code, and a blurb advertising a room almost every visitor
  cannot open is noise on every page of the site. The footer links it plainly,
  without a description, the way it always has.
*/
export const givingLinks: { label: string; href: string; blurb: string }[] = [
  {
    label: "What's needed",
    href: "/needs",
    blurb:
      "The open ledger — every costed item, what it comes to, and how much is still short.",
  },
  {
    label: "How to give",
    href: "/give",
    blurb:
      "Ways to send a gift to the ministry from Kenya or abroad, and what happens next.",
  },
];
