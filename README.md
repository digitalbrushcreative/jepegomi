# jepegomi.org

The website for **Jepegomi** — Jesus People Gospel Ministries, a church and
academy in Kahawa Sukari, Nairobi, led by Pastor Simon & Joyce Nderitu.

It holds four things: the public marketing site, the **Kitchen Build** progress
report, the **transparent giving ledger** where churches claim costed items and
watch what they paid for, and the **CMS** the family uses to run all of it.

See [SETUP.md](SETUP.md) to run, configure, and deploy it.

## Routes

| Route                      | What it is                                          |
| -------------------------- | --------------------------------------------------- |
| `/`                        | Home                                                |
| `/about`                   | The church & the Nderitus                           |
| `/church`                  | Sunday services                                     |
| `/education`               | Education hub — the Academy and the college         |
| `/academy`                 | Jepegomi Academy                                    |
| `/college`                 | Contextual Bible Training College                   |
| `/programs`                | Programs hub                                        |
| `/programs/food-at-school` | The feeding program — porridge + lunch              |
| `/projects`                | Projects hub                                        |
| `/projects/kitchen`        | **The report** — photos, before/after, budget, give |
| `/needs`                   | **The giving ledger** — costed items, and what is left on each |
| `/needs/[slug]`            | One item: its figures, its progress, and the claim form |
| `/partners`                | Partner sign-in — an emailed code, no password       |
| `/partners/dashboard`      | A giver's own giving, and updates on what it paid for |
| `/partners/password`       | The older door, for churches issued a password by hand |
| `/app`                     | The CMS (sign-in)                                   |
| `/give`                    | Where gifts go, and how to ask for the details      |
| `/contact`                 | Contact + map                                       |

`/church`, `/academy`, `/college` and `/programs/food-at-school` are the four arms
of the ministry, and the front page treats them as equals: one hero slide each,
one card each. That is deliberate. The site grew out of the Kitchen Build report,
and for a while the front page still read like one — the feeding program had the
headline, the numbers and the closing ask, while the church it all belongs to was
a card at the bottom. The appeal now lives in a single section of its own on the
home page — a **needs slider**, one panel per current need, because the kitchen
is no longer the only thing being asked for: academy transport sits beside it,
and anything else can be added as a row under Home → Current needs in `/app`. It
does not rotate on a timer the way the hero does; an ask with figures in it stays
put until a reader moves it.

The **nav** groups where the front page does not: the Academy and the college are
both the ministry teaching, so they share an `Education` menu rather than two
slots in the bar. Note that unlike the Programs and Projects hubs, `/education`'s
children do not live beneath it — the school keeps `/academy`, which is the URL a
parent would actually type.

Programs and Projects are hubs built to hold more than one child. Each has one
today; adding a second is a new entry in the array at the top of
`src/app/programs/page.tsx` or `src/app/projects/page.tsx`, plus a page.

## Transparent giving

`/give` asks for the ministry as a whole. `/needs` asks for one thing at a time,
with the price on it and the books open beside it.

A **need** is a single item with a single cost — a water tank, $850. A church or
a person can claim **all of it or part of it**; whatever they leave stays open
for somebody else, and the page says so in dollars. Three figures are public on
every item: what has arrived, what has been promised, and what is still open.
**No donor names are published anywhere**, and no page shows how many people
gave — whether the $400 came from one church or from eight is not a visitor's
business, and not something their own gift should be measured against.

Nothing takes a payment. A claim holds an amount against an item; Pastor Simon
replies with the account details himself, exactly as `/give` already worked, and
marks the money received in `/app` when it lands. Every figure on the site is one
that has been reconciled by hand — which is slower, and is the only version of
these pages where the numbers mean what they say.

**Anybody who has given can sign in**, and there is no account to make: the
email address on a gift *is* the account, because that is already what the ledger
keys on. `/partners` emails a six-digit code to an address it has a gift against,
and typing it back starts the session — no password to issue, to remember, or to
reset. Proving you control the address is exactly the claim being made, which is
"the gifts filed under it are mine". The code lives in `src/lib/partner-codes.ts`;
the door it opens is in `src/lib/partners.ts`. A handful of churches were issued a
password before this existed and it still works, at `/partners/password`.

A dashboard shows that giver's figures and nothing else's; there is no query
behind it that returns another partner's row.

**How far into the books somebody can see** is a separate question from whether
they can get in, and `src/lib/disclosure.ts` answers it. Everyone sees their own
giving; somebody who paid for a costed item reads that project's accounts; a
church or organisation Simon has **verified**, or anybody whose received giving
passes the threshold, reads all of them. Every input to that rule is something
only Simon can set — money marked *received*, and the verified tick — because
`kind` and the amount *claimed* are both typed in by the giver on a public form,
and a rule that trusted them would put the ministry's reconciliation four clicks
from the open web.

There is no `src/content` directory. There was, and it held the figures the site
prints — the kitchen reconciliation, the playground quote, the bus price, the
exchange rate — in TypeScript, so changing any of them meant a deploy. All of it
is in Postgres now: the reconciliation as ledger rows, the rest as CMS documents.
**What stayed in code is the arithmetic** — totals, conversions, percentages —
because a total typed into a text box is a total free to stop equalling the lines
above it. Simon types the facts; the site works out what they come to.

A project's **accounts** — Pastor Simon's line-by-line reconciliation of the
kitchen gift, estimated against actual — are rows in `needs` like everything
else, not a table in a source file. `estimated_cents` and `note` are the two
columns that make a need able to hold a line of a letter, `closed` is what sorts
spent work from work the money never reached, and `getProjectBudget` reads the
letter back out. Simon corrects a figure in `/app` → Needs and the accounts, the
kitchen page and the front page all move together, because there is only one copy
of it now.

Over the top of that rule sits a **switch per project**, in `/app` → Giving →
**Project accounts**, with three positions: *anyone* publishes the figures on the
project page, *the people who paid for it* hands the decision to the rule above
(the default), and *nobody* closes them while numbers are being corrected. The
projects that have such a set of papers are listed in
`src/lib/project-accounts.ts`, and everything downstream — the CMS fields, their
defaults, the saved document's type — is generated from that list, so a future
project gets its switch by being added to it. `showsAccounts` in
`src/lib/disclosure.ts` asks both questions in order, and is the only place that
does, so the public page and the partner dashboard cannot disagree about who
"anyone" is.

Run by `/app` → **Needs** (the items, the claims, the updates) and **Partners**
(verifying a church — which is now what opens the accounts to it — and issuing a
password, two separate acts, on purpose).
`src/lib/giving.ts` holds the shapes and labels, `src/lib/needs.ts` and
`src/lib/partners.ts` do the talking to Postgres, and what counts as "claimed" is
defined once as a database view in `src/lib/db.ts` so no two pages can disagree
about how much of a water tank is left.

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
