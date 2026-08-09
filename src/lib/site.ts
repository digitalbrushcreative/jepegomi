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
  location: "Kahawa, Nairobi, Kenya",
  leaders: "Pastor Simon & Joyce Nderitu",
  tagline:
    "A church and academy in Nairobi, feeding children and building futures.",
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
  { label: "About", href: "/about" },
  { label: "Church", href: "/church" },
  {
    label: "Education",
    href: "/education",
    children: [
      {
        label: "Jepegomi Academy",
        href: "/academy",
        blurb: "Quality education with values — the school in Kahawa.",
      },
      {
        label: "Bible College",
        href: "/college",
        blurb: "The Contextual Bible Training College — the ministry's training arm.",
      },
    ],
  },
  {
    label: "Programs",
    href: "/programs",
    children: [
      {
        label: "Food at School",
        href: "/programs/food-at-school",
        blurb: "Morning porridge and a hot lunch, every school day.",
      },
      {
        label: "Jepegomi Digital",
        href: "/programs/digital",
        blurb: "Services streamed from Kahawa on YouTube and Facebook.",
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
    children: [
      {
        label: "Kitchen Build",
        href: "/projects/kitchen",
        blurb: "From open fires to a proper kitchen. Follow the progress.",
      },
    ],
  },
  { label: "Contact", href: "/contact" },
];
