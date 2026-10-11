"use client";

import Image from "next/image";
import { useActionState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { PROJECT_CATEGORIES, PROJECT_CATEGORY_LABELS } from "@/lib/constants";
import type { ProjectImage } from "@/lib/db/schema";
import type { ProjectWithImages } from "@/lib/services/projects";
import {
  deleteProjectAction,
  removeProjectImageAction,
  saveProjectAction,
  toggleProjectFlagAction,
  uploadProjectImageAction,
  type ActionState,
} from "../../actions";

export function FlagToggle({ projectId, flag, value }: { projectId: string; flag: "featured" | "published"; value: boolean }) {
  const [pending, start] = useTransition();
  const label = flag === "featured" ? "Featured" : "Published";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={pending}
      onClick={() => start(() => toggleProjectFlagAction(projectId, flag, !value))}
      className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-colors ${
        value ? "border-moss-500 bg-moss-500/10 text-moss-600" : "border-ink-300 text-ink-500"
      }`}
    >
      <span className={`size-2 rounded-full ${value ? "bg-moss-500" : "bg-ink-300"}`} /> {label}
    </button>
  );
}

export function ProjectForm({ project }: { project?: ProjectWithImages }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProjectAction.bind(null, project?.id ?? null), {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="field-label">Project name *</span>
          <input name="name" required defaultValue={project?.name} className="field" aria-invalid={!!e.name} />
          {e.name && <span className="field-error block">{e.name}</span>}
        </label>
        <label>
          <span className="field-label">Location *</span>
          <input name="location" required defaultValue={project?.location} placeholder="Area 47, Lilongwe" className="field" aria-invalid={!!e.location} />
          {e.location && <span className="field-error block">{e.location}</span>}
        </label>
        <label>
          <span className="field-label">URL slug</span>
          <input name="slug" defaultValue={project?.slug} placeholder="Generated from the name" className="field" aria-invalid={!!e.slug} />
          {e.slug && <span className="field-error block">{e.slug}</span>}
        </label>
        <label>
          <span className="field-label">SQM completed</span>
          <input name="squareMetres" type="number" step="0.01" min="0" defaultValue={project?.squareMetres ?? ""} className="field" />
          {e.squareMetres && <span className="field-error block">{e.squareMetres}</span>}
        </label>
        <label>
          <span className="field-label">Paver type</span>
          <input name="paverType" defaultValue={project?.paverType ?? ""} placeholder="Herringbone — Charcoal" className="field" />
        </label>
        <label>
          <span className="field-label">Completion date</span>
          <input name="completionDate" type="date" defaultValue={project?.completionDate ?? ""} className="field" />
        </label>
        <label>
          <span className="field-label">Sort order</span>
          <input name="sortOrder" type="number" min="0" defaultValue={project?.sortOrder ?? 0} className="field" />
          <span className="field-hint block">Lower numbers appear first.</span>
        </label>
      </div>

      <fieldset>
        <legend className="field-label">Categories *</legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_CATEGORIES.map((c) => (
            <label key={c} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-ink-300 px-3 text-sm font-semibold has-[:checked]:border-clay-500 has-[:checked]:bg-clay-50">
              <input type="checkbox" name="categories" value={c} defaultChecked={project?.categories.includes(c)} className="accent-clay-500" />
              {PROJECT_CATEGORY_LABELS[c]}
            </label>
          ))}
        </div>
        {e.categories && <p className="field-error">{e.categories}</p>}
      </fieldset>

      <label className="block">
        <span className="field-label">Description</span>
        <textarea name="description" rows={5} defaultValue={project?.description} className="field" />
      </label>

      <div className="flex flex-wrap gap-6">
        <label className="inline-flex items-center gap-2 font-semibold">
          <input type="checkbox" name="featured" defaultChecked={project?.featured ?? false} className="size-5 accent-clay-500" /> Featured on homepage
        </label>
        <label className="inline-flex items-center gap-2 font-semibold">
          <input type="checkbox" name="published" defaultChecked={project?.published ?? true} className="size-5 accent-clay-500" /> Published
        </label>
      </div>

      {state.message && <p role="status" className={`text-sm font-semibold ${state.ok ? "text-moss-600" : "text-red-700"}`}>{state.message}</p>}
      <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : project ? "Save changes" : "Create project"}</button>
    </form>
  );
}

const KINDS = [
  { kind: "before", label: "Before photograph", hint: "The site before work started" },
  { kind: "after", label: "After photograph", hint: "The finished paving, same angle as before" },
  { kind: "gallery", label: "Additional photographs", hint: "Details, angles, progress (up to 10 at once)" },
] as const;

export function ProjectImages({ project }: { project: ProjectWithImages }) {
  return (
    <div className="space-y-6">
      {KINDS.map((k) => {
        const images: ProjectImage[] = k.kind === "gallery" ? project.gallery : [project[k.kind]].filter((i): i is ProjectImage => !!i);
        return (
          <div key={k.kind}>
            <h3 className="font-bold">{k.label}</h3>
            <p className="text-sm text-ink-500">{k.hint}</p>
            {images.length > 0 && (
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img) => (
                  <li key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink-200">
                    <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" />
                    <RemoveImage imageId={img.id} />
                  </li>
                ))}
              </ul>
            )}
            <UploadForm projectId={project.id} kind={k.kind} multiple={k.kind === "gallery"} replace={k.kind !== "gallery" && images.length > 0} />
          </div>
        );
      })}
    </div>
  );
}

function UploadForm({ projectId, kind, multiple, replace }: { projectId: string; kind: string; multiple: boolean; replace: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadProjectImageAction.bind(null, projectId), {});
  return (
    <form action={action} className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-ink-300 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <input type="hidden" name="kind" value={kind} />
      <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={multiple} required className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" />
      <input name="alt" placeholder="Short description (alt text)" maxLength={200} className="field min-h-10 py-1.5 text-sm sm:max-w-56" />
      <button disabled={pending} className="btn btn-sm btn-dark">{pending ? "Uploading…" : replace ? "Replace" : "Upload"}</button>
      {state.message && <p className={`text-xs font-semibold sm:basis-full ${state.ok ? "text-moss-600" : "text-red-700"}`}>{state.message}</p>}
    </form>
  );
}

function RemoveImage({ imageId }: { imageId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Remove this image?")) start(() => removeProjectImageAction(imageId));
      }}
      className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full bg-ink-900/80 text-white hover:bg-red-700"
      aria-label="Remove image"
    >
      <Icon name="x" className="size-4" />
    </button>
  );
}

export function DeleteProject({ projectId, name }: { projectId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${name}" and all its photos? This cannot be undone.`)) start(() => deleteProjectAction(projectId));
      }}
      className="btn btn-sm border border-red-300 bg-white text-red-700 hover:bg-red-50"
    >
      {pending ? "Deleting…" : "Delete project"}
    </button>
  );
}
