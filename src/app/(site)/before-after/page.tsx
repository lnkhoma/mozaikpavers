import type { Metadata } from "next";
import { BeforeAfterPair } from "@/components/projects/before-after-pair";
import { GetInTouchBand, PageHero } from "@/components/site/cta-band";
import { getTransformations } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Before & After Gallery",
  description: "See how Mozaik Pavers turns bare ground into finished driveways, courtyards and forecourts.",
};

export default async function BeforeAfterPage() {
  const projects = await getTransformations();
  return (
    <>
      <PageHero
        eyebrow="Before & after"
        title="See the transformation"
        text="Each pair shows the same site before work started and after Mozaik Pavers finished. Open a project to compare the photos side by side with the slider."
      />
      <section className="py-10 lg:py-16">
        <div className="container-page">
          {projects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((p, i) => (
                <BeforeAfterPair
                  key={p.id}
                  slug={p.slug}
                  name={p.name}
                  location={p.location}
                  before={p.before!}
                  after={p.after!}
                  squareMetres={p.squareMetres}
                  paverType={p.paverType}
                  description={p.description}
                  priority={i < 2}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-ink-500">Transformations will appear here soon.</p>
          )}
        </div>
      </section>
      <GetInTouchBand source="before_after_page" />
    </>
  );
}
