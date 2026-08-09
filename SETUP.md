# Setup

## Run it locally

```bash
npm install
cp .env.example .env.local     # fill in APP_SESSION_SECRET and DATABASE_URL
createdb jepegomi              # the CMS needs a Postgres to write into
npm run dev                    # http://localhost:3000
```

Then open `/app`. It creates its own tables on first visit and offers to make
the first account — that is the whole installation.

**The public site needs none of this.** With no database at all, every page
renders the wording that ships in the code and the site behaves exactly as it
did before the CMS existed. A database that is missing, asleep or broken takes
`/app` down with it and leaves the public site untouched.

## Tests

```bash
npm test                       # Chromium, against a dev server
npm run test:ui                # the same, in Playwright's watch UI
npm run test:report            # the HTML report from the last run
```

Two suites. **public** walks every page a visitor can reach and checks it
renders, plus that `/app` gives a signed-out visitor nothing but a sign-in box.
**cms** signs in and drives the editor: the sidebar, the filing, the breadcrumb,
the phone drawer. Its document list is read from `src/cms/schema.ts`, so a page
added there is tested without anybody adding a test.

The CMS suite needs a login, and **nothing in it creates an account** — the
tests run against whatever `DATABASE_URL` is set, which is usually the real
database. Put an existing account in `.env.local`:

```bash
E2E_EMAIL=you@example.com
E2E_PASSWORD=…
```

Without those the CMS tests skip with a note and the public ones still run.

Next allows only one `next dev` per project directory, so the tests attach to
the server you already have on :3000 and start one only if nothing answers.

## The CMS

`/app` edits the words and photos on the site. It is deliberately not a page
builder: **words and images are content, links and layout are structure.** Simon
and Joyce can change any wording on any page; they cannot dismantle the design.

Every editable field on the site is declared in one file,
[`src/cms/schema.ts`](src/cms/schema.ts). A field's declaration is the single
source of three things at once — the form control in `/app`, the page's
TypeScript type, and the wording used when nothing has been saved yet. To make
something new editable, add a field there; there is no second place to register
it and no editor screen to write.

| Field type | What the editor sees                                            |
| ---------- | --------------------------------------------------------------- |
| `text`     | A single line.                                                  |
| `prose`    | A box. One blank line starts a new paragraph — that is the whole formatting language, on purpose. |
| `image`    | A path, with a preview.                                         |
| `list`     | A repeatable group with Add / Remove, like the About fact cards. |

### How a save reaches the page

Pages read content inside a `use cache` scope tagged per document, so visitors
are served a prerendered page. Saving calls `updateTag` for **that one
document**, which expires that entry and nothing else. The editor sees their own
words immediately; no other page is rebuilt. This is why the site is both static
and instantly editable, and it is why `cacheComponents` is on in
`next.config.ts`.

### Content that has never been edited

Saved values are layered over the defaults field by field. A field nobody has
touched — or one added to the schema after the last save — still renders its
default. Clearing the `content` table reverts the site to its original wording;
it does not empty it.

## The giving ledger

`/needs` lists costed items and lets a church claim all or part of one. It runs
on ordinary relational tables rather than the JSONB content store, because a
ledger has to be summed and a blob cannot be. `ensureSchema()` in
[`src/lib/db.ts`](src/lib/db.ts) creates them on the first visit to `/app`, the
same as the content tables.

| Table          | What it holds                                                       |
| -------------- | ------------------------------------------------------------------- |
| `needs`        | One thing needed, with one cost. Published/closed flags and a running order. |
| `partners`     | The churches and people who give. Verified, and optionally given a login. |
| `pledges`      | One partner claiming one amount against one need.                   |
| `need_updates` | Progress posted back, with an optional photo.                       |

Money is stored as **whole cents** in `INTEGER` columns, never as dollars in a
float — see the note at the top of [`src/lib/money.ts`](src/lib/money.ts) for
why an $1,138 item split three ways makes that non-negotiable.

### What "claimed" means

Everything except a withdrawn claim counts against a need's cost — **including a
claim nobody has confirmed yet**. That is deliberate. If a claim only counted
once Simon had seen it, two churches could both be told on the same Sunday that
$450 was open and both send it. Holding the balance from the moment somebody
claims it answers the question the page is really being asked: *is this still
there for me?* A claim that turns out to be nonsense is withdrawn in `/app` and
the balance comes straight back.

The definition lives in one place — the `need_ledger` view — so the public page,
the partner dashboard and `/app` cannot drift apart on it.

### The workflow

1. Somebody claims an amount at `/needs/[slug]`. No login needed; nothing is
   behind a door.
2. It appears at the top of `/app` → **Needs** as waiting on you.
3. You email them the account details. (Nothing is sent from this site — the
   claim screen tells them to expect a reply from you.)
4. **Money received** in `/app` when it actually lands. Only then does it move
   from promised to received on the public page.
5. Post updates with photos as the work happens. They appear on the item's page
   and on the dashboard of every partner who put money towards it.

### What Payments shows

`/app/payments` is every gift paid **on the site**, straight from Pesapal:
when, who, what it was towards, the dollars it added to the ledger, what the
merchant account was actually charged in KES, the M-Pesa or card reference, and
whether it succeeded. Failed and abandoned attempts are listed too — "I tried to
give and it didn't work" is a message that arrives, and that row is the answer.

It is read-only on purpose. Pesapal's word is what reconciles against a merchant
statement, and a button here that let somebody edit it would produce a ledger
that argues with the bank. Gifts sent by **bank transfer never appear here** —
those are promises the ministry confirms by hand, under Needs.

### Partner logins

Verifying a partner and giving one a login are **two separate buttons**, and
most partners will only ever want the first. Verifying is you saying you know
who this church is. A login is a convenience on top of it, for a church that
wants to watch its own record — set the password in `/app` → **Partners** and
read it to them, since nothing is emailed from this site.

Un-verifying a partner clears their password as well as their status: a partner
you no longer vouch for should not keep a working key, and a hash left in place
so that re-verifying silently restores the old password is a door nobody
remembers is there.

### Seeding it

The first visit to `/app` → **Needs** offers to add the three items the $8,000
never reached — the water tank, the cabro floor and the dining hall. Their costs
are read from [`src/content/kitchen.ts`](src/content/kitchen.ts) rather than
retyped, so the ledger and the Kitchen page cannot disagree about what a water
tank costs.

> Writing to the database **by hand** will not show on the site: the public
> pages are cached and expired by tag, and only the actions in `/app` and the
> claim form expire them. Go through the UI, or restart the server.

## Photos

Photos live in [`public/photos/kitchen/`](public/photos/kitchen/). **The filename
is the slot**: `07.jpg` is photo 7 on the report, `before.jpg` and `after.jpg`
are the comparison pair. Slots run 1–23.

There are two ways to add one, and they are the same thing:

- **Copy files into the folder.** Nothing else to do — they show up on
  `/projects/kitchen`.
- **Use the `/app` tool.** Drag a photo onto a slot. It writes into that same
  folder.

Captions and categories for each slot live in
[`src/content/kitchen.ts`](src/content/kitchen.ts).

Photos attached to a **progress update** work differently: there is no fixed set
of slots, so the file is named after the update it belongs to and lives in
`public/photos/updates/`. The `need_updates` row holds the path, so nothing has
to scan a directory to find out what exists. Both kinds go through the same
writer, and so make the same production trade below.

## The `/app` photo tool

`/app/photos` is part of the CMS and needs the same sign-in.

| Variable             | What it is                                             |
| -------------------- | ------------------------------------------------------ |
| `APP_SESSION_SECRET` | Signs the session cookie. `openssl rand -hex 32`.      |
| `DATABASE_URL`       | Postgres. Locally `postgres://you@localhost:5432/jepegomi`; in production the Neon connection string. |

Everyone who edits has their own account and password, so an edit is
attributable and one person can be removed without disturbing anybody else. Add
people from the **People** tab. There is no shared passphrase any more.

The database driver is chosen from the URL, the same way the photo writer is
chosen from the environment: a `.neon.tech` host uses Neon's HTTP driver (a
serverless function cannot keep a TCP pool alive), anything else uses an
ordinary Postgres connection. So local development needs no cloud account.

### Where uploads get written

Reading photos is always the same — they are files in the repo, so they ship
with the deployment. **Writing** depends on where the site is running, because a
serverless host's filesystem is read-only and a file written into it dies with
the request.

| Where          | Driver               | What happens                                                        |
| -------------- | -------------------- | ------------------------------------------------------------------- |
| Local `npm run dev` | filesystem      | Photo is written to the folder. Appears instantly.                  |
| Production     | GitHub Contents API  | Photo is **committed to the repo**. Appears once the site rebuilds. |

The driver is picked automatically: if `GITHUB_TOKEN` and `GITHUB_REPO` are set
it commits, otherwise it writes to disk. The tool tells you on screen which one
happened, so a photo is never silently lost.

To turn on production uploads, create a GitHub fine-grained token with
**Contents: read and write** on this repo, then set:

```
GITHUB_TOKEN=github_pat_...
GITHUB_REPO=digitalbrushcreative/jepegomi
GITHUB_BRANCH=main
```

This keeps the repo as the single source of truth: photos are versioned, cost
nothing to host, and can be added by hand or through the browser. The trade is a
~1 minute delay before an upload on the live site is visible.

## Deploy

The site is a standard Next.js app. `/projects/kitchen` and the marketing pages
prerender as static; `/app` is server-rendered.

1. Push the branch and import the repo at [vercel.com/new](https://vercel.com/new).
   The free Hobby tier is enough. No build configuration needed.
2. Create a Postgres database at [neon.tech](https://neon.tech) — the free tier
   is far more than this site needs — and copy its connection string into
   `DATABASE_URL` in the Vercel project settings.
3. Set the other environment variables above in the Vercel project settings.
4. Open `/app` on the live site once and create the first account.
5. Point `jepegomi.org` DNS at Vercel.

Every pull request then gets its own preview URL automatically.

## Still to confirm with Simon & Joyce

Marked in the UI as placeholders so they cannot be mistaken for real figures —
and shown **only when you are signed in to `/app`**. Visit the page while signed
in and the dashed "still to confirm" box is there in the gap it describes; a
visitor sees the page with the gap simply absent, not a ministry publishing its
own to-do list. See `src/components/editor-only.tsx`.

- **Service times** — `/church` cannot invite anyone to a service until it knows
  when they are. This is the most costly blank on the site: a service time is the
  one thing a stranger comes to a church website for, and a guess sends somebody
  to a locked gate. So the page says nothing at all about Sunday until the times
  are in. The address is blank for the same reason.
- **The Bible college** — students enrolled, when it meets, how to enrol, and the
  date of the next intake. The five programmes, their monthly fees and their
  lengths are confirmed and on the page, along with the KCB account and the
  paybill fees are paid to — the one place on the site that publishes an account
  number, because a fee is a price a student has to be able to read.
- **What academy transport costs.** It is the second need in the front page's
  needs slider, and the only one with no figure beside it: its card says "Still
  being costed" rather than borrowing the kitchen's numbers. A costing — a
  vehicle bought, or a term of hired transport — turns that panel into a real
  ask. The words are editable under Home → Current needs in `/app`.
- **A giving reply ready to send.** `/give` asks people to email rather than
  publishing account numbers, so somebody has to be watching that inbox with the
  bank and M-Pesa details — including the routing number and SWIFT/BIC — ready to
  send back. An unanswered email is a gift that never arrives. This matters more
  now than it did: a claim on `/needs` promises the giver a reply with the
  details, and holds the balance against the item while they wait for it. **A
  claim nobody answers is worse than no claim at all** — it takes an amount off
  the page that nobody is going to send.
- **Nothing on this site sends email.** A claim lands in `/app` and waits to be
  noticed. Somebody has to be looking, or a mail forward has to be set up, or
  the ledger will quietly fill with promises nobody chased.
- **The photos** — all 23 gallery slots and the before/after pair are empty.
- **Logo source files.** The three logos were recovered from base64 inside the
  original report, but the Academy one is a bad crop: its leading "J" is clipped
  off. A clean original would fix it.

## Budget figures

The budget on `/projects/kitchen` is the real estimated-vs-actual reconciliation
from Pastor Simon's letter to Encounter Church, in
[`src/content/kitchen.ts`](src/content/kitchen.ts). Both columns balance to
$8,000: the estimates sum to $8,000 and the six actual figures sum to $8,000.

Three items were never reached because the money ran out — the water tank
($850), the cabro flooring ($1,000), and the dining hall's plastering and
electricity ($1,138) — which is the **$2,988** the page asks for.

One thing to check: transport is the only line the letter marks "Used" without a
figure, so the page prints "Used" rather than inventing a number.
