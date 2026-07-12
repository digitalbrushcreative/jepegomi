import type { Metadata } from "next";
import { getContent } from "@/cms/content";
import { ButtonLink, PageHero } from "@/components/ui";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const details = await getContent("site");
  return {
    title: "Contact",
    description: `Get in touch with ${details.longName} in ${details.location}.`,
  };
}

export default async function ContactPage() {
  const [contact, details] = await Promise.all([
    getContent("contact"),
    getContent("site"),
  ]);

  return (
    <>
      <PageHero
        eyebrow={contact.eyebrow}
        title={contact.heading}
        intro={contact.intro}
      />

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          <div>
            <dl className="divide-y divide-sand">
              <div className="pb-5">
                <dt className="label-mono text-plum">Email</dt>
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
                <dt className="label-mono text-plum">Web</dt>
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
                <dt className="label-mono text-plum">Location</dt>
                <dd className="mt-2 text-lg font-medium">{details.location}</dd>
              </div>
            </dl>

            <ButtonLink href="/give" className="mt-8">
              Give
            </ButtonLink>
          </div>

          <div className="overflow-hidden rounded border border-black/8">
            <iframe
              title="Map showing Kahawa, Nairobi, Kenya"
              src="https://www.openstreetmap.org/export/embed.html?bbox=36.90%2C-1.20%2C36.98%2C-1.14&layer=mapnik&marker=-1.17%2C36.94"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full min-h-[360px] w-full border-0"
            />
          </div>
        </div>
      </section>
    </>
  );
}
