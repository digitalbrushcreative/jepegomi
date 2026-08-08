# School photos

Photographs of the Academy itself rather than the kitchen build — children
queueing for lunch in the yard and eating in the classrooms, June 2026.

Unlike [`../kitchen/`](../kitchen/), these are **not** wired to a slot system.
Nothing on the site reads this folder yet; the filenames are descriptive rather
than numbered, and a page uses one by pointing straight at it:

```tsx
<Image src="/photos/school/lunch-queue-01.jpg" alt="…" width={1280} height={960} />
```

| File                    | What it shows                                       |
| ----------------------- | --------------------------------------------------- |
| `lunch-queue-01..07.jpg` | Children lining up outside the classrooms with their plates |
| `lunch-classroom-01..03.jpg` | Lunch being eaten at the desks                  |

They suit the Food at School programme page and the Academy page — the meals in
them are the ones cooked in the new kitchen, so they are the "why" behind the
Kitchen Build report rather than more of the build itself.

Same rules as the kitchen folder: `.jpg` `.jpeg` `.png` `.webp` `.avif`, kept
under ~15 MB each and committed to the repo.
