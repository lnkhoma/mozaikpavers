import type { ProjectCategory } from "@/lib/constants";
import type { ProjectWithImages } from "@/lib/services/projects";
import { PORTFOLIO_BATCHES } from "./portfolio";
import type { ProjectImage } from "./schema";

/**
 * The starter portfolio as ready-to-render projects, built from code with no
 * database. Public pages use it when the database cannot be reached, so the
 * site still shows Mozaik Pavers' work instead of an error page.
 */
const EPOCH = new Date(0);

export const STATIC_PROJECTS: ProjectWithImages[] = PORTFOLIO_BATCHES.flatMap((batch) =>
  batch.projects.map((p, index): ProjectWithImages => {
    const id = `static-${p.slug}`;
    const images: ProjectImage[] = p.images.map((img, position) => ({
      id: `${id}-${position}`,
      projectId: id,
      kind: img.kind,
      url: img.url,
      storageKey: null,
      alt: img.alt,
      width: img.width,
      height: img.height,
      position,
      createdAt: EPOCH,
    }));
    return {
      id,
      slug: p.slug,
      name: p.name,
      location: p.location,
      categories: p.categories,
      description: p.description,
      squareMetres: null,
      paverType: p.paverType,
      completionDate: null,
      featured: p.featured,
      published: true,
      isSample: false,
      sortOrder: batch.sortOffset + index,
      createdAt: EPOCH,
      updatedAt: EPOCH,
      before: images.find((i) => i.kind === "before") ?? null,
      after: images.find((i) => i.kind === "after") ?? null,
      gallery: images.filter((i) => i.kind === "gallery"),
    };
  }),
).sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder);

export const staticProjects = {
  published: (category?: ProjectCategory) => (category ? STATIC_PROJECTS.filter((p) => p.categories.includes(category)) : STATIC_PROJECTS),
  featured: (limit: number) => STATIC_PROJECTS.filter((p) => p.featured).slice(0, limit),
  transformations: (limit?: number) => {
    const pairs = STATIC_PROJECTS.filter((p) => p.before && p.after);
    return limit ? pairs.slice(0, limit) : pairs;
  },
  bySlug: (slug: string) => STATIC_PROJECTS.find((p) => p.slug === slug) ?? null,
};
