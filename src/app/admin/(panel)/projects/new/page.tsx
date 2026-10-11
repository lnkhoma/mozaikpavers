import type { Metadata } from "next";
import Link from "next/link";
import { AdminBody, AdminHeader, Panel } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/lib/auth/session";
import { ProjectForm } from "../project-controls";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireAdmin();
  return (
    <>
      <AdminHeader
        title="Add project"
        subtitle="Save the details first, then upload before, after and additional photographs."
        actions={<Link href="/admin/projects" className="btn btn-sm border border-ink-300 bg-white"><Icon name="chevronLeft" className="size-4" /> Projects</Link>}
      />
      <AdminBody>
        <Panel className="max-w-3xl">
          <ProjectForm />
        </Panel>
      </AdminBody>
    </>
  );
}
