# Kitchen Build photos

Drop photos in this folder and they appear on the Kitchen Build page. The
`/app` photo tool writes into this same folder, so you can use either — a
drag-and-drop in the browser, or just copying files in here.

## Naming

**The filename is the slot.** The number in the filename is the photo number on
the report.

```
01.jpg      → slot 1   (Walls & Structure — "Laying the first courses of the kitchen wall")
14.jpg      → slot 14  (Roof & Finish — "Inside — the jiko in place on a tiled floor")
23.jpg      → slot 23  (Cooking & Eating — "Plates in hand, on the way back to class")
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

| Slots | Category          | When          |
| ----- | ----------------- | ------------- |
| 1–10  | Walls & Structure | February 2026 |
| 11–15 | Roof & Finish     | May 2026      |
| 16–23 | Cooking & Eating  | June 2026     |

All 23 slots are filled, plus `before` and `after`. Replacing one is a matter
of dropping a new file over the old — same number, any accepted extension.

## Notes

- A slot with no file shows a numbered placeholder, so an incomplete gallery
  still looks deliberate.
- Photos are committed to the repo, which means they are versioned and cost
  nothing to host.
- Please keep them under ~15 MB each; compress large phone photos first.
