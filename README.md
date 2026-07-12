# jepegomi.org

The website for **Jepegomi** — Jesus People Gospel Ministries, a church and
academy in Kahawa, Nairobi, led by Pastor Simon & Joyce Nderitu.

It holds three things: the public marketing site, the **Kitchen Build** progress
report, and the **photo tool** the family uses to keep that report up to date.

See [SETUP.md](SETUP.md) to run, configure, and deploy it.

## Routes

| Route                      | What it is                                          |
| -------------------------- | --------------------------------------------------- |
| `/`                        | Home                                                |
| `/about`                   | The church & the Nderitus                           |
| `/academy`                 | Jepegomi Academy                                    |
| `/programs`                | Programs hub                                        |
| `/programs/food-at-school` | The feeding program — porridge + lunch              |
| `/projects`                | Projects hub                                        |
| `/projects/kitchen`        | **The report** — photos, before/after, budget, give |
| `/app`                     | Photo tool (passphrase-gated)                       |
| `/give`                    | Fulton Bank giving details                          |
| `/contact`                 | Contact + map                                       |

Programs and Projects are hubs built to hold more than one child. Each has one
today; adding a second is a new entry in the array at the top of
`src/app/programs/page.tsx` or `src/app/projects/page.tsx`, plus a page.

## How the pieces fit

`src/content/kitchen.ts` is the single source of truth for the Kitchen Build —
the 23 photo slots, their four categories, the before/after pair, the budget
lines and the stats. Both `/projects/kitchen` and `/app` read from it, which is
what keeps the tool's slots aligned 1:1 with the report's.

The design tokens in `src/app/globals.css` are carried over from the original
standalone report, so the report page sits inside the site without looking like
a guest. The original is kept in `reference/` for comparison.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4. Every route
prerenders as a static page.
