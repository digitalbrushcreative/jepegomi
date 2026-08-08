import { site } from "@/lib/site";
import { publicInbox } from "./inboxes";

/**
 * The look of Jepegomi's email.
 *
 * The site's design language is warm, hand-made and community-led — plum as
 * ink, green reserved for the act of giving, marigold as the one colour allowed
 * to shout, and everything sitting on paper rather than on flat white. Email
 * has to carry that with a fraction of the tools: no Tailwind, no web fonts, no
 * flexbox, and a rendering engine that in Outlook's case is Microsoft Word.
 *
 * So the translation is deliberate rather than literal:
 *
 *   Fraunces          → Georgia. A warm, slightly old-fashioned serif that is
 *                       on every machine. Fraunces' whole point is that it is
 *                       not a bank's typeface, and neither is Georgia.
 *   Karla             → the system sans stack.
 *   The cloth edge    → a marigold rule. Curves need SVG or images; a 4px band
 *                       of the same colour says the same thing and survives.
 *   Rounded corners   → border-radius, which Outlook ignores. It degrades to
 *                       square corners, which is a smaller loss than an image.
 *   The paper grain   → the cream background alone. A tiled background image
 *                       would be blocked by default in most clients.
 *
 * No images at all, anywhere. Every major client blocks remote images until the
 * reader clicks "show images", so an email whose logo is a PNG introduces
 * itself as a broken box — and `jepegomi.org` is not yet even serving files.
 * The masthead is type, which always renders.
 */

/* Straight off the logo marks, matching app/globals.css. */
const colour = {
  plum: "#7a1b5c",
  plumDeep: "#4a1038",
  green: "#4a7c2a",
  greenDeep: "#2f5119",
  marigold: "#e9a53c",
  clay: "#c05f3c",
  cream: "#fdfaf3",
  sand: "#f5ecdd",
  sandDeep: "#e7d9c2",
  charcoal: "#2a1c24",
  smoke: "#6f6068",
  white: "#ffffff",
} as const;

const DISPLAY = "Georgia, 'Times New Roman', Times, serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

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
 * The site's coloured, left-bordered panel — the one the giving page uses to
 * hold the thank-you. Built as a two-cell table because a 4px `border-left` is
 * one of the things Word's renderer quietly drops.
 */
export function panel(
  body: string,
  { tone = "green" }: { tone?: "green" | "plum" | "marigold" | "clay" } = {},
) {
  const edge = { green: colour.green, plum: colour.plum, marigold: colour.marigold, clay: colour.clay }[tone];
  const fill = { green: "#f0f5eb", plum: "#f8eff5", marigold: "#fdf4e6", clay: "#faeee9" }[tone];

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-radius:10px;overflow:hidden;background:${fill};">
    <tr>
      <td width="4" style="width:4px;background:${edge};font-size:0;line-height:0;">&nbsp;</td>
      <td style="padding:20px 22px 4px;">${body}</td>
    </tr>
  </table>`;
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
        <td style="padding:0 0 4px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:${colour.plum};">${escape(label)}</td>
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
      <td style="padding:18px 22px;background:${colour.sand};border-radius:10px;font-family:${DISPLAY};font-size:16px;line-height:26px;color:${colour.charcoal};">${escape(text).replace(/\n/g, "<br />")}</td>
    </tr>
  </table>`;
}

/**
 * A button. Green is the giving colour and nothing else's — the same rule the
 * site's `ui.tsx` keeps — so anything that is not an act of giving takes plum.
 */
export function button(href: string, label: string, tone: "green" | "plum" = "plum") {
  const fill = tone === "green" ? colour.green : colour.plum;

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 28px;">
    <tr>
      <td align="center" bgcolor="${fill}" style="border-radius:999px;">
        <a href="${escape(href)}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:15px;font-weight:bold;color:${colour.white};text-decoration:none;border-radius:999px;">${escape(label)}</a>
      </td>
    </tr>
  </table>`;
}

/** How every email from a person rather than from a system ends. */
export function signoff(name: string = site.leaders) {
  return `<p style="margin:24px 0 0;font-family:${DISPLAY};font-size:17px;line-height:26px;color:${colour.plum};">${escape(name)}<br />
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
<!-- The palette is warm and light by design. Telling Apple Mail so stops it
     inverting cream paper into charcoal and calling that dark mode. -->
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escape(heading)}</title>
<style>
  /* Phones. Media queries are ignored by Outlook desktop, which is not on one. */
  @media only screen and (max-width:620px) {
    .shell { width:100% !important; }
    .pad { padding-left:24px !important; padding-right:24px !important; }
    .display { font-size:26px !important; line-height:32px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${colour.cream};">
  <!-- Preheader: shown in the inbox list, never in the email itself. The run of
       entities after it stops the client filling the rest of the preview line
       with whatever the first paragraph happens to start with. -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${colour.cream};">${escape(preheader)}${"&#8203;&nbsp;".repeat(60)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${colour.cream};">
    <tr>
      <td align="center" style="padding:28px 12px 40px;">
        <table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Masthead. Type only, so it renders with images turned off. -->
          <tr>
            <td class="pad" align="center" bgcolor="${colour.plumDeep}" style="padding:34px 40px 30px;background:${colour.plumDeep};border-radius:14px 14px 0 0;">
              <div style="font-family:${DISPLAY};font-size:27px;font-weight:bold;letter-spacing:5px;color:${colour.white};">JEPEGOMI</div>
              <div style="margin-top:9px;font-family:${SANS};font-size:10px;font-weight:bold;letter-spacing:2.4px;text-transform:uppercase;color:${colour.marigold};">${escape(site.longName)}</div>
            </td>
          </tr>

          <!-- The cloth edge, flattened into a band of marigold. -->
          <tr>
            <td style="font-size:0;line-height:0;background:${colour.marigold};height:5px;">&nbsp;</td>
          </tr>

          <!-- The letter. -->
          <tr>
            <td class="pad" bgcolor="${colour.white}" style="padding:38px 40px 30px;background:${colour.white};">
              ${eyebrow ? `<div style="margin:0 0 12px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:${colour.plum};">${escape(eyebrow)}</div>` : ""}
              <h1 class="display" style="margin:0 0 20px;font-family:${DISPLAY};font-size:30px;line-height:38px;font-weight:bold;color:${colour.charcoal};">${escape(heading)}</h1>
              ${body}
            </td>
          </tr>

          <!-- Small print, on paper rather than on white. -->
          <tr>
            <td class="pad" bgcolor="${colour.sand}" style="padding:26px 40px 30px;background:${colour.sand};border-radius:0 0 14px 14px;">
              ${footerNote ? `<p style="margin:0 0 14px;font-family:${SANS};font-size:12px;line-height:20px;color:${colour.smoke};">${footerNote}</p>` : ""}
              <p style="margin:0;font-family:${SANS};font-size:12px;line-height:20px;color:${colour.smoke};">
                <strong style="color:${colour.charcoal};">${escape(site.longName)}</strong><br />
                ${escape(site.location)}<br />
                <a href="mailto:${escape(publicInbox())}" style="color:${colour.plum};text-decoration:underline;">${escape(publicInbox())}</a>
                &nbsp;·&nbsp;
                <a href="${escape(site.url)}" style="color:${colour.plum};text-decoration:underline;">${escape(site.domain)}</a>
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
