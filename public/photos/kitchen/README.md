# Kitchen Build photos

Drop photos in this folder and they appear on the Kitchen Build page. The
`/app` photo tool writes into this same folder, so you can use either — a
drag-and-drop in the browser, or just copying files in here.

## Naming

**The filename is the slot.** The number in the filename is the photo number on
the report.

```
01.jpg      → slot 1   (Site & Foundation — "Site cleared and prepared for foundation")
07.jpg      → slot 7   (Walls & Structure — "Window openings formed")
23.jpg      → slot 23  (People — "Where we stand today")
before.jpg  → the "Before — Cooking Outdoors" photo
after.jpg   → the "Now — The New Kitchen" photo
```

Leading zeros are optional (`7.jpg` and `07.jpg` both mean slot 7). Slots run
from 1 to 23.

Accepted formats: `.jpg` `.jpeg` `.png` `.webp` `.avif`

## What each slot is

The caption and category for every slot live in
[`src/content/kitchen.ts`](../../../src/content/kitchen.ts). Change the wording
there; the numbering here follows it.

| Slots   | Category          |
| ------- | ----------------- |
| 1–4     | Site & Foundation |
| 5–12    | Walls & Structure |
| 13–18   | Roof & Finish     |
| 19–23   | People            |

## Notes

- A slot with no file shows a numbered placeholder, so an incomplete gallery
  still looks deliberate.
- Photos are committed to the repo, which means they are versioned and cost
  nothing to host.
- Please keep them under ~15 MB each; compress large phone photos first.
