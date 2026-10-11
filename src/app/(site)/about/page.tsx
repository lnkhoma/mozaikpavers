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
      <section className="border-t border-ink-200 bg-white py-14 lg:py-20" aria-labelledby="vmv-heading">
        <div className="container-page">
          <p className="eyebrow">Who we are</p>
          <h2 id="vmv-heading" className="mt-3 scroll-mt-28 text-3xl font-extrabold sm:text-4xl">
            Our Vision, Mission &amp; Values
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <PillarCard icon="target" title="Our Vision" backdrop="bg-sand-300" outline="border-ink-900">
              <p>{VISION}</p>
            </PillarCard>
            <PillarCard icon="eye" title="Our Mission" backdrop="bg-clay-500" outline="border-ink-900" iconTone="bg-white text-clay-700">
              <p>{MISSION}</p>
            </PillarCard>
            <PillarCard icon="gem" title="Our Values" backdrop="bg-ink-900" outline="border-clay-500" dark>
              <ol className="mx-auto inline-block space-y-2 text-left">
                {CORE_VALUES.map((v, i) => (
                  <li key={v} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay-500 text-xs font-bold text-white">{i + 1}</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ol>
            </PillarCard>
          </div>
        </div>
      </section>

      <CtaBand source="about_page" />
    </>
  );
}

/** Outlined card offset over a coloured block, after Mozaik Pavers' own Vision/Mission/Values slide. */
function PillarCard({
  icon,
  title,
  backdrop,
  outline,
  dark = false,
  iconTone = "bg-white text-ink-900",
  children,
}: {
  icon: IconName;
  title: string;
  backdrop: string;
  outline: string;
  dark?: boolean;
  iconTone?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="relative h-full">
      <div className={`absolute top-6 right-6 bottom-0 left-0 rounded-[2rem] ${backdrop}`} aria-hidden="true" />
      <div className={`relative mb-6 ml-6 flex h-[calc(100%-1.5rem)] flex-col items-center rounded-[2rem] border-2 px-6 py-8 text-center ${outline}`}>
        <span className={`flex size-16 items-center justify-center rounded-full shadow-sm ${iconTone}`}>
          <Icon name={icon} className="size-8" />
        </span>
        <h3 className={`mt-4 text-2xl font-bold ${dark ? "text-white" : "text-ink-950"}`}>{title}</h3>
        <span className={`mt-2 h-0.5 w-12 rounded ${dark ? "bg-clay-500" : "bg-ink-950/40"}`} aria-hidden="true" />
        <div className={`mt-4 text-lg leading-relaxed font-semibold ${dark ? "text-white" : "text-ink-950"}`}>{children}</div>
      </div>
    </article>
  );
}
