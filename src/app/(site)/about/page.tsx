import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero } from "@/components/site/cta-band";
import { Icon, type IconName } from "@/components/ui/icons";
import { CORE_VALUES, MISSION, VISION, WHY_CHOOSE } from "@/config/content";

export const metadata: Metadata = {
  title: "About Mozaik Pavers",
  description:
    "Mozaik Pavers is a Malawi-based paving and construction company delivering durable, modern, high-quality outdoor surfaces for residential, commercial and industrial projects.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Malawian paving, done properly"
        text="Mozaik Pavers is a Malawi-based paving and construction company dedicated to delivering durable, modern, and high-quality outdoor surfaces for residential, commercial, and industrial projects. We specialize in paving installation, interlocking blocks, driveways, walkways, patios, parking areas, and customized landscaping solutions designed to enhance both functionality and appearance."
      >
        <p className="mt-4 max-w-2xl text-lg text-ink-600">
          At Mozaik Works, we combine craftsmanship, reliability, and attention to detail to create long-lasting results that add value to every
          property. Our team is committed to professionalism, timely project delivery, and customer satisfaction, making us a trusted partner for
          paving solutions across Malawi.
        </p>
      </PageHero>
      <section className="py-12 lg:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div className="space-y-5 text-lg leading-relaxed text-ink-700">
            <p>
              We believe pricing should be clear. That&apos;s why you can calculate an itemised estimate online — every material, delivery
              trip and labour cost — before we even visit your site.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/projects" className="btn btn-dark">See our work</Link>
              <Link href="/quote" className="btn btn-primary"><Icon name="calculator" /> Get a quotation</Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY_CHOOSE.map((w) => (
              <div key={w.title} className="card p-6">
                <Icon name={w.icon} className="size-7 text-clay-500" />
                <h2 className="mt-4 text-lg font-bold">{w.title}</h2>
                <p className="mt-2 text-ink-600">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------- Vision · Mission · Values ------------------- */}
      <section className="border-t border-ink-200 bg-sand-100 py-16 lg:py-24" aria-labelledby="vmv-heading">
        <div className="container-page">
          <p className="eyebrow">Who we are</p>
          <h2 id="vmv-heading" className="mt-3 scroll-mt-28 text-3xl font-extrabold sm:text-4xl">
            Our Vision, Mission &amp; Values
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-5">
            {/* Vision: the lead statement */}
            <article className="texture-pavers relative overflow-hidden rounded-3xl p-8 text-white shadow-lift sm:p-10 lg:col-span-3">
              <span className="absolute inset-y-0 left-0 w-1.5 bg-clay-500" aria-hidden="true" />
              <h3 className="flex items-center gap-3 text-sm font-bold tracking-[0.18em] text-clay-400 uppercase">
                <span className="flex size-11 items-center justify-center rounded-full bg-clay-500 text-white">
                  <Icon name="target" className="size-6" />
                </span>
                Our Vision
              </h3>
              <p className="mt-6 font-display text-2xl leading-snug font-bold sm:text-3xl lg:text-[2.1rem]">{VISION}</p>
            </article>

            {/* Mission */}
            <article className="flex flex-col rounded-3xl bg-clay-600 p-8 text-white shadow-lift sm:p-10 lg:col-span-2">
              <h3 className="flex items-center gap-3 text-sm font-bold tracking-[0.18em] text-white uppercase">
                <span className="flex size-11 items-center justify-center rounded-full bg-white text-clay-700">
                  <Icon name="eye" className="size-6" />
                </span>
                Our Mission
              </h3>
              <p className="mt-6 font-display text-2xl leading-snug font-bold sm:text-[1.7rem]">{MISSION}</p>
            </article>
          </div>

          {/* Values */}
          <div className="mt-6 rounded-3xl bg-white p-8 text-ink-900 shadow-card sm:p-10">
            <h3 className="flex items-center gap-3 text-sm font-bold tracking-[0.18em] text-clay-700 uppercase">
              <span className="flex size-11 items-center justify-center rounded-full bg-ink-900 text-white">
                <Icon name="gem" className="size-6" />
              </span>
              Our Values
            </h3>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {CORE_VALUES.map((value, i) => (
                <li key={value} className="relative overflow-hidden rounded-2xl bg-sand-100 p-6">
                  <span className="absolute -top-3 right-3 font-display text-7xl font-extrabold text-clay-500/15 select-none" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon name={VALUE_ICONS[i] ?? "check"} className="size-7 text-clay-600" />
                  <p className="relative mt-4 font-display text-xl leading-tight font-bold">{value}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <CtaBand source="about_page" />
    </>
  );
}

/** One icon per core value, in order: integrity, quality with speed, value for money. */
const VALUE_ICONS: IconName[] = ["shield", "clock", "tag"];
