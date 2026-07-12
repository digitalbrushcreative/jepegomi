import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Eyebrow, SectionTitle } from "@/components/ui";
import { donation, progress } from "@/content/kitchen";

const blocks = [
  {
    title: "Food at School",
    body: "Every school day, children receive morning porridge and a hot lunch. For many it's their main meal of the day.",
    href: "/programs/food-at-school",
    cta: "See the program",
  },
  {
    title: "A real kitchen",
    body: "Right now meals are cooked outdoors over open fires. With Encounter Church, we're building a proper kitchen.",
    href: "/projects/kitchen",
    cta: "See the progress",
  },
  {
    title: "The ministry",
    body: "Led by Pastor Simon & Joyce Nderitu, Jepegomi serves its community through worship, education, and care.",
    href: "/about",
    cta: "About Jepegomi",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-plum-deep px-6 py-24 sm:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-[480px] w-[480px] rounded-full bg-plum/35"
        />
        <div className="relative mx-auto max-w-4xl">
          <Image
            src="/logos/food-at-school.png"
            alt="Food at School"
            width={287}
            height={163}
            priority
            className="h-24 w-auto"
          />
          <h1 className="font-display mt-8 text-4xl leading-[1.1] font-bold text-white sm:text-6xl">
            Feeding children, building futures — in Nairobi.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65">
            Jesus People Gospel Ministries runs Jepegomi Academy and the Food at
            School program, giving children a hot meal and an education every
            day.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink href="/projects/kitchen">
              See the Kitchen Build
            </ButtonLink>
            <ButtonLink
              href="/give"
              variant="ghost"
              className="border-white/25 text-white hover:bg-white/10"
            >
              Give
            </ButtonLink>
          </div>
          <p className="label-mono mt-12 text-white/40">
            Kitchen {progress.percentComplete}% complete · {progress.caption}
          </p>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {blocks.map((block) => (
            <Link
              key={block.href}
              href={block.href}
              className="group rounded border border-black/8 bg-white p-8 transition-shadow hover:shadow-lg"
            >
              <h2 className="font-display text-2xl font-bold">{block.title}</h2>
              <p className="mt-3 leading-relaxed text-smoke">{block.body}</p>
              <span className="mt-6 inline-block text-sm font-medium text-plum">
                {block.cta}{" "}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-sand px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="!text-plum">Partner With Us</Eyebrow>
          <SectionTitle className="mt-4">
            Help us finish the kitchen
          </SectionTitle>
          <p className="mt-5 leading-relaxed text-smoke">
            {donation.donor} of {donation.donorLocation} gave $
            {donation.amountUsd.toLocaleString("en-US")} to replace the open
            fires with a proper kitchen. The structure is up. The finishing work
            is what&apos;s left.
          </p>
          <ButtonLink href="/give" className="mt-8">
            Give
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
