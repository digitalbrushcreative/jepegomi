# Setup

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Everything except the `/app` photo tool works with no configuration.

## Environment

Copy `.env.example` to `.env.local` and fill it in.

| Variable              | Needed for            | Notes                                             |
| --------------------- | --------------------- | ------------------------------------------------- |
| `APP_PASSPHRASE`      | The `/app` gate       | The shared passphrase Simon & Joyce type in.      |
| `APP_SESSION_SECRET`  | The `/app` gate       | Random string. `openssl rand -hex 32`.            |

Without these two, `/app` shows a "not set up yet" notice instead of the tool.

## The one open decision: where photos are stored

`/app` is built and the drag-and-drop works, but **nothing is saved yet** — there
is no storage backend connected, so a dropped photo previews locally and is lost
on refresh. The tool says so on screen.

Everything storage-related sits behind the `PhotoStore` interface in
[`src/lib/storage.ts`](src/lib/storage.ts). Wiring a backend means writing one
implementation of that interface and flipping `STORAGE_READY` in
[`src/app/app/page.tsx`](src/app/app/page.tsx). Nothing else changes.

Three options, all free at this size:

**Vercel Blob** — simplest if the site is on Vercel. Photos upload straight to
blob storage, appear on `/projects/kitchen` immediately, no rebuild. Free tier
covers this easily. Ties the site to Vercel.

**Cloudflare R2** — 10 GB free, no egress charges, host-agnostic. Slightly more
setup than Blob.

**Commit to the repo via the GitHub API** — the CMS pushes the photo into `git`
and the host rebuilds. Free forever, versioned, works on any host, no vendor
lock-in. Cost is a ~1 minute delay before a new photo appears.

For a site updated a handful of times a month, the git approach is the most
durable and the cheapest. Vercel Blob is the fastest to get working.

> Note on Supabase: its free tier **pauses a project after a week of
> inactivity**, which would break a low-traffic site like this one. That is why
> it is not the recommendation here.

## Deploy

The site is a standard Next.js app and builds static pages for every route.

1. Push the branch and connect the repo to Vercel (or Cloudflare Pages).
2. Set `APP_PASSPHRASE` and `APP_SESSION_SECRET` in the host's environment.
3. Point `jepegomi.org` DNS at the host.

## Still to confirm with Simon & Joyce

These are marked in the UI as placeholders so they cannot be mistaken for real
figures:

- **Budget figures.** Every per-item cost in the budget panel is `TBC`. The
  original report's dollar amounts arrived corrupted — each `$` and the digit
  right after it had been eaten, so `$8,000` survived only as `,000`. The
  surviving fragments are recorded in a comment in
  [`src/content/kitchen.ts`](src/content/kitchen.ts). The $8,000 donation is the
  one figure that came through intact.
- **Academy details** — ages/grades, pupils enrolled, teachers, year founded.
- **Bank routing number and SWIFT/BIC**, without which nobody outside the US can
  actually send money.
- **The photos** — all 23 gallery slots and the before/after pair are empty.
- **Logo source files.** The three logos were recovered from the report, but the
  Academy one is a bad crop: its leading "J" is clipped off. A clean original
  would fix it.
