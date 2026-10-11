import type { Metadata } from "next";
import Link from "next/link";
import { ProjectCard } from "@/components/projects/project-card";
import { GetInTouchBand, PageHero } from "@/components/site/cta-band";
import { PROJECT_CATEGORIES, PROJECT_CATEGORY_LABELS, type ProjectCategory } from "@/lib/constants";
import { getPublishedProjects } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Projects",
  description: "Driveways, courtyards, walkways and parking areas paved by Mozaik Pavers across Malawi.",
};

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const { category: raw } = await searchParams;
  const category = PROJECT_CATEGORIES.includes(raw as ProjectCategory) ? (raw as ProjectCategory) : undefined;
  const projects = await getPublishedProjects(category);

  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="Projects we're proud of"
        text="Every project starts with a properly prepared base. Browse by type of space, then open a project to compare before and after."
      />

      <section className="py-10 lg:py-14">
        <div className="container-page">
          <nav aria-label="Filter projects" className="-mx-4 overflow-x-auto px-4 pb-2">
            <ul className="flex w-max gap-2">
              <FilterChip href="/projects" active={!category} label="All projects" />
              {PROJECT_CATEGORIES.map((c) => (
                <FilterChip key={c} href={`/projects?category=${c}`} active={category === c} label={PROJECT_CATEGORY_LABELS[c]} />
              ))}
            </ul>
          </nav>

          {projects.length === 0 ? (
            <div className="mt-10 rounded-2xl border-2 border-dashed border-ink-300 p-12 text-center">
              <p className="text-lg font-semibold">No projects in this category yet.</p>
              <Link href="/projects" className="mt-3 inline-block font-bold text-clay-700">See all projects</Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <ProjectCard key={p.id} project={p} priority={i < 3} />
              ))}
            </div>
          )}
        </div>
      </section>

      <GetInTouchBand source="projects_page" />
    </>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={active ? "page" : undefined}
        className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
          active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-300 bg-white text-ink-700 hover:border-ink-500"
        }`}
      >
        {label}
      </Link>
    </li>
  );
}
