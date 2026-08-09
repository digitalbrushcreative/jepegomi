import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { ContactForm } from "@/app/(site)/contact/contact-form";
import { ButtonLink, PageHero, SectionTitle } from "@/components/ui";
import { site } from "@/lib/site";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const details = await getContent("site");
  return pageMeta({
    title: "Contact",
    description: `Get in touch with ${details.longName} in ${details.location}.`,
    path: "/contact",
  });
}

export default async function ContactPage() {
  const [contact, details] = await Promise.all([
    getContent("contact"),
    getContent("site"),
  ]);

  return (
    <>
      <PageHero
        title={contact.heading}
        intro={contact.intro}
      />

      <section className="px-6 py-24">
        <div className="shell grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <dl className="divide-y divide-sand">
              <div className="pb-5">
                <dt className="eyebrow text-plum">Email</dt>
                <dd className="mt-2">
                  <a
                    href={`mailto:${details.email}`}
                    className="text-lg font-medium underline underline-offset-4 hover:text-plum"
                  >
                    {details.email}
                  </a>
                </dd>
              </div>
              <div className="py-5">
                <dt className="eyebrow text-plum">Web</dt>
                <dd className="mt-2">
                  {/* The domain is where the site lives, not something written
                      about it — so it stays in code, not in a text box. */}
                  <a
                    href={site.url}
                    className="text-lg font-medium underline underline-offset-4 hover:text-plum"
                  >
                    {site.domain}
                  </a>
                </dd>
              </div>
              <div className="py-5">
                <dt className="eyebrow text-plum">Location</dt>
                <dd className="mt-2 text-lg font-medium">{details.location}</dd>
              </div>
            </dl>

            <ButtonLink href="/give" className="mt-8">
              Give
            </ButtonLink>

            {/*
              The pin is the church itself: the far end of Garissa Road where it
              meets 5th Avenue, in Kahawa Sukari. The old bbox covered the whole
              of Kahawa, which told a visitor nothing about which turning to
              take — this one is tight enough to drive to.
            */}
            <div className="mt-10 overflow-hidden rounded border border-black/8">
              <iframe
                title="Map showing the church at the end of Garissa Road, 5th Avenue, Kahawa Sukari"
                src="https://www.openstreetmap.org/export/embed.html?bbox=36.9275%2C-1.2020%2C36.9395%2C-1.1915&layer=mapnik&marker=-1.1967%2C36.9335"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[320px] w-full border-0"
              />
            </div>
          </div>

          {/*
            The form, second in the source and second on a narrow screen. The
            address above it is the faster route for anyone who already has mail
            open, and it is what the ministry has always published — the form is
            for everybody else, which on a phone is most people.
          */}
          <div className="rounded-2xl bg-white p-8 shadow-warm sm:p-10">
            <SectionTitle className="mb-8">Send us a message</SectionTitle>
            <ContactForm email={details.email} />
          </div>
        </div>
      </section>
    </>
  );
}
