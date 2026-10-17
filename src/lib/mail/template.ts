import { site } from "@/lib/site";
import { publicInbox } from "./inboxes";

/**
 * The look of Jepegomi's email.
 *
 * The same institutional, editorial language as the site (app/globals.css):
 * white and warm-white surfaces, near-black type, plum as the accent rather
 * than the ground, deep green for the act of giving and nothing else, and a
 * muted gold kept for a rule or a label. Email has to carry it with a fraction
 * of the tools — no Tailwind, no flexbox, and a rendering engine that in
 * Outlook's case is Microsoft Word — so the translation is deliberate:
 *
 *   Newsreader / Inter → asked for from Google Fonts, which Apple Mail and iOS
 *                        honour, with Georgia and the system sans behind them
 *                        for Gmail and Outlook, which do not.
 *   The site header    → the full-colour mark on white over a hairline, exactly
 *                        as every page opens. Plum is never the top of a page.
 *   The site footer    → the ministry's name and address on plum-deep, the one
 *                        place the colour is allowed to fill a band.
 *   2px corners        → border-radius, which Outlook ignores. It degrades to
 *                        square, which is nearly the same thing.
 *
 * One image, and only one: the mark in the masthead. Everything else is type,
 * because every major client blocks remote images until the reader clicks "show
 * images" and an email that falls apart without them is an email half its
 * readers never see properly.
 *
 * So the masthead is built to work both ways. The logo is a PNG — no client
 * renders SVG in mail — and its `alt` is styled to be the masthead when it does
 * not load: the ministry's name, letterspaced, in the display face. The line
 * under it is the ministry's town rather than its name, so nothing is printed
 * twice when the image *does* load.
 */

/* Straight off app/globals.css. */
const colour = {
  plum: "#7a1b5c",
  plumDeep: "#4a1038",
  forest: "#244638",
  gold: "#b28a50",
  goldInk: "#7a5a28",
  cream: "#faf9f6",
  sand: "#f0eee8",
  sandDeep: "#e2ded4",
  charcoal: "#222522",
  smoke: "#5b5f5a",
  white: "#ffffff",
} as const;

const DISPLAY = "Newsreader, Georgia, 'Times New Roman', Times, serif";
const SANS =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** The site's one corner, for everything with an edge. */
const RADIUS = "2px";

/**
 * The mark, as a file a mail client can fetch.
 *
 * An absolute URL, always — a relative path in an email resolves against the
 * webmail's own host, which is not us. It is the full-colour mark, because the
 * masthead behind it is white, as the site header is.
 *
 * The PNG is drawn at twice the size it is displayed, so it stays sharp on the
 * phone screens most of this mail is read on, and lives in `public/email/` —
 * regenerated from `public/logos/jepegomi.svg` if the mark ever changes.
 *
 * `MAIL_LOGO_URL` overrides it for a deployment serving from somewhere else. A
 * preview build's mail still points at the live file, which is right: the image
 * has to load from wherever the reader opens the message, and a preview host is
 * gone by the following week.
 */
const LOGO = { width: 200, height: 89 } as const;

function logoUrl() {
  return process.env.MAIL_LOGO_URL || `${site.url}/email/jepegomi-logo.png`;
}

/**
 * Everything a sender typed goes through here before it reaches the HTML.
 *
 * A contact form is a public endpoint that accepts free text and mails it to
 * Simon. Without this, "message" is a script tag in whatever webmail he opens
 * it in.
 */
export function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Free text with its line breaks kept, escaped on the way in. */
export function paragraphs(value: string) {
  return escape(value)
    .split(/\n{2,}/)
    .map((block) => p(block.replace(/\n/g, "<br />")))
    .join("");
}

/* ------------------------------------------------------------------ blocks */

export function p(html: string, options: { muted?: boolean; small?: boolean } = {}) {
  const size = options.small ? "14px" : "16px";
  const height = options.small ? "22px" : "26px";
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:${size};line-height:${height};color:${
    options.muted ? colour.smoke : colour.charcoal
  };">${html}</p>`;
}

/** The opening line. Slightly larger, so the email has somewhere to start. */
export function lead(html: string) {
  return `<p style="margin:0 0 20px;font-family:${SANS};font-size:17px;line-height:28px;color:${colour.charcoal};">${html}</p>`;
}

export function rule() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:8px 0 24px;"><div style="height:1px;line-height:1px;font-size:0;background:${colour.sandDeep};">&nbsp;</div></td></tr></table>`;
}

/**
 * A left-ruled panel, for the one thing in a message that has to stand apart:
 * account details, a code, what happens next. Built as a two-cell table because
 * a 3px `border-left` is one of the things Word's renderer quietly drops.
 *
 * Forest is for giving — account details, what was paid — and nothing else.
 * Plum marks the ministry speaking; gold marks something somebody still has to
 * do.
 */
export function panel(
  body: string,
  { tone = "plum" }: { tone?: "forest" | "plum" | "gold" } = {},
) {
  const edge = { forest: colour.forest, plum: colour.plum, gold: colour.gold }[tone];

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:${colour.cream};">
    <tr>
      <td width="3" style="width:3px;background:${edge};font-size:0;line-height:0;">&nbsp;</td>
      <td style="padding:20px 22px 4px;">${body}</td>
    </tr>
  </table>`;
}

/**
 * Something set in the display face inside a panel — account details, what was
 * taken. Lines kept, escaped on the way in.
 */
export function detail(text: string) {
  return `<div class="serif" style="margin:0 0 16px;font-family:${DISPLAY};font-size:17px;line-height:27px;color:${colour.charcoal};">${escape(text).replace(/\n/g, "<br />")}</div>`;
}

/** A one-time code, large enough to read off a phone and type somewhere else. */
export function code(value: string) {
  return `<p style="margin:0 0 16px;text-align:center;font-family:${MONO};font-size:34px;line-height:42px;font-weight:700;letter-spacing:8px;color:${colour.charcoal};">${escape(value)}</p>`;
}

/** Inline monospace, for a password somebody has to copy exactly. */
export function secret(value: string) {
  return `<span style="font-family:${MONO};font-size:17px;letter-spacing:0.5px;background:${colour.sand};padding:4px 10px;border-radius:${RADIUS};">${escape(value)}</span>`;
}

/** A link inside running text, in the accent colour. */
export function link(href: string, label: string) {
  return `<a href="${escape(safeUrl(href))}" style="color:${colour.plum};text-decoration:underline;">${escape(label)}</a>`;
}

/**
 * Label-and-value rows: who wrote in, what they gave, which need it was against.
 * The thing Simon actually reads in a notification, so it comes before the prose.
 */
export function facts(rows: [label: string, value: string][]) {
  const cells = rows
    .filter(([, value]) => value.trim() !== "")
    .map(
      ([label, value]) => `<tr>
        <td style="padding:0 0 4px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:${colour.smoke};">${escape(label)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 18px;font-family:${SANS};font-size:16px;line-height:24px;color:${colour.charcoal};">${value}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">${cells}</table>`;
}

/** What somebody typed into a box, set apart so it cannot be read as our words. */
export function quote(text: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
    <tr>
      <td class="serif" style="padding:18px 22px;background:${colour.sand};border-radius:${RADIUS};font-family:${DISPLAY};font-size:16px;line-height:26px;color:${colour.charcoal};">${escape(text).replace(/\n/g, "<br />")}</td>
    </tr>
  </table>`;
}

/**
 * Where a link in an email is allowed to point.
 *
 * Escaping is not enough on its own: `javascript:` and `data:` survive it
 * intact, and every link this template draws now includes one an editor typed
 * into /app. Nothing legitimate here is anything but http, https or mailto, so
 * anything else becomes the site's front page rather than becoming a decision
 * somebody has to make while writing a letter.
 */
export function safeUrl(href: string) {
  const value = href.trim();
  return /^(https?:|mailto:)/i.test(value) ? value : site.url;
}

/**
 * A button. Forest is the giving colour and nothing else's — the same rule the
 * site's `ui.tsx` keeps — so anything that is not an act of giving is charcoal,
 * as the site's own secondary buttons are.
 */
export function button(href: string, label: string, tone: "forest" | "charcoal" = "charcoal") {
  const fill = tone === "forest" ? colour.forest : colour.charcoal;
  href = safeUrl(href);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 28px;">
    <tr>
      <td align="center" bgcolor="${fill}" style="border-radius:${RADIUS};">
        <a href="${escape(href)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:15px;font-weight:600;color:${colour.white};text-decoration:none;border-radius:${RADIUS};">${escape(label)}</a>
      </td>
    </tr>
  </table>`;
}

/** How every email from a person rather than from a system ends. */
export function signoff(name: string = site.leaders) {
  return `<p class="serif" style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${colour.sandDeep};font-family:${DISPLAY};font-size:18px;line-height:26px;color:${colour.charcoal};">${escape(name)}<br />
    <span style="font-family:${SANS};font-size:13px;color:${colour.smoke};">${escape(site.longName)}</span></p>`;
}

/* ------------------------------------------------------------------- shell */

export type EmailOptions = {
  /** The line the inbox shows after the subject. Worth writing properly. */
  preheader: string;
  eyebrow?: string;
  heading: string;
  /** Blocks, already rendered. */
  body: string;
  /** The small print under the rule — why this landed in their inbox. */
  footerNote?: string;
};

export function renderEmail({ preheader, eyebrow, heading, body, footerNote }: EmailOptions) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<!-- The palette is light by design. Telling Apple Mail so stops it inverting
     the page into charcoal and calling that dark mode. -->
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escape(heading)}</title>
<!-- The site's faces, for the clients that load them (Apple Mail, iOS). The
     rest fall through the stacks to Georgia and the system sans. -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet" />
<style>
  /* Phones. Media queries are ignored by Outlook desktop, which is not on one. */
  @media only screen and (max-width:620px) {
    .shell { width:100% !important; }
    .pad { padding-left:24px !important; padding-right:24px !important; }
    .display { font-size:28px !important; line-height:34px !important; }
    .logo { width:170px !important; height:auto !important; }
  }
</style>
<!--
  Outlook desktop, meeting a web font first in a stack, gives up on the whole
  stack and sets everything in Times New Roman. So it is told outright.
-->
<!--[if mso]>
<style>
  td, p, a, span, div, h1 { font-family: 'Segoe UI', Arial, sans-serif !important; }
  .serif, .serif *, h1 { font-family: Georgia, 'Times New Roman', serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:${colour.cream};">
  <!-- Preheader: shown in the inbox list, never in the email itself. The run of
       entities after it stops the client filling the rest of the preview line
       with whatever the first paragraph happens to start with. -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${colour.cream};">${escape(preheader)}${"&#8203;&nbsp;".repeat(60)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${colour.cream};">
    <tr>
      <td align="center" style="padding:28px 12px 40px;">
        <table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border:1px solid ${colour.sandDeep};">

          <!--
            Masthead, as the site header is: the mark on white, a hairline
            under it. If images are off, the alt text stands in, set in the
            display face. The whole block is one link, because a masthead that
            is not clickable is the one thing every reader tries anyway.
          -->
          <tr>
            <td class="pad" align="left" bgcolor="${colour.white}" style="padding:28px 40px 22px;background:${colour.white};border-bottom:1px solid ${colour.sandDeep};">
              <a href="${escape(site.url)}" style="display:inline-block;text-decoration:none;">
                <img src="${escape(logoUrl())}" width="${LOGO.width}" height="${LOGO.height}" alt="${escape(site.longName)}" class="logo serif" style="display:block;width:${LOGO.width}px;max-width:100%;height:auto;border:0;outline:none;-ms-interpolation-mode:bicubic;font-family:${DISPLAY};font-size:17px;font-weight:500;letter-spacing:0.4px;line-height:24px;color:${colour.charcoal};text-decoration:none;" />
              </a>
              <div style="margin-top:12px;font-family:${SANS};font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${colour.smoke};">${escape(site.location)}</div>
            </td>
          </tr>

          <!-- The letter. -->
          <tr>
            <td class="pad" bgcolor="${colour.white}" style="padding:38px 40px 34px;background:${colour.white};">
              ${eyebrow ? `<div style="margin:0 0 12px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:${colour.plum};">${escape(eyebrow)}</div>` : ""}
              <h1 class="display" style="margin:0 0 20px;font-family:${DISPLAY};font-size:32px;line-height:40px;font-weight:400;letter-spacing:-0.3px;color:${colour.charcoal};">${escape(heading)}</h1>
              ${body}
            </td>
          </tr>

          <!-- Why this arrived: small print, on stone. -->
          ${
            footerNote
              ? `<tr>
            <td class="pad" bgcolor="${colour.sand}" style="padding:20px 40px;background:${colour.sand};">
              <p style="margin:0;font-family:${SANS};font-size:12px;line-height:20px;color:${colour.smoke};">${footerNote}</p>
            </td>
          </tr>`
              : ""
          }

          <!-- The ministry, as the site footer carries it: on plum-deep. -->
          <tr>
            <td class="pad" bgcolor="${colour.plumDeep}" style="padding:24px 40px 26px;background:${colour.plumDeep};">
              <p style="margin:0;font-family:${SANS};font-size:12px;line-height:20px;color:#e6d6e0;">
                <span class="serif" style="font-family:${DISPLAY};font-size:15px;color:${colour.white};">${escape(site.longName)}</span><br />
                ${escape(site.location)}<br />
                <a href="mailto:${escape(publicInbox())}" style="color:${colour.white};text-decoration:underline;">${escape(publicInbox())}</a>
                &nbsp;·&nbsp;
                <a href="${escape(site.url)}" style="color:${colour.white};text-decoration:underline;">${escape(site.domain)}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * The plain-text sign-off, so every message ends the same way in the clients —
 * and the spam filters — that read the text part rather than the HTML.
 *
 * Sending text alongside HTML is not politeness. A message with no text part
 * scores worse with essentially every filter, and this mail has to reach church
 * offices behind hardware appliances that were bought a decade ago.
 */
export function textFooter() {
  return `\n--\n${site.longName}\n${site.location}\n${publicInbox()}\n${site.url}\n`;
}
