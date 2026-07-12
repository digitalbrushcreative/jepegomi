export const site = {
  name: "Jepegomi",
  longName: "Jesus People Gospel Ministries",
  domain: "jepegomi.org",
  url: "https://jepegomi.org",
  email: "jepegomi@gmail.com",
  location: "Kahawa, Nairobi, Kenya",
  leaders: "Pastor Simon & Joyce Nderitu",
  tagline:
    "A church and academy in Nairobi, feeding children and building futures.",
} as const;

/**
 * Bank details as given by Simon & Joyce.
 * OPEN ITEM: routing / SWIFT still needed before this is usable from outside the US.
 */
export const giving = {
  bank: "Fulton Bank",
  accountName: "Simon and Joyce Nderitu",
  accountNumber: "0100-33852",
  reference: 'Please include "Food at School / Kitchen" as your giving reference.',
  routingNumber: null,
  swift: null,
} as const;

export type NavLink = {
  label: string;
  href: string;
  children?: { label: string; href: string; blurb: string }[];
};

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Academy", href: "/academy" },
  {
    label: "Programs",
    href: "/programs",
    children: [
      {
        label: "Food at School",
        href: "/programs/food-at-school",
        blurb: "Morning porridge and a hot lunch, every school day.",
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
