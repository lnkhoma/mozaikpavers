import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectImages, projects, type Project, type ProjectCategory, type ProjectImage, type ProjectImageKind } from "@/lib/db/schema";
import { slugify } from "@/lib/ids";
import { deleteImage } from "@/lib/storage";
import { audit } from "./audit";

export interface ProjectWithImages extends Project {
  before: ProjectImage | null;
  after: ProjectImage | null;
  gallery: ProjectImage[];
}

async function attachImages(rows: Project[]): Promise<ProjectWithImages[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const images = await db
    .select()
    .from(projectImages)
    .where(inArray(projectImages.projectId, rows.map((r) => r.id)))
    .orderBy(asc(projectImages.position), asc(projectImages.createdAt));
  return rows.map((p) => {
    const mine = images.filter((i) => i.projectId === p.id);
    return {
      ...p,
      before: mine.find((i) => i.kind === "before") ?? null,
      after: mine.find((i) => i.kind === "after") ?? null,
      gallery: mine.filter((i) => i.kind === "gallery"),
    };
  });
}

const publicOrder = [desc(projects.featured), asc(projects.sortOrder), desc(projects.completionDate)];

export async function listPublishedProjects(category?: ProjectCategory): Promise<ProjectWithImages[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.published, true), category ? sql`${category} = any(${projects.categories})` : undefined))
    .orderBy(...publicOrder);
  return attachImages(rows);
}

export async function listFeaturedProjects(limit = 6): Promise<ProjectWithImages[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.published, true), eq(projects.featured, true)))
    .orderBy(asc(projects.sortOrder), desc(projects.completionDate))
    .limit(limit);
  return attachImages(rows);
}

/** Projects that can show a before/after comparison. */
export async function listTransformations(limit?: number): Promise<ProjectWithImages[]> {
  const all = await listPublishedProjects();
  const withBoth = all.filter((p) => p.before && p.after);
  return limit ? withBoth.slice(0, limit) : withBoth;
}

export async function getPublishedProjectBySlug(slug: string): Promise<ProjectWithImages | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.published, true)))
    .limit(1);
  if (!row) return null;
  const [withImages] = await attachImages([row]);
  return withImages;
}

/* ----------------------------- Admin ----------------------------- */

export async function listAllProjects(): Promise<ProjectWithImages[]> {
  const db = await getDb();
  const rows = await db.select().from(projects).orderBy(desc(projects.featured), asc(projects.sortOrder), desc(projects.createdAt));
  return attachImages(rows);
}

export async function getProjectById(id: string): Promise<ProjectWithImages | null> {
  const db = await getDb();
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!row) return null;
  const [withImages] = await attachImages([row]);
  return withImages;
}

export interface ProjectInput {
  name: string;
  slug?: string;
  location: string;
  categories: ProjectCategory[];
  description: string;
  squareMetres: number | null;
  paverType?: string;
  completionDate?: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const db = await getDb();
  const root = slugify(base) || "project";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [hit] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, candidate)).limit(1);
    if (!hit || hit.id === excludeId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function toRow(input: ProjectInput) {
  return {
    name: input.name,
    location: input.location,
    categories: input.categories,
    description: input.description,
    squareMetres: input.squareMetres,
    paverType: input.paverType ?? null,
    completionDate: input.completionDate ?? null,
    featured: input.featured,
    published: input.published,
    sortOrder: input.sortOrder,
  };
}

export async function createProject(input: ProjectInput, ctx: { actorUserId: string; ipAddress?: string | null }) {
  const db = await getDb();
  const slug = await uniqueSlug(input.slug || input.name);
  const [row] = await db.insert(projects).values({ ...toRow(input), slug }).returning();
  await audit(db, { actorUserId: ctx.actorUserId, action: "project.created", entityType: "project", entityId: row.id, details: { name: row.name }, ipAddress: ctx.ipAddress });
  return row;
}

export async function updateProject(id: string, input: ProjectInput, ctx: { actorUserId: string; ipAddress?: string | null }) {
  const db = await getDb();
  const slug = await uniqueSlug(input.slug || input.name, id);
  // Editing a sample project means it is now real content.
  const [row] = await db
    .update(projects)
    .set({ ...toRow(input), slug, isSample: false, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  await audit(db, { actorUserId: ctx.actorUserId, action: "project.updated", entityType: "project", entityId: id, details: { name: input.name }, ipAddress: ctx.ipAddress });
  return row;
}

export async function setProjectFlags(id: string, flags: { featured?: boolean; published?: boolean }, ctx: { actorUserId: string; ipAddress?: string | null }) {
  const db = await getDb();
  await db.update(projects).set({ ...flags, updatedAt: new Date() }).where(eq(projects.id, id));
  await audit(db, { actorUserId: ctx.actorUserId, action: "project.flags_changed", entityType: "project", entityId: id, details: flags, ipAddress: ctx.ipAddress });
}

export async function deleteProject(id: string, ctx: { actorUserId: string; ipAddress?: string | null }) {
  const db = await getDb();
  const images = await db.select().from(projectImages).where(eq(projectImages.projectId, id));
  const [row] = await db.delete(projects).where(eq(projects.id, id)).returning({ name: projects.name });
  await Promise.all(images.map((i) => deleteImage(i.storageKey)));
  await audit(db, { actorUserId: ctx.actorUserId, action: "project.deleted", entityType: "project", entityId: id, details: { name: row?.name }, ipAddress: ctx.ipAddress });
}

/** Before/after are single slots: adding one replaces the previous image. */
export async function addProjectImage(
  projectId: string,
  image: { kind: ProjectImageKind; url: string; storageKey: string; alt: string; width?: number | null; height?: number | null },
  ctx: { actorUserId: string; ipAddress?: string | null },
) {
  const db = await getDb();
  const replaced: ProjectImage[] = [];
  await db.transaction(async (tx) => {
    let position = 0;
    if (image.kind === "gallery") {
      const [{ max }] = await tx
        .select({ max: sql<number>`coalesce(max(${projectImages.position}), 0)` })
        .from(projectImages)
        .where(and(eq(projectImages.projectId, projectId), eq(projectImages.kind, "gallery")));
      position = Number(max) + 1;
    } else {
      replaced.push(
        ...(await tx
          .delete(projectImages)
          .where(and(eq(projectImages.projectId, projectId), eq(projectImages.kind, image.kind)))
          .returning()),
      );
    }
    await tx.insert(projectImages).values({ projectId, ...image, position });
    await tx.update(projects).set({ isSample: false, updatedAt: new Date() }).where(eq(projects.id, projectId));
    await audit(tx, { actorUserId: ctx.actorUserId, action: "project.image_added", entityType: "project", entityId: projectId, details: { kind: image.kind }, ipAddress: ctx.ipAddress });
  });
  await Promise.all(replaced.map((r) => deleteImage(r.storageKey)));
}

export async function removeProjectImage(imageId: string, ctx: { actorUserId: string; ipAddress?: string | null }) {
  const db = await getDb();
  const [row] = await db.delete(projectImages).where(eq(projectImages.id, imageId)).returning();
  if (row) {
    await deleteImage(row.storageKey);
    await audit(db, { actorUserId: ctx.actorUserId, action: "project.image_removed", entityType: "project", entityId: row.projectId, details: { kind: row.kind }, ipAddress: ctx.ipAddress });
  }
  return row?.projectId ?? null;
}
