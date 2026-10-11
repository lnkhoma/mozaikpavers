import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero } from "@/components/site/cta-band";
import { Icon } from "@/components/ui/icons";
import { SERVICES } from "@/config/content";

export const metadata: Metadata = {
  title: "Services",
  description: "Driveways, courtyards, walkways, parking areas, landscaping, site preparation and drainage by Mozaik Pavers.",
};

const INCLUDED = [
  "Supply and delivery of pavers",
  "Fitting labour by experienced teams",
  "Fitting plastic and cutting",
  "Fitting dust supply and delivery",
  "Mechanical compaction",
  "Landscaping around the finished paving",
];

export default function ServicesPage() {
  return (
    <>
      <PageHero eyebrow="Services" title="Complete paving, from base to finish" text="One team takes your project from site preparation to the final sweep of jointing sand." />
      <section className="py-12 lg:py-20">
        <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="card p-7">
              <span className="flex size-12 items-center justify-center rounded-xl bg-clay-50 text-clay-700"><Icon name={s.icon} className="size-6" /></span>
              <h2 className="mt-5 text-xl font-bold">{s.title}</h2>
              <p className="mt-2 text-ink-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-white py-12 lg:py-20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">What&apos;s included</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Your online quotation covers</h2>
            <p className="mt-4 text-lg text-ink-600">
              Our calculator prices every item below from the area you enter. Site preparation, removal of existing paving and drainage are
              listed on your quotation and priced after a site assessment.
            </p>
            <Link href="/quote" className="btn btn-primary btn-lg mt-6"><Icon name="calculator" /> Calculate my project</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-sand-100 p-4 font-semibold">
                <Icon name="check" className="mt-0.5 size-5 shrink-0 text-moss-500" /> {i}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CtaBand source="services_page" />
    </>
  );
}
