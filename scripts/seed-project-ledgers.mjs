/**
 * Turn the costed projects into ledgers.
 *
 * The kitchen was the only project anybody had broken into lines, so it was the
 * only one with needs, parts, meters and pledges. The playground, the bus and
 * the streaming kit were costed just as carefully — their figures simply lived
 * in the CMS, on the pages that argue for them, where the only way to give
 * towards one was to write its name into a box. This writes those same figures
 * into the ledger so they can be given to an item at a time.
 *
 * Nothing here is a new costing. Every line and every shilling price below is
 * the one already on the project's own page; the dollars are worked out the way
 * lib/money.ts works them out, so a total here equals the total the site has
 * been printing all along. That equality is the point — if this script and the
 * page disagreed about what a playground costs, one of them would be lying to a
 * giver, and a seeding script is the easier of the two to get wrong quietly.
 *
 * Idempotent by title within a project. Run it twice and the second run inserts
 * nothing, which is what makes it safe to run against a database that already
 * has some of this in it. It never updates and never deletes: a row somebody has
 * edited in /app, or claimed money against, is not this script's to touch.
 *
 *   node scripts/seed-project-ledgers.mjs            # what it would do
 *   node scripts/seed-project-ledgers.mjs --write    # do it
 *
 * DATABASE_URL comes from the environment or .env.local.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

/* ---------------------------------------------------------------- the costings */

/*
  A mirror of what is in the CMS, and the one piece of duplication here worth
  arguing about.

  The live figures are read out of the `content` table below whenever there is a
  row to read; this is the fallback for a database where nobody has saved the
  document yet, in which case the site is serving the defaults out of
  cms/schema.ts and these are those defaults. Keeping a copy is the lesser evil
  against the alternative — importing TypeScript through the Next module graph
  from a standalone script — but it is a copy, so it is written out in full
  rather than half-derived, where a wrong number is visible rather than implied.
*/
const FALLBACK = {
  playground: {
    equipmentHeading: "What they play on",
    equipmentBody:
      "Five pieces of galvanised equipment — three that carry on from what is standing there now, and two that are new to the school.",
    equipment: [
      {
        item: "Swing set — four seats, galvanised steel frame",
        note: "Replaces the two welded frames standing there now",
        priceKes: "150000",
      },
      {
        item: "Climbing frame with monkey bars",
        note: "New to the school",
        priceKes: "180000",
      },
      {
        item: "Slide — 2.4 m, moulded deck on a steel frame",
        note: "Takes over from the frame standing in the yard",
        priceKes: "110000",
      },
      {
        item: "Merry-go-round — six seats",
        note: "New to the school",
        priceKes: "100000",
      },
      {
        item: "See-saw — two seats, galvanised steel",
        note: "Replaces the one made on site",
        priceKes: "55000",
      },
    ],
    groundHeading: "What they land on",
    groundBody:
      "80 m² of rubber crumb across the fall zone, on a base that drains, plus the footings that hold every frame in it.",
    ground: [
      {
        item: "Rubber crumb safety surfacing — 80 m² of fall zone",
        note: "40 mm wet-pour, supplied and laid at KSh 5,500/m²",
        priceKes: "440000",
      },
      {
        item: "Installation — concrete footings and fitting",
        note: "Every frame set in concrete below the surfacing",
        priceKes: "120000",
      },
      {
        item: "Levelling, edging and drainage under the surfacing",
        note: "The yard slopes and holds water; wet-pour needs a base that drains",
        priceKes: "80000",
      },
    ],
  },
  digital: {
    kit: [
      {
        item: "Laptop able to edit and stream video",
        note: "Replaces the phones everything is recorded on now",
        priceKes: "120000",
      },
      {
        item: "DSLR camera and lens",
        note: "The picture, at last, from something built to make one",
        priceKes: "90000",
      },
      {
        item: "Wireless microphones — a pair",
        note: "The sound is what a viewer forgives least",
        priceKes: "35000",
      },
      {
        item: "Ring light and stand",
        note: "For the weekday recordings indoors",
        priceKes: "15000",
      },
      {
        item: "A year of internet for streaming",
        note: "The running cost that decides whether a service goes out at all",
        priceKes: "60000",
      },
    ],
  },
  transport: { busSeats: "26", busPriceKes: "2000000" },
  site: { kesPerUsd: "129" },
};

/* ------------------------------------------------------------------- the money */

const DEFAULT_KES_PER_USD = 129;

const kes = (raw) => Number(String(raw ?? "").replace(/[^\d]/g, "")) || 0;

function rateOf(raw) {
  const value = Number(String(raw ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_KES_PER_USD;
}

/*
  The two roundings in lib/money.ts, kept apart for the same reason they are kept
  apart there. An item on a quote rounds to the nearest ten dollars; a two
  million shilling bus rounds to the nearest hundred, because eighty-eight cents
  on a figure nobody knows to the nearest thousand is a lie about precision.
*/
const usdFromKes = (priceKes, rate) => Math.round(priceKes / rate / 10) * 10;
const usdCentsFromKes = (priceKes, rate) =>
  Math.round(priceKes / rate / 100) * 100 * 100;

/* -------------------------------------------------------------- what to build */

/**
 * The ledger each project should have, as parts and the items inside them.
 *
 * `sequence` is the build order, and it is not decoration: a part opens for
 * giving only once every part before it is settled (see lib/projects.ts). The
 * playground's surfacing genuinely follows its frames — every frame is set in
 * concrete *below* the wet-pour — so the two parts are numbered, and until the
 * equipment is claimed the site shows the surfacing without asking for it.
 *
 * The bus has no part at all. A part is a step in a sequence, and a bus is one
 * purchase; inventing halves of it to fill a table would be a fiction the page
 * would then have to keep up.
 */
function plan(content, rate) {
  const playground = content.playground;
  const digital = content.digital;
  const transport = content.transport;

  const item = (row) => ({
    title: row.item,
    summary: row.note,
    costCents: usdFromKes(kes(row.priceKes), rate) * 100,
  });

  return [
    {
      area: "playground",
      parts: [
        {
          title: playground.equipmentHeading,
          summary: playground.equipmentBody,
          sequence: 1,
          items: playground.equipment.map(item),
        },
        {
          title: playground.groundHeading,
          summary: playground.groundBody,
          sequence: 2,
          items: playground.ground.map(item),
        },
      ],
    },
    {
      area: "digital",
      parts: [
        {
          title: "The kit",
          summary:
            "A camera, a laptop that can edit, microphones, a light, and the connection the services go out over.",
          sequence: 1,
          items: digital.kit.map(item),
        },
      ],
    },
    {
      area: "transport",
      parts: [
        {
          /* No part: one purchase, so the items sit under the project itself. */
          title: null,
          items: [
            {
              title: `${transport.busSeats}-seater bus for the school run`,
              summary:
                "The school has outgrown its van, and a bus carries the children still to come.",
              costCents: usdCentsFromKes(kes(transport.busPriceKes), rate),
            },
          ],
        },
      ],
    },
  ];
}

/* ------------------------------------------------------------------- the slug */

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

async function uniqueSlug(db, base) {
  const root = slugify(base) || "need";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const { rows } = await db.query("SELECT 1 FROM needs WHERE slug = $1", [
      candidate,
    ]);
    if (rows.length === 0) return candidate;
  }
  return `${root}-${randomUUID().slice(0, 8)}`;
}

/* --------------------------------------------------------------------- the run */

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split("\n")
      .find((row) => row.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
  } catch {
    /* No .env.local is a perfectly ordinary state; the error below says so. */
  }
  throw new Error("No DATABASE_URL, in the environment or in .env.local.");
}

async function main() {
  const write = process.argv.includes("--write");
  const db = new pg.Client({ connectionString: databaseUrl() });
  await db.connect();

  try {
    /* The saved documents where there are any, the shipped defaults where not. */
    const { rows: saved } = await db.query(
      "SELECT key, data FROM content WHERE key = ANY($1)",
      [["playground", "digital", "transport", "site"]],
    );
    const content = { ...FALLBACK };
    for (const row of saved) content[row.key] = { ...content[row.key], ...row.data };

    const rate = rateOf(content.site.kesPerUsd);
    console.log(`Rate: ${rate} KSh to the dollar\n`);

    let created = 0;
    let skipped = 0;

    for (const project of plan(content, rate)) {
      console.log(`## ${project.area}`);

      for (const part of project.parts) {
        let partId = null;

        if (part.title) {
          const { rows: existing } = await db.query(
            "SELECT id FROM need_parts WHERE area = $1 AND title = $2",
            [project.area, part.title],
          );

          if (existing[0]) {
            partId = existing[0].id;
            console.log(`   part  (exists)  ${part.title}`);
          } else {
            partId = randomUUID();
            console.log(`   part  ${write ? "CREATE " : "would  "}  ${part.title}`);
            if (write) {
              await db.query(
                `INSERT INTO need_parts (id, area, title, summary, sequence)
                 VALUES ($1, $2, $3, $4, $5)`,
                [partId, project.area, part.title, part.summary ?? "", part.sequence],
              );
            }
          }
        }

        let position = 0;
        for (const need of part.items) {
          position += 1;

          const { rows: existing } = await db.query(
            "SELECT id FROM needs WHERE area = $1 AND title = $2",
            [project.area, need.title],
          );

          if (existing[0]) {
            skipped += 1;
            console.log(
              `     item  (exists)   ${need.title} — $${(need.costCents / 100).toLocaleString()}`,
            );
            continue;
          }

          created += 1;
          console.log(
            `     item  ${write ? "CREATE " : "would  "}  ${need.title} — $${(need.costCents / 100).toLocaleString()}`,
          );

          if (write) {
            await db.query(
              `INSERT INTO needs (id, slug, title, summary, detail, area, part_id,
                                  cost_cents, published, closed, position)
               VALUES ($1, $2, $3, $4, '', $5, $6, $7, true, false, $8)`,
              [
                randomUUID(),
                await uniqueSlug(db, need.title),
                need.title,
                need.summary,
                project.area,
                partId,
                need.costCents,
                position,
              ],
            );
          }
        }
      }
      console.log("");
    }

    console.log(
      write
        ? `Done. ${created} created, ${skipped} already there.`
        : `Dry run. ${created} would be created, ${skipped} already there. Pass --write to do it.`,
    );
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
