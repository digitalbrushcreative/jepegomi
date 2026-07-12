# Setup

## Run it locally

```bash
npm install
cp .env.example .env.local     # fill in the two APP_ values
npm run dev                    # http://localhost:3000
```

Everything except the `/app` photo tool works with no configuration at all.

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

`/app` is gated by a shared passphrase.

| Variable             | What it is                                    |
| -------------------- | --------------------------------------------- |
| `APP_PASSPHRASE`     | The passphrase Simon & Joyce type in.         |
| `APP_SESSION_SECRET` | Signs the session cookie. `openssl rand -hex 32`. |

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
2. Set the environment variables above in the Vercel project settings.
3. Point `jepegomi.org` DNS at Vercel.

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
