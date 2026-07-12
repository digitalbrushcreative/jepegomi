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

Marked in the UI as placeholders so they cannot be mistaken for real figures:

- **Academy details** — ages/grades, pupils enrolled, teachers, year founded.
- **Bank routing number and SWIFT/BIC**, without which nobody outside the US can
  actually send money.
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
