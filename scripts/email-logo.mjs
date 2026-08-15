import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

/**
 * Draws the email masthead's logo, from the same SVG the site uses.
 *
 *   npm run logo:email
 *
 * Email needs a raster file — Gmail, Outlook and Yahoo all drop SVG — so the one
 * image in `src/lib/mail/template.ts` cannot be the mark the pages use. This
 * exists so that file is not a mystery binary somebody made once on a laptop:
 * change `public/logos/jepegomi-white.svg` and run this, and the two cannot
 * drift apart.
 *
 * The white knockout, not the full-colour art, because the masthead behind it is
 * plum and the colour lettering is charcoal — invisible there.
 *
 * It draws at twice the displayed width for the phone screens most of this mail
 * is read on. `LOGO` in the template is the *displayed* size; if you change
 * either, change both.
 *
 * Chromium comes from Playwright, which the test suite already depends on. If
 * this cannot find a browser: `npx playwright install chromium`.
 */

const SOURCE = "public/logos/jepegomi-white.svg";
const TARGET = "public/email/jepegomi-logo.png";
/* Twice the 280px the template displays it at. */
const WIDTH = 560;

const svg = await readFile(SOURCE, "utf8");

const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number);
if (!viewBox || viewBox.length !== 4) {
  throw new Error(`No usable viewBox in ${SOURCE}.`);
}

const height = Math.round(WIDTH / (viewBox[2] / viewBox[3]));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height },
  deviceScaleFactor: 1,
});

/*
  Transparent, not plum. The masthead paints its own background, and a PNG with
  the colour baked in would have a visible edge the day that colour changes.
*/
await page.setContent(
  `<style>html,body{margin:0;padding:0;background:transparent}
   svg{display:block;width:${WIDTH}px;height:${height}px}</style>${svg}`,
);

await writeFile(TARGET, await page.screenshot({ omitBackground: true, type: "png" }));
await browser.close();

console.log(`${TARGET} — ${WIDTH}×${height}, for display at ${WIDTH / 2}px wide.`);
