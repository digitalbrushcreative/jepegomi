# Photos

Everything the site shows. Each folder is served at `/photos/<folder>/`.

| Folder      | What it is                              | How a page gets one                          |
| ----------- | --------------------------------------- | -------------------------------------------- |
| `kitchen/`  | The Kitchen Build report gallery        | By slot number — see [its README](kitchen/README.md) |
| `updates/`  | Photos attached to a progress update    | Written by `/app`; the ledger holds the path  |
| `founders/` | Simon & Joyce                           | The `about.portrait` CMS field                |
| `church/`   | The sanctuary, the gate, the property    | Referenced by path in the page                |
| `academy/`  | The school, its classrooms and pupils    | Referenced by path in the page                |
| `school/`   | Lunch queues and classrooms              | Referenced by path in the page                |
| `meals/`    | The food, and how it used to be cooked   | Referenced by path in the page                |
| `college/`  | The Bible college's students              | Referenced by path in the page                |
| `digital/`  | Stills from the streamed services        | Referenced by path in the page                |
| `transport/`| The academy's van                        | Referenced by path in the page                |

`academy/` spans years, and the academy page reads it as a sequence. Only
`signboard.jpg` shows the old roadside building — it is the *first* frame of the
growth story and must not be captioned as the school today. Everything else in
the folder is the semi-permanent compound as it now stands.

## Two ways a photo gets onto a page

**The kitchen gallery scans its folder.** The filename is the slot, so Simon can
drop `07.jpg` in and it appears. That is worth the runtime directory read
because the set changes without a developer.

**Everything else is referenced by path.** The last four folders are a fixed set
chosen once, listed at the top of the page that uses them, and rendered through
`PhotoBand` / `PhotoStrip` in [`src/components/photos.tsx`](../../src/components/photos.tsx).
Scanning a folder to learn something the code already states would only add a
way for the page to be surprised.

Adding one is two steps: put the file here, then add `{ src, alt, caption }` to
the array at the top of the page. `alt` has no default on purpose.

## Rules

- `.jpg` `.jpeg` `.png` `.webp` `.avif`, under ~15 MB each.
- **Resize before committing.** Phone photos arrive at 4096px and 6–12 MB each.
  Nothing on this site is rendered wider than about 1100px, so the source is
  capped at 1600px:
  `sips -Z 1600 -s format jpeg -s formatOptions 68 in.jpg --out out.jpg`.
  Next's image optimiser handles everything below that; what it cannot do is
  shrink the repository.
- Committed to the repo, so they are versioned and cost nothing to host.
- Nothing unused lives here. Alternates and rejects go to
  [`photos-source/`](../../photos-source), which sits outside `public/` and is
  never deployed.
