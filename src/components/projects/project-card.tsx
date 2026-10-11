import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { PROJECT_CATEGORY_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { ProjectWithImages } from "@/lib/services/projects";

export function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`rounded-full bg-white/90 px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-ink-700 uppercase ${className}`} title="Illustrative sample project — replace with real photos in the admin">
      Illustration
    </span>
  );
}

export function ProjectCard({ project, priority = false }: { project: ProjectWithImages; priority?: boolean }) {
  const cover = project.after ?? project.gallery[0] ?? project.before;
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group card flex flex-col overflow-hidden transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-ink-200">
        {cover && (
          <Image
            src={cover.url}
            alt={cover.alt || project.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        {project.before && project.after && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ink-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            Before &amp; After
          </span>
        )}
        {project.isSample && <SampleBadge className="absolute top-3 right-3" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap gap-1.5">
          {project.categories.slice(0, 2).map((c) => (
            <span key={c} className="rounded-md bg-sand-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
              {PROJECT_CATEGORY_LABELS[c]}
            </span>
          ))}
        </div>
        <h3 className="text-lg font-bold text-ink-900 group-hover:text-clay-700">{project.name}</h3>
        <p className="flex items-center gap-1.5 text-sm text-ink-500">
          <Icon name="mapPin" className="size-4" /> {project.location}
        </p>
        <div className="mt-auto flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
          <span className="font-semibold text-ink-700">
            {project.squareMetres ? `${formatNumber(project.squareMetres)} SQM` : project.paverType ?? ""}
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-clay-700">
            View project <Icon name="arrowRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
