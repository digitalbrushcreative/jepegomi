# Email

Everything the site sends and everywhere it lands.

There are two separate jobs here, and the single biggest mistake is treating
them as one:

| | What it is | Where it lives |
|---|---|---|
| **Receiving** | The `support@jepegomi.org` mailbox people write to | Your **cPanel host** — you already pay for it |
| **Sending** | The mail the *website* generates: enquiries, receipts, account details | **Resend** — a transactional provider, over HTTPS |

## Why not just send through the cPanel host

The hosting package includes an SMTP server, and using it looks like the frugal
choice. It is the one thing not to do:

- **The IP is shared.** On shared hosting your mail leaves from the same address
  as every other site on that box. One of them gets compromised and starts
  sending spam, and your gift receipts stop arriving at Gmail — with no notice
  and nothing you can do about it.
- **Vercel blocks the ports.** Serverless functions cannot reliably open
  outbound SMTP on 25/465/587. Transactional providers use plain HTTPS, which is
  why `src/lib/mail/send.ts` speaks HTTP and needs no SMTP library at all.
- **No visibility.** cPanel will not tell you that Gmail bounced a message, or
  that a church's Exchange server quietly binned it. A transactional provider
  shows you every delivery, bounce and complaint.
- **Throttles.** Shared hosts cap outbound mail per hour. Fine for one person
  typing; not fine for a burst of receipts.

Keep the cPanel mailbox for **reading** mail. Send through Resend.

## Which sending service

**Resend** is the recommendation, and what the setup below walks through.

- Free tier covers a ministry site many times over — thousands of messages a
  month, with a daily cap. Check the current numbers on their pricing page
  before you rely on them; they change.
- Plain HTTPS API. No SMTP, no library, no dependency added to `package.json`.
- Built by the Vercel/Next.js crowd, so the deployment story is the shortest
  one available.
- DKIM and DMARC set up by copy-pasting three DNS records.

**Brevo** is the alternative, and the code already supports it — set
`BREVO_API_KEY` instead and nothing else changes. Prefer it if you think you
will later want to send an actual newsletter to supporters, which Resend does
not really do and Brevo does.

**One thing worth knowing:** if Jepegomi is a registered non-profit, **Google
for Nonprofits** gives Google Workspace free. That would replace the cPanel
mailbox with real Gmail at `@jepegomi.org` — vastly better than cPanel webmail,
and it means `support@` and `jepegomi@gmail.com` finally live in one interface.
It does *not* replace Resend: Workspace is for people typing, not for
programs sending. Worth applying for either way.

---

## Setup

### 1. Point the domain

`jepegomi.org` currently has **no DNS records at all** — no nameservers, no MX,
nothing. Everything below assumes you have first pointed the domain's
nameservers at whoever is going to hold the DNS (the cPanel host is fine).

### 2. The mailbox, in cPanel

1. **Email → Email Accounts → Create.**
   Address `support@jepegomi.org`. Give it a real password and keep it in the
   password manager, not in a text file.
2. **Email → Forwarders → Add Forwarder.**
   Forward `support@jepegomi.org` to `jepegomi@gmail.com`.

   The forwarder is the point. Mail is *kept* in the ministry's own mailbox, so
   it survives whoever is answering it this year, **and** copied to the address
   Simon actually has open on his phone, so nothing waits a week to be read.
3. Confirm cPanel added the **MX record** for the domain. It usually does this
   itself when the first mailbox is created.

Optional but worth it: add `support@jepegomi.org` as a *Send mail as* address in
Gmail (Settings → Accounts → Add another email address), using the cPanel SMTP
details. Simon can then reply from Gmail and have it come *from* `support@`.

### 3. Resend

1. Sign up at resend.com and **add the domain** `jepegomi.org`.
2. Resend gives you DNS records to add — typically a `TXT` for DKIM, an `MX` and
   `TXT` pair on a `send.` subdomain for return-path, and a suggested `DMARC`
   record. Add them in cPanel under **Domains → Zone Editor**.

   The `MX` record Resend asks for is on a **subdomain** (`send.jepegomi.org`).
   It does not touch the `MX` for `jepegomi.org` itself, so your mailbox keeps
   working. Do not remove the cPanel MX record.
3. Wait for Resend to show the domain as **verified**. Minutes usually, up to a
   few hours.
4. **API Keys → Create**, with *Sending access* only. Copy it once — it is not
   shown again.

### 4. SPF, DKIM, DMARC

DKIM comes from Resend in step 3. The other two are yours to get right, and they
are what decides whether a gift receipt lands in an inbox or a spam folder.

**SPF** — one record only. If cPanel already created one, *edit* it rather than
adding a second; two SPF records is the same as none.

```
Type: TXT   Name: @   Value: v=spf1 include:_spf.resend.com include:<your-host's-spf> ~all
```

Your host's include is in cPanel's existing SPF record — keep it, or mail sent
from webmail starts failing.

**DMARC** — start permissive, so you can watch before you enforce:

```
Type: TXT   Name: _dmarc   Value: v=DMARC1; p=none; rua=mailto:support@jepegomi.org
```

Once reports look clean for a couple of weeks, tighten `p=none` to
`p=quarantine`, and later `p=reject`. Going straight to `p=reject` before DKIM
and SPF are both verified will bin your own mail.

### 5. The environment variables

In Vercel → Project → Settings → Environment Variables. Copy the block at the
foot of `.env.example`; the ones that matter:

```
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM=Jepegomi <noreply@jepegomi.org>
MAIL_TO=support@jepegomi.org,jepegomi@gmail.com
MAIL_COPY=jepegomi@gmail.com
GIVING_ACCOUNT_DETAILS=
```

`MAIL_FROM` **must** be at `jepegomi.org`. Putting `jepegomi@gmail.com` there
means Resend is claiming to be Gmail, which Gmail's own DMARC policy tells every
receiving server to reject. Replies are steered with `Reply-To` instead — the
code does this everywhere — so nobody ever has to read the `noreply@` address.

### 6. The account details

`GIVING_ACCOUNT_DETAILS` holds the M-Pesa and bank details that the "Send me the
details" form emails out. It is an environment variable rather than a field in
the CMS, on purpose — see the note at the top of `src/lib/site.ts`. A number in
a CMS text box can be quietly changed by anyone who gets into `/app`, with
nothing on the page to say it changed; an environment variable can only be
changed by somebody holding the Vercel login.

**Leave it blank until Simon has confirmed the figures.** Blank is a safe state:
every message that would have carried the details instead says that he will
reply personally, which is exactly what happened before the form existed. It
will never send an empty account number.

---

## What sends what

| Trigger | To the ministry | To the person |
|---|---|---|
| Contact form, `/contact` | Enquiry, `Reply-To` the sender | Acknowledgement with a copy of what they wrote |
| "Send me the details", `/give` | Copied on the outgoing message | The account details, or a note that Simon will reply |
| A gift promised, `/give` and `/needs/*` | The claim, the balance, and who it is from | Receipt, the account details, and what happens next |
| Enrolment enquiry, `/academy` | The enquiry, `Reply-To` the parent — and a row in `/app` → **Enquiries** | Acknowledgement and an invitation to visit |
| Partner login issued, `/app` | — | Sign-in link and password (opt-out checkbox in `/app`) |
| Partner login revoked, `/app` | — | A note that it has been turned off |
| CMS account created, `/app` | — | Where to sign in. **Never** the password |

Two rules the code keeps, both worth preserving:

- **Nothing the site does may fail because email failed.** Sends are handed to
  Next's `after()` so they run once the response has gone out, and every failure
  is logged rather than thrown. The exceptions are deliberate: the contact and
  enrolment notifications are awaited, because that email *is* how the message
  reaches a person, and losing it silently under a "thank you" is the worst
  thing those pages could do. (An enrolment enquiry is also written to the
  database, but a row nobody is watching is a record, not an alert — so the
  send is still awaited.) The giver's receipt is awaited too, so the thank-you
  on screen can honestly say whether to expect an email.
- **The provider is one function.** Everything goes through `src/lib/mail/`.
  Changing provider is a case in `send.ts`, not a change to a single message.

## Testing it

**Locally**, leave both API keys blank. Nothing is sent — every message is
printed to the terminal in full, so you can read the wording and check the
recipients without a provider account.

**In production**, the honest test is other people's mail servers:

1. Send yourself the giving details at a **Gmail** address, an **Outlook**
   address, and if you can, a **church's own domain** — the last is where
   ancient spam appliances live.
2. Check each one landed in the inbox rather than in Promotions or Spam.
3. Run the domain through mail-tester.com and aim for 9/10 or better.
4. In Gmail, open the message → **Show original**. `SPF: PASS`, `DKIM: PASS`
   and `DMARC: PASS` are what you are looking for.

## Design of the emails themselves

`src/lib/mail/template.ts` carries the ministry's look into a medium with almost
none of the site's tools — no Tailwind, no web fonts, no flexbox, and Outlook
rendering through Microsoft Word. The translation is set out in that file's
comment: Fraunces becomes Georgia, the cloth edge becomes a band of marigold,
the paper grain is dropped.

**No images anywhere, on purpose.** Every major client blocks remote images
until the reader asks for them, so an email whose logo is a PNG introduces
itself as a broken box. The masthead is type, which always renders.

Every message ships a plain-text alternative alongside the HTML. That is not
politeness — a message with no text part scores worse with essentially every
spam filter, and this mail has to reach church offices running appliances that
were bought a decade ago.
