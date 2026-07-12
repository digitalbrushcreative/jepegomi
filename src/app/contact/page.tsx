import type { Metadata } from "next";
import { ButtonLink, PageHero } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${site.longName} in ${site.location}.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Contact"
        intro="We would love to hear from you — whether you want to give, partner, or just ask a question."
      />

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          <div>
            <dl className="divide-y divide-sand">
              <div className="pb-5">
                <dt className="label-mono text-plum">Email</dt>
                <dd className="mt-2">
                  <a
                    href={`mailto:${site.email}`}
                    className="text-lg font-medium underline underline-offset-4 hover:text-plum"
                  >
                    {site.email}
                  </a>
                </dd>
              </div>
              <div className="py-5">
                <dt className="label-mono text-plum">Web</dt>
                <dd className="mt-2">
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
                <dd className="mt-2 text-lg font-medium">{site.location}</dd>
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
