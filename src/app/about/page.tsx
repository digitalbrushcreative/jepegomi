import type { Metadata } from "next";
import { ButtonLink, PageHero } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.longName} — a church and academy in Nairobi led by ${site.leaders}.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="The Ministry"
        title="The church & the Nderitus"
        intro="Jepegomi — Jesus People Gospel Ministries — is a church and academy in Nairobi led by Pastor Simon and Joyce Nderitu."
      />

      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-6 text-lg leading-relaxed text-smoke">
            <p>
              Their work joins the spiritual and the practical: a place to
              worship, a school to learn in, and a daily meal for children who
              need one. Everything on this site flows from that mission.
            </p>
            <p>
              Alongside the church and Jepegomi Academy, the ministry runs a
              Bible school, digital outreach, and school transport for children
              in the community.
            </p>
          </div>

          <dl className="mt-16 grid gap-px overflow-hidden rounded border border-black/8 bg-black/8 sm:grid-cols-2">
            <div className="bg-white p-6">
              <dt className="label-mono text-plum">Led by</dt>
              <dd className="mt-2 font-medium">{site.leaders}</dd>
            </div>
            <div className="bg-white p-6">
              <dt className="label-mono text-plum">Location</dt>
              <dd className="mt-2 font-medium">{site.location}</dd>
            </div>
            <div className="bg-white p-6">
              <dt className="label-mono text-plum">The Academy</dt>
              <dd className="mt-2 font-medium">
                &ldquo;Quality Education With Values&rdquo;
              </dd>
            </div>
            <div className="bg-white p-6">
              <dt className="label-mono text-plum">Feeding</dt>
              <dd className="mt-2 font-medium">
                Porridge and hot lunch, every school day
              </dd>
            </div>
          </dl>

          <div className="mt-12 flex flex-wrap gap-4">
            <ButtonLink href="/academy" variant="secondary">
              Jepegomi Academy
            </ButtonLink>
            <ButtonLink href="/give">Give</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
