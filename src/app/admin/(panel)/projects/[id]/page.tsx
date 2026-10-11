import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBody, AdminHeader, Panel } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/session";
import { getProjectById } from "@/lib/services/projects";
import { DeleteProject, ProjectForm, ProjectImages } from "../project-controls";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params, searchParams }: PageProps<"/admin/projects/[id]">) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <>
      <AdminHeader
        title={project.name}
        subtitle={project.published ? `Live at /projects/${project.slug}` : "Hidden from the public site"}
        actions={
          <>
            <Link href="/admin/projects" className="btn btn-sm border border-ink-300 bg-white"><Icon name="chevronLeft" className="size-4" /> Projects</Link>
            {project.published && (
              <Link href={`/projects/${project.slug}`} target="_blank" className="btn btn-sm border border-ink-300 bg-white"><Icon name="external" className="size-4" /> View</Link>
            )}
            <DeleteProject projectId={project.id} name={project.name} />
          </>
        }
      />
      <AdminBody>
        {query.created && <p role="status" className="rounded-lg bg-moss-500/10 p-3 text-sm font-semibold text-moss-600">Project created. Now add the before and after photographs.</p>}
        {project.isSample && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This is an illustrative sample. Saving details or uploading a photo marks it as a real project.
          </p>
        )}
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Details">
            <ProjectForm project={project} />
          </Panel>
          <Panel title="Photographs">
            <ProjectImages project={project} />
          </Panel>
        </div>
      </AdminBody>
    </>
  );
}
