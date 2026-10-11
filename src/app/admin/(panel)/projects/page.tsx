import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminBody, AdminHeader } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/session";
import { PROJECT_CATEGORY_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { listAllProjects } from "@/lib/services/projects";
import { FlagToggle } from "./project-controls";

export const metadata: Metadata = { title: "Projects" };

export default async function AdminProjectsPage({ searchParams }: PageProps<"/admin/projects">) {
  await requireAdmin();
  const [projects, params] = await Promise.all([listAllProjects(), searchParams]);
  const samples = projects.filter((p) => p.isSample).length;

  return (
    <>
      <AdminHeader
        title="Project management"
        subtitle="Featured projects appear automatically on the homepage."
        actions={<Link href="/admin/projects/new" className="btn btn-primary btn-sm"><Icon name="image" className="size-4" /> Add project</Link>}
      />
      <AdminBody>
        {params.deleted && <p role="status" className="rounded-lg bg-moss-500/10 p-3 text-sm font-semibold text-moss-600">Project deleted.</p>}
        {samples > 0 && (
          <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <Icon name="alert" className="size-5 shrink-0" />
            {samples} illustrative sample {samples === 1 ? "project is" : "projects are"} still published. Replace them with real Mozaik Pavers projects
            (upload photos or edit the details) or unpublish them before launch.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const cover = p.after ?? p.gallery[0] ?? p.before;
            return (
              <article key={p.id} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
                <Link href={`/admin/projects/${p.id}`} className="relative block aspect-[16/9] bg-ink-200">
                  {cover && <Image src={cover.url} alt="" fill sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {p.featured && <span className="rounded bg-clay-500 px-2 py-0.5 text-xs font-bold text-white">Featured</span>}
                    {!p.published && <span className="rounded bg-ink-900 px-2 py-0.5 text-xs font-bold text-white">Hidden</span>}
                    {p.isSample && <span className="rounded bg-amber-300 px-2 py-0.5 text-xs font-bold text-amber-950">Sample</span>}
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/admin/projects/${p.id}`} className="font-bold hover:text-clay-700">{p.name}</Link>
                  <p className="text-sm text-ink-500">
                    {p.location}
                    {p.squareMetres ? ` · ${formatNumber(p.squareMetres)} m²` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">{p.categories.map((c) => PROJECT_CATEGORY_LABELS[c]).join(", ")}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {p.before ? "✓ Before" : "✗ Before"} · {p.after ? "✓ After" : "✗ After"} · {p.gallery.length} more
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                    <FlagToggle projectId={p.id} flag="featured" value={p.featured} />
                    <FlagToggle projectId={p.id} flag="published" value={p.published} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {projects.length === 0 && <p className="rounded-xl border-2 border-dashed border-ink-300 p-10 text-center text-ink-500">No projects yet.</p>}
      </AdminBody>
    </>
  );
}
