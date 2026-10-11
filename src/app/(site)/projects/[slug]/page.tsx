import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { BeforeAfterSlider } from "@/components/projects/before-after-slider";
import { SampleBadge } from "@/components/projects/project-card";
import { GetInTouchBand } from "@/components/site/cta-band";
import { Icon } from "@/components/ui/icons";
import { PROJECT_CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { getProjectBySlug } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project not found" };
  return {
    title: `${project.name}, ${project.location}`,
    description: project.description.slice(0, 160),
    openGraph: project.after ? { images: [{ url: project.after.url }] } : undefined,
  };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const facts = [
    { label: "Location", value: project.location, icon: "mapPin" as const },
    { label: "Area completed", value: project.squareMetres ? `${formatNumber(project.squareMetres)} SQM` : null, icon: "ruler" as const },
    { label: "Paver type", value: project.paverType, icon: "grid" as const },
    { label: "Completed", value: project.completionDate ? formatDate(project.completionDate) : null, icon: "calendar" as const },
  ].filter((f) => f.value);

  const photos = [project.after, ...project.gallery].filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <>
      <TrackOnMount name="project_viewed" properties={{ project: project.slug }} />
      <section className="border-b border-ink-200 bg-sand-100">
        <div className="container-page py-8 lg:py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
            <Link href="/projects" className="inline-flex items-center gap-1 font-semibold hover:text-ink-900">
              <Icon name="chevronLeft" className="size-4" /> All projects
            </Link>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {project.categories.map((c) => (
              <Link key={c} href={`/projects?category=${c}`} className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-ink-600 hover:text-clay-700">
                {PROJECT_CATEGORY_LABELS[c]}
              </Link>
            ))}
            {project.isSample && <SampleBadge className="border border-ink-200" />}
          </div>
          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{project.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-lg text-ink-600">
            <Icon name="mapPin" className="size-5" /> {project.location}
          </p>
        </div>
      </section>

      <section className="py-10 lg:py-14">
        <div className="container-page grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            {project.before && project.after ? (
              <BeforeAfterSlider
                beforeSrc={project.before.url}
                afterSrc={project.after.url}
                beforeAlt={project.before.alt}
                afterAlt={project.after.alt}
                width={project.after.width}
                height={project.after.height}
                projectName={project.name}
                projectSlug={project.slug}
                priority
              />
            ) : photos[0] ? (
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-ink-200">
                <Image src={photos[0].url} alt={photos[0].alt || project.name} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
              </div>
            ) : null}

            {project.description && (
              <div className="mt-10">
                <h2 className="text-2xl font-extrabold">About this project</h2>
                <p className="mt-3 text-lg leading-relaxed whitespace-pre-line text-ink-700">{project.description}</p>
              </div>
            )}

            {photos.length > 0 && (
              <div className="mt-10">
                <h2 className="text-2xl font-extrabold">Photographs</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((img) => (
                    <a key={img.id} href={img.url} target="_blank" rel="noopener" className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-ink-200">
                      <Image src={img.url} alt={img.alt || project.name} fill loading="lazy" sizes="(min-width: 640px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <dl className="card divide-y divide-ink-100">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-3 p-5">
                  <Icon name={f.icon} className="mt-0.5 size-5 text-clay-500" />
                  <div>
                    <dt className="text-xs font-bold tracking-wider text-ink-500 uppercase">{f.label}</dt>
                    <dd className="mt-0.5 font-semibold">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <div className="rounded-2xl bg-ink-900 p-6 text-white">
              <h2 className="text-xl font-extrabold">Want a transformation like this?</h2>
              <p className="mt-2 text-ink-300">
                {project.squareMetres
                  ? `Price a ${formatNumber(project.squareMetres)} SQM project like this one — or enter your own size.`
                  : "Enter your area and get an itemised estimate in minutes."}
              </p>
              <Link href={project.squareMetres ? `/quote?area=${project.squareMetres}` : "/quote"} className="btn btn-primary mt-5 w-full">
                <Icon name="calculator" /> Get Your Quote
              </Link>
              <Link href="/site-assessment" className="btn mt-3 w-full border-2 border-white/25 text-white hover:bg-white/10">
                Request a site assessment
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <GetInTouchBand source="project_detail" />
    </>
  );
}
